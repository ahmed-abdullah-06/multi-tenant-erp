const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (options) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: options.email,
        subject: options.subject,
        text: options.message,
        ...(options.html ? { html: options.html } : {})
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