const emailService = require('../../server/src/services/email.service');

describe('Email Service', () => {
    describe('sendInvitationEmail', () => {
        it('should send team invitation email with correct parameters and links', async () => {
            const result = await emailService.sendInvitationEmail({
                email: 'colleague@enterprise.com',
                organizationName: 'Acme Global',
                inviterName: 'Jane Doe',
                role: 'Accountant',
                inviteUrl: 'http://localhost:3000/login.html?inviteToken=tok_123'
            });

            expect(result).toHaveProperty('messageId');
            expect(result.to).toBe('colleague@enterprise.com');
            expect(result.subject).toContain('Acme Global');
            expect(result.html).toContain('Jane Doe');
            expect(result.html).toContain('Accountant');
            expect(result.html).toContain('tok_123');
        });
    });

    describe('sendPasswordResetEmail', () => {
        it('should send password reset email with reset link and expiry', async () => {
            const result = await emailService.sendPasswordResetEmail({
                email: 'user@enterprise.com',
                name: 'John Smith',
                resetUrl: 'http://localhost:3000/reset-password.html?token=reset_456',
                expireMinutes: 15
            });

            expect(result).toHaveProperty('messageId');
            expect(result.to).toBe('user@enterprise.com');
            expect(result.subject).toContain('Password Reset');
            expect(result.html).toContain('John Smith');
            expect(result.html).toContain('reset_456');
            expect(result.html).toContain('15 minutes');
        });
    });

    describe('sendBillingAlertEmail', () => {
        it('should send payment failure alert email with appropriate styling', async () => {
            const result = await emailService.sendBillingAlertEmail({
                email: 'owner@enterprise.com',
                organizationName: 'Stark Industries',
                alertType: 'PAYMENT_FAILED',
                details: 'Invoice payment for Pro plan has failed.',
                actionUrl: 'http://localhost:3000/settings.html'
            });

            expect(result.to).toBe('owner@enterprise.com');
            expect(result.subject).toContain('Payment Failed');
            expect(result.html).toContain('PAYMENT FAILED');
            expect(result.html).toContain('settings.html');
        });

        it('should send plan upgrade confirmation email', async () => {
            const result = await emailService.sendBillingAlertEmail({
                email: 'owner@enterprise.com',
                organizationName: 'Stark Industries',
                alertType: 'PLAN_UPGRADED',
                details: 'Upgraded to Enterprise tier.',
                actionUrl: 'http://localhost:3000/settings.html'
            });

            expect(result.subject).toContain('Subscription Confirmed');
            expect(result.html).toContain('PLAN UPGRADED');
        });
    });
});
