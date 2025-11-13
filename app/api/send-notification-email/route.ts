import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, notification } = await request.json();

    // In a real application, you would use a service like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Resend
    
    // For now, we'll log it (replace with actual email service)
    console.log('Sending email notification to:', email);
    console.log('Notification:', notification);

    // Example with console (replace with actual email service):
    const emailContent = `
      Subject: ${notification.title}
      
      Dear PAWAR AGENCY,
      
      ${notification.message}
      
      Severity: ${notification.severity}
      ${notification.actionUrl ? `\nAction Required: Visit ${notification.actionUrl}` : ''}
      
      This is an automated notification from your dashboard.
      
      Best regards,
      PAWAR AGENCY Dashboard System
    `;

    console.log('Email Content:', emailContent);

    // TODO: Replace with actual email service
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: email,
      from: 'notifications@pawaragency.com',
      subject: notification.title,
      text: notification.message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${notification.severity === 'critical' ? '#dc2626' : notification.severity === 'warning' ? '#f59e0b' : '#3b82f6'};">
            ${notification.title}
          </h2>
          <p>${notification.message}</p>
          ${notification.actionUrl ? `<a href="${notification.actionUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">View Details</a>` : ''}
        </div>
      `,
    };
    
    await sgMail.send(msg);
    */

    return NextResponse.json({ success: true, message: 'Notification email logged (not sent - configure email service)' });
  } catch (error: any) {
    console.error('Error sending notification email:', error);
    return NextResponse.json(
      { error: 'Failed to send notification email', details: error.message },
      { status: 500 }
    );
  }
}
