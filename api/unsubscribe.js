// The page the unsubscribe link in the thank-you email opens.
//
// Opening the link shows a page with an Unsubscribe button. Clicking it marks
// the person unsubscribed in your Resend contacts, so Broadcasts skip them.
// If Resend contacts can't be updated (for example the API key only has
// "Sending access"), it emails you (OWNER_EMAIL) instead so nobody is missed.
// Email apps with a built-in "Unsubscribe" button use this too.

import { tokenMatches, subscribeLink } from './_unsubscribe.js';
import { markUnsubscribed } from './_contacts.js';
import { page, escapeHtml, EMAIL_PATTERN } from './_page.js';

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

  const apiKey = process.env.RESEND_API_KEY;
  const done = (apiKey && await markUnsubscribed(apiKey, email)) || await notifyOwner(email);
  if (!done) {
    return page(res, 502, 'You haven’t been unsubscribed yet',
      'Something went wrong on our side. Try again in a minute, or reply to the email and ask to be removed.',
      '<form method="post"><button type="submit">Try again</button></form>');
  }

  return page(res, 200, 'You’re unsubscribed',
    `<strong>${safeEmail}</strong> won’t get any more emails from Armin. Changed your mind? You can subscribe again.`,
    `<form method="post" action="${escapeHtml(subscribeLink(req, email))}"><button type="submit">Subscribe again</button></form>`);
}
