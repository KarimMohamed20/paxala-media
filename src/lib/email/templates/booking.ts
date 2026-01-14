import { emailStyles, EmailLocale, EmailTemplate } from '../styles';

interface BookingData {
    name: string;
    serviceType: string;
    date: Date;
    timeSlot: string;
}

const translations = {
    en: {
        subject: 'Booking Confirmation - Paxala Media',
        title: 'Booking Confirmed',
        greeting: 'Hello',
        message: 'Thank you for booking with us. Your consultation has been confirmed.',
        details: 'Booking Details:',
        service: 'Service',
        date: 'Date',
        time: 'Time',
        cta: 'View Dashboard',
        footer: 'If you have any questions, please reply to this email.',
    },
    ar: {
        subject: 'تأكيد الحجز - باكسالا ميديا',
        title: 'تم تأكيد الحجز',
        greeting: 'مرحبا',
        message: 'شكرا لحجزك معنا. تم تأكيد موعد استشارتك.',
        details: 'تفاصيل الحجز:',
        service: 'الخدمة',
        date: 'التاريخ',
        time: 'الوقت',
        cta: 'عرض لوحة التحكم',
        footer: 'إذا كان لديك أي أسئلة، يرجى الرد على هذا البريد الإلكتروني.',
    },
    he: {
        subject: 'אישור הזמנה - פקסלה מדיה',
        title: 'ההזמנה אושרה',
        greeting: 'שלום',
        message: 'תודה שהזמנת איתנו. הייעוץ שלך אושר.',
        details: 'פרטי ההזמנה:',
        service: 'שירות',
        date: 'תאריך',
        time: 'שעה',
        cta: 'צפה בלוח הבבקרה',
        footer: 'אם יש לך שאלות, אנא השב למייל זה.',
    },
};

export function getBookingEmail(data: BookingData, locale: EmailLocale = 'en'): EmailTemplate {
    const t = translations[locale] || translations.en;
    const isRtl = locale === 'ar' || locale === 'he';
    const containerStyle = isRtl ? `${emailStyles.container} ${emailStyles.rtl}` : emailStyles.container;

    const dateStr = new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(data.date));

    const html = `
    <div style="${containerStyle}">
      <div style="${emailStyles.header}">
        <div style="${emailStyles.logo}">Paxala Media</div>
      </div>
      <div style="${emailStyles.content}">
        <h2 style="margin-top: 0;">${t.title}</h2>
        <p>${t.greeting} ${data.name},</p>
        <p>${t.message}</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">${t.details}</h3>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.service}:</span>
            <span style="${emailStyles.value}">${data.serviceType}</span>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.date}:</span>
            <span style="${emailStyles.value}">${dateStr}</span>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.time}:</span>
            <span style="${emailStyles.value}">${data.timeSlot}</span>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="https://paxaland.com/portal" style="${emailStyles.button}">${t.cta}</a>
        </div>
      </div>
      <div style="${emailStyles.footer}">
        <p>${t.footer}</p>
        <p>© ${new Date().getFullYear()} Paxala Media Production</p>
      </div>
    </div>
  `;

    return { subject: t.subject, html };
}
