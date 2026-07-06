import nodemailer from 'nodemailer';
import { getBookingEmail } from './templates/booking';
import { getNewBookingNotificationEmail } from './templates/booking-admin';
import { getContactInquiryEmail } from './templates/contact';
import { getTaskStatusEmail } from './templates/task-status';
import { getMilestoneCompletedEmail } from './templates/milestone-completed';
import { getTaskAssignedEmail } from './templates/task-assigned';
import { getLeadCreatedEmail } from './templates/lead-created';
import { EmailLocale } from './styles';

// Configure transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM_EMAIL = process.env.SMTP_FROM || '"Paxala Media" <info@paxaland.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@paxaland.com';

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (!process.env.SMTP_USER) {
        console.log('Skipping email send (No SMTP_USER configured):', subject);
        console.log('Would have sent to:', to);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: FROM_EMAIL,
            to,
            subject,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Named exports to ensure they are available
export async function sendBookingConfirmation(to: string, data: any, locale: EmailLocale = 'en') {
    const { subject, html } = getBookingEmail(data, locale);
    return sendEmail({ to, subject, html });
}

export async function sendNewBookingNotification(data: any) {
    const { subject, html } = getNewBookingNotificationEmail(data);
    return sendEmail({ to: ADMIN_EMAIL, subject, html });
}

export async function sendTaskAssigned(to: string, data: any) {
    const { subject, html } = getTaskAssignedEmail(data);
    return sendEmail({ to, subject, html });
}

export async function sendContactInquiry(data: any) {
    const { subject, html } = getContactInquiryEmail(data);
    return sendEmail({ to: ADMIN_EMAIL, subject, html });
}

export async function sendTaskStatusUpdate(to: string, data: any, locale: EmailLocale = 'en') {
    const { subject, html } = getTaskStatusEmail(data, locale);
    return sendEmail({ to, subject, html });
}

export async function sendMilestoneCompleted(to: string, data: any, locale: EmailLocale = 'en') {
    const { subject, html } = getMilestoneCompletedEmail(data, locale);
    return sendEmail({ to, subject, html });
}

export async function sendLeadCreatedNotification(data: any) {
    const { subject, html } = getLeadCreatedEmail(data);
    return sendEmail({ to: ADMIN_EMAIL, subject, html });
}

// Default export object for backward compatibility (if needed) but preferring named imports
export const emailService = {
    sendBookingConfirmation,
    sendNewBookingNotification,
    sendTaskAssigned,
    sendContactInquiry,
    sendTaskStatusUpdate,
    sendMilestoneCompleted,
    sendLeadCreatedNotification
};
