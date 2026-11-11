// The page the unsubscribe link in the thank-you email opens.
//
// Opening the link shows a page with an Unsubscribe button. Clicking it
// confirms, and emails you (OWNER_EMAIL) so you know to take them off your list.
// Email apps with a built-in "Unsubscribe" button use this too.

import { tokenMatches } from './_unsubscribe.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(res, status, title, message, form = '') {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  return res.status(status).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700&display=swap" rel="stylesheet">
<style>
  :root { --bg: #EEF1F7; --ink: #121A33; --muted: #55607D; --head: #2440E0; --cta: #FFC233; --cta-hover: #FFB300; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0C1124; --ink: #EAEEFB; --muted: #9BA7C8; --head: #9FB0FF; } }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: "Bricolage Grotesque", system-ui, sans-serif; font-size: 1.0625rem; line-height: 1.5; }
  main { max-width: 34rem; margin: 0 auto; padding: clamp(3rem, 10vw, 6rem) 1.25rem; }
  h1 { margin: 0; color: var(--head); font-size: clamp(2rem, 6vw, 2.75rem); line-height: 1.05; letter-spacing: -.03em; }
  p { margin: 1rem 0 0; color: var(--muted); }
  button { margin-top: 1.75rem; height: 3.25rem; padding: 0 1.75rem; font: inherit; font-weight: 700; color: #121A33; background: var(--cta); border: 0; border-radius: .75rem; cursor: pointer; }
  button:hover { background: var(--cta-hover); }
  button:focus-visible { outline: 3px solid var(--head); outline-offset: 3px; }
</style>
</head>
<body><main><h1>${escapeHtml(title)}</h1><p>${message}</p>${form}</main></body>
</html>`);
}

async function notifyOwner(email) {
  const apiKey = process.env.RESEND_API_KEY;
  const owner = process.env.OWNER_EMAIL;
  if (!apiKey || !owner) return false;
  const from = process.env.FROM_EMAIL || 'Armin <onboarding@resend.dev>';
  const reply = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [owner],
      subject: `Unsubscribed: ${email}`,
      text: `${email} unsubscribed. Take them off your list and don't email them again.`,
      html: `<p><strong>${escapeHtml(email)}</strong> unsubscribed.</p><p>Take them off your list and don't email them again.</p>`,
    }),
  });
  if (!reply.ok) console.error('Resend refused the unsubscribe notice:', reply.status, await reply.text());
  return reply.ok;
}

export default async function handler(req, res) {
  const email = String(req.query.email || '').trim().slice(0, 254);
  const token = String(req.query.token || '').trim();

  if (!EMAIL_PATTERN.test(email) || !tokenMatches(email, token)) {
    return page(res, 400, 'This link doesn’t work',
      'The unsubscribe link may be incomplete. Open it again from the email, or reply to that email and ask to be removed.');
  }

  const safeEmail = escapeHtml(email);

  // Opening the link only asks to confirm, so email scanners that open links
  // automatically don't unsubscribe people by accident.
  if (req.method === 'GET') {
    return page(res, 200, 'Unsubscribe?',
      `You’ll stop getting emails from Armin at <strong>${safeEmail}</strong>.`,
      '<form method="post"><button type="submit">Unsubscribe</button></form>');
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return page(res, 405, 'This link doesn’t work', 'Open the unsubscribe link from your email.');
  }

  const sent = await notifyOwner(email);
  if (!sent) {
    return page(res, 502, 'You haven’t been unsubscribed yet',
      'Something went wrong on our side. Try again in a minute, or reply to the email and ask to be removed.',
      '<form method="post"><button type="submit">Try again</button></form>');
  }

  return page(res, 200, 'You’re unsubscribed',
    `<strong>${safeEmail}</strong> won’t get any more emails from Armin.`);
}
