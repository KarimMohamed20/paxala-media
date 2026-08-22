import { emailStyles, escapeHtml, EmailLocale, EmailTemplate } from '../styles';

interface PasswordResetData {
    name: string;
    link: string;
}

const translations = {
    en: {
        subject: 'Reset your password',
        title: 'Password Reset',
        greeting: 'Hello',
        message: 'We received a request to reset your client portal password. Click the button below to choose a new one. The link is valid for 1 hour.',
        ignore: 'If you did not request this, you can safely ignore this email — your password will not change.',
        cta: 'Reset Password',
    },
    ar: {
        subject: 'إعادة تعيين كلمة المرور',
        title: 'إعادة تعيين كلمة المرور',
        greeting: 'مرحباً',
        message: 'استلمنا طلباً لإعادة تعيين كلمة مرور بوابة العميل الخاصة بك. اضغط على الزر أدناه لاختيار كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة.',
        ignore: 'إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان — لن تتغير كلمة المرور.',
        cta: 'إعادة تعيين كلمة المرور',
    },
    he: {
        subject: 'איפוס סיסמה',
        title: 'איפוס סיסמה',
        greeting: 'שלום',
        message: 'קיבלנו בקשה לאפס את סיסמת פורטל הלקוח שלך. לחץ על הכפתור למטה לבחירת סיסמה חדשה. הקישור תקף לשעה אחת.',
        ignore: 'אם לא ביקשת זאת, אפשר להתעלם מהודעה זו — הסיסמה לא תשתנה.',
        cta: 'איפוס סיסמה',
    },
};

export function getPasswordResetEmail(data: PasswordResetData, locale: EmailLocale = 'en'): EmailTemplate {
    const t = translations[locale] || translations.en;
    const isRtl = locale === 'ar' || locale === 'he';
    const containerStyle = isRtl ? `${emailStyles.container} ${emailStyles.rtl}` : emailStyles.container;

    const html = `
    <div style="${containerStyle}">
      <div style="${emailStyles.header}">
        <div style="${emailStyles.logo}">Paxala Media</div>
      </div>
      <div style="${emailStyles.content}">
        <h2 style="margin-top: 0;">${t.title}</h2>
        <p>${t.greeting} ${escapeHtml(data.name)},</p>
        <p>${t.message}</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.link}" style="${emailStyles.button}">${t.cta}</a>
        </div>

        <p style="color: #888; font-size: 13px;">${t.ignore}</p>
      </div>
      <div style="${emailStyles.footer}">
        <p>© ${new Date().getFullYear()} Paxala Media Production</p>
      </div>
    </div>
  `;

    return { subject: t.subject, html };
}
