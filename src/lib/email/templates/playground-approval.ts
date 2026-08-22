import { emailStyles, escapeHtml, EmailLocale, EmailTemplate } from '../styles';

interface PlaygroundApprovalData {
    name: string;
    roomTitle: string;
    approvalTitle: string;
    link: string;
}

const translations = {
    en: {
        subject: 'Your approval is requested',
        title: 'Approval Requested',
        greeting: 'Hello',
        message: 'The team submitted work for your sign-off. Review it and approve or request changes — it takes a minute, right from your phone.',
        room: 'Room',
        item: 'For approval',
        cta: 'Review & Respond',
    },
    ar: {
        subject: 'مطلوب موافقتك',
        title: 'طلب موافقة',
        greeting: 'مرحباً',
        message: 'أرسل الفريق عملاً بانتظار اعتمادك. راجعه ووافق أو اطلب تعديلات — لا يستغرق الأمر سوى دقيقة من هاتفك.',
        room: 'الغرفة',
        item: 'للموافقة',
        cta: 'مراجعة وردّ',
    },
    he: {
        subject: 'נדרש אישורך',
        title: 'בקשת אישור',
        greeting: 'שלום',
        message: 'הצוות שלח עבודה לאישורך. סקור אותה ואשר או בקש שינויים — זה לוקח דקה, ישירות מהטלפון.',
        room: 'חדר',
        item: 'לאישור',
        cta: 'סקור והגב',
    },
};

export function getPlaygroundApprovalEmail(data: PlaygroundApprovalData, locale: EmailLocale = 'en'): EmailTemplate {
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

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.item}:</span>
            <span style="${emailStyles.value} font-weight: bold;">${escapeHtml(data.approvalTitle)}</span>
          </div>
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.room}:</span>
            <span style="${emailStyles.value}">${escapeHtml(data.roomTitle)}</span>
          </div>
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

    return { subject: `${t.subject}: ${data.approvalTitle}`, html };
}
