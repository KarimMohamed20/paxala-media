import { emailStyles, EmailLocale, EmailTemplate } from '../styles';

interface TaskStatusData {
    taskTitle: string;
    projectName: string;
    oldStatus: string;
    newStatus: string;
    updatedBy: string;
    link: string;
}

const translations = {
    en: {
        subject: 'Task Status Updated',
        message: 'A task you are following has been updated.',
        task: 'Task',
        project: 'Project',
        status: 'Status',
        updatedBy: 'Updated By',
        from: 'From',
        to: 'To',
        cta: 'View Task',
    },
    ar: {
        subject: 'تحديث حالة المهمة',
        message: 'تم تحديث مهمة تتابعها.',
        task: 'المهمة',
        project: 'المشروع',
        status: 'الحالة',
        updatedBy: 'تم التحديث بواسطة',
        from: 'من',
        to: 'إلى',
        cta: 'عرض المهمة',
    },
    he: {
        subject: 'סטטוס משימה עודכן',
        message: 'משימה שאתה עוקב אחריה עודכנה.',
        task: 'משימה',
        project: 'פרויקט',
        status: 'סטטוס',
        updatedBy: 'עודכן ע"י',
        from: 'מ',
        to: 'ל',
        cta: 'צפה במשימה',
    },
};

export function getTaskStatusEmail(data: TaskStatusData, locale: EmailLocale = 'en'): EmailTemplate {
    const t = translations[locale] || translations.en;
    const isRtl = locale === 'ar' || locale === 'he';
    const containerStyle = isRtl ? `${emailStyles.container} ${emailStyles.rtl}` : emailStyles.container;

    const html = `
    <div style="${containerStyle}">
      <div style="${emailStyles.header}">
        <div style="${emailStyles.logo}">Paxala Media</div>
      </div>
      <div style="${emailStyles.content}">
        <h2 style="margin-top: 0;">${t.subject}</h2>
        <p>${t.message}</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.project}:</span>
            <span style="${emailStyles.value}">${data.projectName}</span>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.task}:</span>
            <span style="${emailStyles.value}">${data.taskTitle}</span>
          </div>

          <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
             <div style="${emailStyles.infoRow}">
                <span style="${emailStyles.label}">${t.from}:</span>
                <span style="${emailStyles.value}" style="color: #666;">${data.oldStatus}</span>
             </div>
             <div style="${emailStyles.infoRow}">
                <span style="${emailStyles.label}">${t.to}:</span>
                <span style="${emailStyles.value}" style="font-weight: bold; color: #ef4444;">${data.newStatus}</span>
             </div>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">${t.updatedBy}:</span>
            <span style="${emailStyles.value}">${data.updatedBy}</span>
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

    return { subject: `${t.subject}: ${data.taskTitle}`, html };
}
