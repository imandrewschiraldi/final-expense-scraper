import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail(params: { to: string; agentName: string; inviteUrl: string }) {
  const { to, agentName, inviteUrl } = params;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Agent Accelerator <onboarding@resend.dev>",
    to,
    subject: "You've been added to Agent Accelerator",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="color: #c97c4b;">Welcome, ${agentName}</h1>
        <p>You've been set up as an agent in Agent Accelerator. Click below to set your password and get started.</p>
        <p style="margin: 32px 0;">
          <a href="${inviteUrl}" style="background: #c87941; color: #0a0a0a; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">
            Set Your Password
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">This link expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send invite email: ${error.message}`);
  }
}
