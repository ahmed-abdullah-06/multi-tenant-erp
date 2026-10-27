const nodemailer = require('nodemailer');
const logger = require('../lib/logger');

let transporterInstance = null;

const getTransporter = () => {
    if (transporterInstance) return transporterInstance;

    if (process.env.SMTP_HOST) {
        transporterInstance = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporterInstance = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        // Fallback for development/testing environments without external SMTP
        transporterInstance = {
            sendMail: async (mailOptions) => {
                logger.info(`[EmailService DEV] Simulated send to ${mailOptions.to}: "${mailOptions.subject}"`);
                return { messageId: `mock-${Date.now()}`, ...mailOptions };
            }
        };
    }

    return transporterInstance;
};

// HTML Template Generators with polished corporate aesthetics
const getEmailBaseTemplate = (title, contentHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #e2e8f0; }
    .container { max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 36px 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .brand { font-size: 20px; font-weight: 700; color: #38bdf8; margin-bottom: 24px; letter-spacing: 0.5px; }
    h1 { font-size: 22px; font-weight: 600; color: #f8fafc; margin-top: 0; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 12px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 20px 0; }
    .btn:hover { background-color: #1d4ed8; }
    .card { background-color: #0f172a; border-radius: 8px; padding: 16px 20px; border: 1px solid #334155; margin: 16px 0; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">NEXUS ERP</div>
    ${contentHtml}
    <div class="footer">
      This is an automated notification from Nexus ERP. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`;

/**
 * Send generic email
 */
const sendEmail = async ({ to, subject, text, html }) => {
    const transporter = getTransporter();
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Nexus ERP" <notifications@nexuserp.local>',
        to,
        subject,
        text,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${to} [Subject: ${subject}]`);
        return info;
    } catch (error) {
        logger.error(`Failed to send email to ${to}: ${error.message}`);
        // If in test or dev mode, do not break calling flow if SMTP fails
        if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
            return { messageId: 'error-fallback', error: error.message };
        }
        throw new Error('Email service failed to deliver message.');
    }
};

/**
 * Send Organization Member Invitation Email
 */
const sendInvitationEmail = async ({ email, organizationName, inviterName, role, inviteUrl }) => {
    const title = `You're invited to join ${organizationName} on Nexus ERP`;
    const contentHtml = `
      <h1>Team Invitation</h1>
      <p>Hello,</p>
      <p><strong>${inviterName || 'A team administrator'}</strong> has invited you to join the <strong>${organizationName}</strong> organization as <strong>${role}</strong> on Nexus ERP.</p>
      <div class="card">
        <p style="margin: 0;"><strong>Role:</strong> ${role}</p>
        <p style="margin: 8px 0 0;"><strong>Organization:</strong> ${organizationName}</p>
      </div>
      <p>Click below to accept this invitation and access the team workspace:</p>
      <div style="text-align: center;">
        <a href="${inviteUrl}" class="btn">Accept Invitation</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">Or copy and paste this link into your browser:<br/><a href="${inviteUrl}" style="color: #38bdf8; word-break: break-all;">${inviteUrl}</a></p>
      <p style="font-size: 13px; color: #64748b;">This invitation expires in 7 days.</p>
    `;

    return sendEmail({
        to: email,
        subject: `Invitation to join ${organizationName} on Nexus ERP`,
        text: `You have been invited to join ${organizationName} as ${role}. Accept your invite here: ${inviteUrl}`,
        html: getEmailBaseTemplate(title, contentHtml)
    });
};

/**
 * Send Password Reset Email
 */
const sendPasswordResetEmail = async ({ email, name, resetUrl, expireMinutes = 15 }) => {
    const title = 'Reset Your Nexus ERP Password';
    const contentHtml = `
      <h1>Password Reset Request</h1>
      <p>Hi ${name || 'there'},</p>
      <p>We received a request to reset your password for your Nexus ERP account. Click the button below to choose a new password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #38bdf8; word-break: break-all;">${resetUrl}</a></p>
      <div class="card">
        <p style="margin: 0; font-size: 13px;">This reset link will expire in <strong>${expireMinutes} minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `;

    return sendEmail({
        to: email,
        subject: 'Nexus ERP Password Reset Request',
        text: `You requested a password reset. Click here to reset your password: ${resetUrl}. This link expires in ${expireMinutes} minutes.`,
        html: getEmailBaseTemplate(title, contentHtml)
    });
};

/**
 * Send Subscription & Billing Alert Email
 */
const sendBillingAlertEmail = async ({ email, organizationName, alertType, details, actionUrl }) => {
    let subject = `Billing Alert for ${organizationName}`;
    let alertHeadline = 'Subscription Billing Notification';
    let alertBadgeColor = '#2563eb';

    if (alertType === 'PAYMENT_FAILED') {
        subject = `Action Required: Payment Failed for ${organizationName}`;
        alertHeadline = 'Payment Failure Alert';
        alertBadgeColor = '#dc2626';
    } else if (alertType === 'SUBSCRIPTION_CANCELED') {
        subject = `Subscription Canceled: ${organizationName}`;
        alertHeadline = 'Subscription Cancellation';
        alertBadgeColor = '#f59e0b';
    } else if (alertType === 'PLAN_UPGRADED') {
        subject = `Subscription Confirmed: ${organizationName}`;
        alertHeadline = 'Plan Upgrade Successful';
        alertBadgeColor = '#10b981';
    }

    const contentHtml = `
      <div style="display: inline-block; padding: 4px 12px; background: ${alertBadgeColor}; color: white; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase;">
        ${alertType.replace('_', ' ')}
      </div>
      <h1>${alertHeadline}</h1>
      <p>Organization: <strong>${organizationName}</strong></p>
      <div class="card">
        <p style="margin: 0;">${details || 'Please check your billing dashboard for more details.'}</p>
      </div>
      ${actionUrl ? `
      <div style="text-align: center;">
        <a href="${actionUrl}" class="btn">Manage Billing & Payment</a>
      </div>
      ` : ''}
    `;

    return sendEmail({
        to: email,
        subject,
        text: `${alertHeadline} for ${organizationName}: ${details} ${actionUrl ? `Manage at: ${actionUrl}` : ''}`,
        html: getEmailBaseTemplate(subject, contentHtml)
    });
};

module.exports = {
    sendEmail,
    sendInvitationEmail,
    sendPasswordResetEmail,
    sendBillingAlertEmail
};
