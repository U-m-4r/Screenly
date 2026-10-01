import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type InterviewInviteEmailParams = {
  to: string;
  candidateName: string | null;
  companyName: string;
  inviteUrl: string;
  expiresAt: Date;
};

export async function sendInterviewInviteEmail({
  to,
  candidateName,
  companyName,
  inviteUrl,
  expiresAt,
}: InterviewInviteEmailParams) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `You're invited to a technical interview at ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111827;">
          You're invited to a technical interview
        </h2>

        <p>
          Hi ${candidateName || "there"},
        </p>

        <p>
          <strong>${companyName}</strong> has invited you to complete
          a technical interview through Screenly.
        </p>

        <div style="margin: 32px 0;">
          <a
            href="${inviteUrl}"
            style="
              display: inline-block;
              background: #2563eb;
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
            "
          >
            Start Interview
          </a>
        </div>

        <p style="color: #6b7280;">
          This invitation expires on
          ${expiresAt.toLocaleString()}.
        </p>

        <p style="color: #6b7280;">
          If you weren't expecting this invitation, you can safely ignore
          this email.
        </p>

        <p>
          Good luck!<br />
          — Screenly
        </p>
      </div>
    `,
  });
}