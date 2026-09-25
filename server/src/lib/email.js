const nodemailer = require('nodemailer');
const logger = require('./logger');

const sendEmail = async (options) => {
    // Create a transporter using standard SMTP environment variables
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
        port: process.env.SMTP_PORT || 2525,
        auth: {
            user: process.env.SMTP_USER || 'your_smtp_user',
            pass: process.env.SMTP_PASS || 'your_smtp_pass'
        }
    });

    const mailOptions = {
        from: `ERP System <${process.env.EMAIL_FROM || 'noreply@erpsaas.com'}>`,
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