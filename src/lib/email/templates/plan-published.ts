import { emailStyles, escapeHtml, EmailLocale, EmailTemplate } from '../styles';

interface PlanPublishedData {
    name: string;
    planTitle: string;
    link: string;
}

const translations = {
    en: {
        subject: 'Your monthly plan is ready',
        title: 'Monthly Plan Published',
        greeting: 'Hello',
        message: 'Your monthly content plan is ready for review in your client portal:',
        cta: 'View the Plan',
    },
    ar: {
        subject: 'خطتك الشهرية جاهزة',
        title: 'تم نشر الخطة الشهرية',
        greeting: 'مرحباً',
        message: 'خطة المحتوى الشهرية جاهزة للمراجعة في بوابة العميل الخاصة بك:',
        cta: 'عرض الخطة',
    },
    he: {
        subject: 'התכנית החודשית שלך מוכנה',
        title: 'התכנית החודשית פורסמה',
        greeting: 'שלום',
        message: 'תכנית התוכן החודשית מוכנה לסקירה בפורטל הלקוח שלך:',
        cta: 'צפה בתכנית',
    },
};

export function getPlanPublishedEmail(data: PlanPublishedData, locale: EmailLocale = 'en'): EmailTemplate {
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

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <span style="font-size: 18px; font-weight: bold;">${escapeHtml(data.planTitle)}</span>
        </div>

        <div style="text-align: center;">
          <a href="${data.link}" style="${emailStyles.button}">${t.cta}</a>
        </div>
      </div>
      <div style="${emailStyles.footer}">
        <p>© ${new Date().getFullYear()} Paxala Media Production</p>
      </div>
    </div>
  `;

    return { subject: `${t.subject}: ${data.planTitle}`, html };
}
