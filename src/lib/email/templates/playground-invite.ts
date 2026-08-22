import { emailStyles, escapeHtml, EmailLocale, EmailTemplate } from '../styles';

interface PlaygroundInviteData {
    name: string;
    inviterName: string;
    roomTitle: string;
    link: string;
}

const translations = {
    en: {
        subject: 'You were invited to a Playground room',
        title: 'Playground Invitation',
        greeting: 'Hello',
        message: 'invited you to collaborate in a Playground room:',
        cta: 'Open the Room',
    },
    ar: {
        subject: 'تمت دعوتك إلى غرفة إبداعية',
        title: 'دعوة إلى غرفة الإبداع',
        greeting: 'مرحباً',
        message: 'دعاك للمشاركة في غرفة إبداعية:',
        cta: 'فتح الغرفة',
    },
    he: {
        subject: 'הוזמנת לחדר יצירה',
        title: 'הזמנה לחדר יצירה',
        greeting: 'שלום',
        message: 'הזמין אותך לשתף פעולה בחדר יצירה:',
        cta: 'פתח את החדר',
    },
};

export function getPlaygroundInviteEmail(data: PlaygroundInviteData, locale: EmailLocale = 'en'): EmailTemplate {
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
        <p>${escapeHtml(data.inviterName)} ${t.message}</p>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <span style="font-size: 18px; font-weight: bold;">${escapeHtml(data.roomTitle)}</span>
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

    return { subject: `${t.subject}: ${data.roomTitle}`, html };
}
