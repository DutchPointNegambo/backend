import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // TLS (upgrades to STARTTLS)
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Dutch Point Resort" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    await transporter.sendMail(mailOptions);
};

export default sendEmail;
