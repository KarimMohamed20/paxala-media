import { emailStyles, escapeHtml, EmailLocale, EmailTemplate } from '../styles';

interface ContentAwaitingData {
    name: string;
    /** 1 for a single submission; the batch size for bulk submissions. */
    count: number;
    /** Set for single submissions so the email names the piece. */
    itemTitle?: string;
    link: string;
}

const translations = {
    en: {
        subject: 'Content awaiting your approval',
        title: 'Content for Your Review',
        greeting: 'Hello',
        messageOne: 'A new content item is awaiting your approval:',
        messageMany: 'content items are awaiting your approval in your portal.',
        cta: 'Review & Approve',
    },
    ar: {
        subject: 'محتوى بانتظار موافقتك',
        title: 'محتوى للمراجعة',
        greeting: 'مرحباً',
        messageOne: 'هناك عنصر محتوى جديد بانتظار موافقتك:',
        messageMany: 'عناصر محتوى بانتظار موافقتك في بوابتك.',
        cta: 'مراجعة وموافقة',
    },
    he: {
        subject: 'תוכן ממתין לאישורך',
        title: 'תוכן לסקירה',
        greeting: 'שלום',
        messageOne: 'פריט תוכן חדש ממתין לאישורך:',
        messageMany: 'פריטי תוכן ממתינים לאישורך בפורטל.',
        cta: 'סקור ואשר',
    },
};

export function getContentAwaitingEmail(data: ContentAwaitingData, locale: EmailLocale = 'en'): EmailTemplate {
    const t = translations[locale] || translations.en;
    const isRtl = locale === 'ar' || locale === 'he';
    const containerStyle = isRtl ? `${emailStyles.container} ${emailStyles.rtl}` : emailStyles.container;

    const body =
        data.count === 1 && data.itemTitle
            ? `<p>${t.messageOne}</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <span style="font-size: 18px; font-weight: bold;">${escapeHtml(data.itemTitle)}</span>
        </div>`
            : `<p><strong>${data.count}</strong> ${t.messageMany}</p>`;

    const html = `
    <div style="${containerStyle}">
      <div style="${emailStyles.header}">
        <div style="${emailStyles.logo}">Paxala Media</div>
      </div>
      <div style="${emailStyles.content}">
        <h2 style="margin-top: 0;">${t.title}</h2>
        <p>${t.greeting} ${escapeHtml(data.name)},</p>
        ${body}

        <div style="text-align: center;">
          <a href="${data.link}" style="${emailStyles.button}">${t.cta}</a>
        </div>
      </div>
      <div style="${emailStyles.footer}">
        <p>© ${new Date().getFullYear()} Paxala Media Production</p>
      </div>
    </div>
  `;

    return { subject: t.subject, html };
}
