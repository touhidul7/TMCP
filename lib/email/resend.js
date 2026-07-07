import { Resend } from "resend";

// Central outgoing-email config. The sender identity comes from the environment
// (RESEND_DOMAIN must be a domain verified in the Resend dashboard) so deployments
// never fall back to a hard-coded domain.
export function getEmailSender() {
  const resendKey = process.env.RESEND_API_KEY;
  const domain = process.env.RESEND_DOMAIN;
  if (!resendKey || !domain) return null;
  return {
    resend: new Resend(resendKey),
    from: `TMCP Gateway <tmcp@${domain}>`
  };
}
