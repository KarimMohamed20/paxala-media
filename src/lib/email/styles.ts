export const emailStyles = {
    container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;',
    header: 'background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;',
    logo: 'font-size: 24px; font-weight: bold;',
    content: 'background-color: #ffffff; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;',
    footer: 'margin-top: 20px; text-align: center; font-size: 12px; color: #888;',
    button: 'display: inline-block; padding: 10px 20px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px;',
    infoRow: 'margin-bottom: 10px;',
    label: 'font-weight: bold; color: #666;',
    value: 'margin-left: 5px;',
    rtl: 'direction: rtl; text-align: right;',
};

export type EmailLocale = 'en' | 'ar' | 'he';

/**
 * Escape user-controlled strings (titles, names) before interpolating them
 * into template HTML — outbound email must not be an HTML-injection surface.
 */
export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export interface EmailTemplate {
    subject: string;
    html: string;
}
