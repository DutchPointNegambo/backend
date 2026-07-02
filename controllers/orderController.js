import Order from '../models/Order.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';

// --- PayHere Hash Helper ---
const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const amountFormatted = Number(amount).toFixed(2);
    const mainString = merchantId + orderId + amountFormatted + currency + hashedSecret;
    return crypto.createHash('md5').update(mainString).digest('hex').toUpperCase();
};

// --- Helpers ---
const detectCardBrand = (num) => {
    const n = num.replace(/\s/g, '');
    if (/^4/.test(n)) return 'Visa';
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    if (/^6(?:011|5)/.test(n)) return 'Discover';
    return 'Unknown';
};

export const createOrder = async (req, res) => {
    try {
        const { guestInfo, items, subtotal, serviceCharge, total, cardDetails, paymentMethod = 'card' } = req.body;

        if (paymentMethod === 'card') {
            // --- Card Validation (Same as Booking) ---
            if (!cardDetails || !cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
                return res.status(400).json({ success: false, message: 'All card details are required.' });
            }

            const cardNum = cardDetails.number.replace(/\s/g, '');
            if (!/^\d{13,19}$/.test(cardNum)) {
                return res.status(400).json({ success: false, message: 'Invalid card number format.' });
            }

            // Luhn check
            let sum = 0, alt = false;
            for (let i = cardNum.length - 1; i >= 0; i--) {
                let n = parseInt(cardNum[i], 10);
                if (alt) { n *= 2; if (n > 9) n -= 9; }
                sum += n;
                alt = !alt;
            }
            if (sum % 10 !== 0) {
                return res.status(400).json({ success: false, message: 'Card number validation failed.' });
            }

            const newOrder = new Order({
                guestInfo,
                items,
                subtotal,
                serviceCharge,
                total,
                status: 'paid', // Set to paid immediately
                paymentStatus: 'paid',
                paymentDetails: {
                    cardLast4: cardNum.slice(-4),
                    cardBrand: detectCardBrand(cardNum),
                    transactionId: `TXN-FOOD-${Date.now()}`
                }
            });

            const savedOrder = await newOrder.save();

            res.status(201).json({
                success: true,
                message: 'Order created and paid successfully',
                orderId: savedOrder._id
            });
        } else if (paymentMethod === 'payhere') {
            const newOrder = new Order({
                guestInfo,
                items,
                subtotal,
                serviceCharge,
                total,
                status: 'pending',
                paymentStatus: 'pending',
                paymentDetails: {
                    note: 'Pending PayHere payment'
                }
            });

            const savedOrder = await newOrder.save();

            const merchantId = (process.env.PAYHERE_MERCHANT_ID || '1226209').trim();
            const merchantSecret = (process.env.PAYHERE_MERCHANT_SECRET || '3262097392333620346221091696102295398843').trim();

            const payhereParams = {
                sandbox: process.env.PAYHERE_SANDBOX !== 'false',
                merchant_id: merchantId,
                return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-cancel`,
                notify_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/orders/notify`,
                order_id: savedOrder._id.toString(),
                items: `Food Order - #${savedOrder._id.toString().slice(-6).toUpperCase()}`,
                amount: total.toFixed(2),
                currency: 'LKR',
                hash: generatePayHereHash(merchantId, savedOrder._id.toString(), total, 'LKR', merchantSecret),
                first_name: guestInfo.name.split(' ')[0] || 'Guest',
                last_name: guestInfo.name.split(' ')[1] || 'User',
                email: guestInfo.email,
                phone: guestInfo.phone || '0771234567',
                address: 'Negombo',
                city: 'Negombo',
                country: 'Sri Lanka'
            };

            res.status(201).json({
                success: true,
                message: 'Order created pending payment',
                orderId: savedOrder._id,
                payhere: payhereParams
            });
        }
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

export const getOrders = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { 'guestInfo.name': { $regex: search, $options: 'i' } },
                { 'guestInfo.email': { $regex: search, $options: 'i' } },
                { '_id': search.match(/^[0-9a-fA-F]{24}$/) ? search : undefined }
            ].filter(Boolean);
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderReport = async (req, res) => {
    try {
        const { from, to } = req.query;
        let dateQuery = {};

        if (from || to) {
            dateQuery.createdAt = {};
            if (from) dateQuery.createdAt.$gte = new Date(`${from}T00:00:00.000+05:30`);
            if (to) {
                dateQuery.createdAt.$lte = new Date(`${to}T23:59:59.999+05:30`);
            }
        }

        const orders = await Order.find(dateQuery);

        const summary = {
            totalOrders: orders.length,
            totalRevenue: orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.total, 0),
            statusCounts: {
                pending: orders.filter(o => o.status === 'pending').length,
                preparing: orders.filter(o => o.status === 'preparing').length,
                delivered: orders.filter(o => o.status === 'delivered').length,
                cancelled: orders.filter(o => o.status === 'cancelled').length
            },
            popularItems: {}
        };

        // Calculate popular items
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!summary.popularItems[item.name]) {
                    summary.popularItems[item.name] = 0;
                }
                summary.popularItems[item.name] += item.quantity;
            });
        });

        res.status(200).json({
            success: true,
            summary,
            orders // Send full orders for CSV export if needed
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate report',
            error: error.message
        });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            { status, paymentStatus },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const confirmPayment = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update status
        order.status = 'paid';
        order.paymentStatus = 'paid';
        await order.save();

        // Send confirmation email
        try {
            const emailOptions = {
                email: order.guestInfo.email,
                subject: `Order Confirmation - Dutch Point Resort #${order._id.toString().slice(-6).toUpperCase()}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                        <h2 style="color: #0f2942; text-align: center;">Payment Successful!</h2>
                        <p>Dear ${order.guestInfo.name},</p>
                        <p>Thank you for your order at Dutch Point Resort. We have received your payment and our team is now preparing your food.</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; font-size: 14px; color: #64748b; text-transform: uppercase;">Order Summary</h3>
                            ${order.items.map(item => `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>${item.name} x ${item.quantity}</span>
                                    <span>Rs. ${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            `).join('')}
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 10px 0;">
                            <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                <span>Total Paid</span>
                                <span style="color: #14b8a6;">Rs. ${order.total.toFixed(2)}</span>
                            </div>
                        </div>

                        <p style="font-size: 14px; color: #64748b;">Order ID: ${order._id}</p>
                        <p>We hope you enjoy your meal!</p>
                        <br>
                        <p>Best Regards,<br><strong>Dutch Point Resort Team</strong></p>
                    </div>
                `
            };

            await sendEmail(emailOptions);
        } catch (emailError) {
            console.error('Payment confirmation email failed to send:', emailError);
            // We don't throw here so the user still sees a success message on the frontend
        }

        res.status(200).json({
            success: true,
            message: 'Payment confirmed successfully'
        });
    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm payment or send email',
            error: error.message
        });
    }
};
