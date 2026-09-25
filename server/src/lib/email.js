const nodemailer = require('nodemailer');
const logger = require('./logger'); // Assuming you are using your Winston logger

const sendEmail = async (options) => {
    // The simplified transporter using only the service name and app password
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Email sent successfully to ${options.email}`);
    } catch (error) {
        logger.error(`Error sending email to ${options.email}`, { error: error.message });
        throw new Error('Email could not be sent.');
    }
};

module.exports = sendEmail;