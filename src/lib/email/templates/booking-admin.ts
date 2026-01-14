import { emailStyles, EmailTemplate } from '../styles';

interface NewBookingData {
    name: string;
    email: string;
    phone?: string | null;
    serviceType: string;
    date: Date;
    timeSlot: string;
    notes?: string | null;
}

export function getNewBookingNotificationEmail(data: NewBookingData): EmailTemplate {
    const dateStr = data.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
    <div style="${emailStyles.container}">
      <div style="${emailStyles.header}">
        <div style="${emailStyles.logo}">Paxala Media</div>
      </div>
      <div style="${emailStyles.content}">
        <h2 style="margin-top: 0;">New Booking Received</h2>
        <p>A new ${data.serviceType} booking has been received.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Booking Details:</h3>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Client:</span>
            <span style="${emailStyles.value}">${data.name}</span>
          </div>

          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Email:</span>
            <span style="${emailStyles.value}"><a href="mailto:${data.email}">${data.email}</a></span>
          </div>

          ${data.phone ? `
          <div style="${emailStyles.infoRow}">
             <span style="${emailStyles.label}">Phone:</span>
             <span style="${emailStyles.value}"><a href="tel:${data.phone}">${data.phone}</a></span>
          </div>
          ` : ''}
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Service:</span>
            <span style="${emailStyles.value}">${data.serviceType}</span>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Date:</span>
            <span style="${emailStyles.value}">${dateStr}</span>
          </div>
          
          <div style="${emailStyles.infoRow}">
            <span style="${emailStyles.label}">Time:</span>
            <span style="${emailStyles.value}">${data.timeSlot}</span>
          </div>

          ${data.notes ? `
          <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
             <span style="${emailStyles.label}">Notes:</span>
             <p style="margin: 5px 0 0 0;">${data.notes}</p>
          </div>
          ` : ''}
        </div>

        <div style="text-align: center;">
          <a href="https://paxaland.com/admin/bookings" style="${emailStyles.button}">Manage Bookings</a>
        </div>
      </div>
      <div style="${emailStyles.footer}">
        <p>This is an automated notification from Paxala Media Portal.</p>
      </div>
    </div>
  `;

    return {
        subject: `New Booking: ${data.name} - ${data.serviceType}`,
        html
    };
}
