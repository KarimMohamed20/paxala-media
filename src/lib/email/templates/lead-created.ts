import { emailStyles, EmailTemplate } from '../styles';

interface LeadCreatedData {
    clientName: string;
    email: string;
    phone?: string | null;
    source: string;
    interestedIn?: string | null;
}

export function getLeadCreatedEmail(data: LeadCreatedData): EmailTemplate {
    const html = `
    <div style="${emailStyles.container}">
      <div style="${emailStyles.header}">
        <div style="${emailStyles.logo}">Paxala Media</div>
      </div>
      <div style="${emailStyles.content}">
        <h2 style="margin-top: 0;">New Lead Added to Pipeline</h2>
        <p>A new lead was automatically created from the website.</p>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Lead Details:</h3>

          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Name:</span>
            <span style="${emailStyles.value}">${data.clientName}</span>
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
            <span style="${emailStyles.label}">Source:</span>
            <span style="${emailStyles.value}">${data.source}</span>
          </div>

          ${data.interestedIn ? `
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Interested in:</span>
            <span style="${emailStyles.value}">${data.interestedIn}</span>
          </div>
          ` : ''}
        </div>

        <p style="margin-top: 20px;">Open the admin panel to review and follow up: <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/leads">Lead Pipeline</a></p>
      </div>
      <div style="${emailStyles.footer}">
        <p>This is an automated notification from Paxala Media Portal.</p>
      </div>
    </div>
  `;

    return {
        subject: `New Lead: ${data.clientName}`,
        html
    };
}
