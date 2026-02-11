# Auth Tightening Notes

## Rate Limit Rules
- **Limit**: 3 email sends per 15 minutes per email address
- **Key**: `auth:email:${email.toLowerCase()}`
- **Behavior**: Silent throttling - UI shows success but no email sent after limit
- **Storage**: Postgres `rate_limits` table (consider Redis for scale)
- **Reset**: Automatic after 15 minutes

## Copy Locations
- Signin page: `app/continue/page.tsx` (H1: "Continue", button: "Send link", expiry: "Expires in 15 minutes.")
- Check email page: `app/continue/check-email/page.tsx` (H1: "Check your email", body: "We sent a link to continue. It expires in 15 minutes.")
- Email template: Inline in `app/api/auth/[...nextauth]/route.ts` `sendVerificationRequest`

## How to Test
1. **Basic auth flow**: Enter email at /continue, receive email, click link, authenticate
2. **Rate limiting**: Request link 4 times in <15 min from same email - 4th should not send email but UI succeeds
3. **Expiry**: Wait 16+ minutes after requesting link, click - should fail
4. **Session persistence**: After auth, navigate app, session should persist
5. **Migration**: Run `npx prisma migrate dev --name add_nextauth_and_ratelimit` (ensure DATABASE_URL set)
