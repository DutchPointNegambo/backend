import Order from '../models/Order.js';
import sendEmail from '../utils/sendEmail.js';

export const createOrder = async (req, res) => {
    try {
        const { guestInfo, items, subtotal, serviceCharge, total } = req.body;

        const newOrder = new Order({
            guestInfo,
            items,
            subtotal,
            serviceCharge,
            total,
            status: 'pending',
            paymentStatus: 'pending'
        });

        const savedOrder = await newOrder.save();

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId: savedOrder._id
        });
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
            if (from) dateQuery.createdAt.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                dateQuery.createdAt.$lte = toDate;
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

        res.status(200).json({
            success: true,
            message: 'Payment confirmed and email sent'
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
