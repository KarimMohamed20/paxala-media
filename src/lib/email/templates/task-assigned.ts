import { emailStyles, EmailTemplate } from '../styles';

interface TaskAssignedData {
    assigneeName: string;
    taskTitle: string;
    projectName: string;
    milestoneTitle: string;
    dueDate?: Date | null;
    link: string;
}

export function getTaskAssignedEmail(data: TaskAssignedData): EmailTemplate {
    const dueDateStr = data.dueDate
        ? data.dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'No due date';

    const html = `
    <div style="${emailStyles.container}">
      <div style="${emailStyles.header}">
        <div style="${emailStyles.logo}">Paxala Media</div>
      </div>
      <div style="${emailStyles.content}">
        <h2 style="margin-top: 0;">New Task Assignment</h2>
        <p>Hello ${data.assigneeName},</p>
        <p>You have been assigned to a new task.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Task Details:</h3>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Task:</span>
            <span style="${emailStyles.value}" style="font-weight: bold;">${data.taskTitle}</span>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Project:</span>
            <span style="${emailStyles.value}">${data.projectName}</span>
          </div>

          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Milestone:</span>
            <span style="${emailStyles.value}">${data.milestoneTitle}</span>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Due Date:</span>
            <span style="${emailStyles.value}">${dueDateStr}</span>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${data.link}" style="${emailStyles.button}">View Task</a>
        </div>
      </div>
      <div style="${emailStyles.footer}">
        <p>This is an automated notification from Paxala Media Portal.</p>
      </div>
    </div>
  `;

    return {
        subject: `Task Assigned: ${data.taskTitle}`,
        html
    };
}
