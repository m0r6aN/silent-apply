import { prisma } from "@/lib/prisma";
import { allowAuthEmailSend } from "@/lib/auth/rateLimit";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import nodemailer from "nodemailer";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      maxAge: 15 * 60,
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const email = identifier;
        const allowed = await allowAuthEmailSend(email);
        if (!allowed) return;

        const server = provider.server ?? {
          host: process.env.EMAIL_SERVER_HOST,
          port: Number(process.env.EMAIL_SERVER_PORT),
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          },
        };

        const transport = nodemailer.createTransport(server);
        const baseUrl = new URL(url).origin;
        const termsUrl = `${baseUrl}/terms`;
        const privacyUrl = `${baseUrl}/privacy`;
        const subject = "Sign-in link for SilentApply";
        const preheader = "Use this link to continue. It expires in 15 minutes.";
        const text = `Hi,
Here's your link to continue to SilentApply:
${url}

This link expires in 15 minutes. If you didn't request it, you can ignore this email.

-- SilentApply

Terms: ${termsUrl}
Privacy: ${privacyUrl}
`;
        const html = `
          <div style="font-family: Arial, Helvetica, sans-serif; background: #0b0b0c; color: #f4f4f5; padding: 24px;">
            <span style="display:none; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">
              ${preheader}
            </span>
            <p style="margin: 0 0 16px 0; font-size: 16px;">Hi,</p>
            <p style="margin: 0 0 20px 0; font-size: 16px;">
              Here's your link to continue to SilentApply:
            </p>
            <p style="margin: 0 0 24px 0;">
              <a
                href="${url}"
                style="display: inline-block; padding: 10px 16px; border-radius: 999px; border: 1px solid #7dd3fc55; color: #f8fafc; text-decoration: none; background: #0f172a;"
              >
                Continue to SilentApply
              </a>
            </p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #d4d4d8;">
              This link expires in 15 minutes. If you didn't request it, you can ignore this email.
            </p>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #d4d4d8;">-- SilentApply</p>
            <p style="margin: 0; font-size: 12px; color: #71717a;">
              <a href="${termsUrl}" style="color: #a1a1aa; text-decoration: none;">Terms</a>
              &nbsp;&middot;&nbsp;
              <a href="${privacyUrl}" style="color: #a1a1aa; text-decoration: none;">Privacy</a>
            </p>
          </div>
        `;
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject,
          text,
          html,
        });
      },
    }),
  ],
  pages: {
    signIn: "/continue",
    verifyRequest: "/continue/check-email",
  },
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async session({ session, token }: { session: any, token: any }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
