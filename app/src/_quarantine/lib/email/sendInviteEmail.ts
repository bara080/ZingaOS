import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

type InviteEmailParams = {
  to: string;
  name: string;
  inviteUrl: string;
  code?: string;
};

export async function sendInviteEmail({ to, name, inviteUrl, code }: InviteEmailParams) {
  await sgMail.send({
    to,
    from: {
      email: 'no-reply@zingaapp.com',
      name: 'Zinga Admin',
    },
    templateId: process.env.SENDGRID_INVITE_TEMPLATE_ID!,
    dynamicTemplateData: {
      name,
      twilio_code: code ?? '',
      verify_url: inviteUrl,
    },
  });
}
