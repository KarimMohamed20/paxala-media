import { emailStyles, EmailTemplate } from '../styles';

interface ContactData {
    name: string;
    email: string;
    phone?: string | null;
    subject: string;
    message: string;
}

export function getContactInquiryEmail(data: ContactData): EmailTemplate {
    const html = `
    <div style="${emailStyles.container}">
      <div style="${emailStyles.header}">
        <div style="${emailStyles.logo}">Paxala Media</div>
      </div>
      <div style="${emailStyles.content}">
        <h2 style="margin-top: 0;">New Contact Inquiry</h2>
        <p>A new message has been received from the website contact form.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Inquiry Details:</h3>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Name:</span>
            <span style="${emailStyles.value}">${data.name}</span>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Email:</span>
            <span style="${emailStyles.value}"><a href="mailto:${data.email}">${data.email}</a></span>
          </div>
          
          ${data.phone ? `
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Phone:</span>
            <span style="${emailStyles.value}">${data.phone}</span>
          </div>
          ` : ''}

          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Subject:</span>
            <span style="${emailStyles.value}">${data.subject}</span>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <span style="${emailStyles.label}">Message:</span>
          <div style="background-color: #ffffff; border: 1px solid #eee; padding: 15px; border-radius: 5px; margin-top: 5px; white-space: pre-wrap;">${data.message}</div>
        </div>
      </div>
      <div style="${emailStyles.footer}">
        <p>This is an automated notification from Paxala Media Portal.</p>
      </div>
    </div>
  `;

    return {
        subject: `New Inquiry: ${data.subject}`,
        html
    };
}
