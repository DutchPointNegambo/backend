import Contact from '../models/Contact.js';

export const createContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        const newContact = await Contact.create({
            name,
            email,
            phone,
            subject,
            message
        });

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully!',
            data: newContact
        });
    } catch (error) {
        console.error('Contact submission error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error, please try again later' 
        });
    }
};
