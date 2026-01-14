import { emailStyles, EmailLocale, EmailTemplate } from '../styles';

interface MilestoneData {
    milestoneTitle: string;
    projectName: string;
    link: string;
}

const translations = {
    en: {
        subject: 'Milestone Completed',
        title: 'Milestone Achieved!',
        message: 'A milestone has been completed for your project.',
        project: 'Project',
        milestone: 'Milestone',
        cta: 'View Milestone',
    },
    ar: {
        subject: 'تم إنجاز مرحلة',
        title: 'تم تحقيق الهدف!',
        message: 'تم الانتهاء من مرحلة في مشروعك.',
        project: 'المشروع',
        milestone: 'المرحلة',
        cta: 'عرض المرحلة',
    },
    he: {
        subject: 'אבן דרך הושלמה',
        title: 'אבן דרך הושגה!',
        message: 'אבן דרך בפרויקט שלך הושלמה.',
        project: 'פרויקט',
        milestone: 'אבן דרך',
        cta: 'צפה באבן הדרך',
    },
};

export function getMilestoneCompletedEmail(data: MilestoneData, locale: EmailLocale = 'en'): EmailTemplate {
    const t = translations[locale] || translations.en;
    const isRtl = locale === 'ar' || locale === 'he';
    const containerStyle = isRtl ? `${emailStyles.container} ${emailStyles.rtl}` : emailStyles.container;

    const html = `
    <div style="${containerStyle}">
      <div style="${emailStyles.header}">
        <div style="${emailStyles.logo}">Paxala Media</div>
      </div>
      <div style="${emailStyles.content}">
        <h2 style="margin-top: 0; color: #10b981;">${t.title}</h2>
        <p>${t.message}</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.project}:</span>
            <span style="${emailStyles.value}">${data.projectName}</span>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.milestone}:</span>
            <span style="${emailStyles.value}" style="font-size: 18px; font-weight: bold;">${data.milestoneTitle}</span>
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

    return { subject: `${t.subject}: ${data.milestoneTitle}`, html };
}
