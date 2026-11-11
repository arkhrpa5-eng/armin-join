// The page the "Subscribe again" link opens (in the thank-you email, and the
// button on the "You're unsubscribed" page).
//
// Opening the link shows a page with a Subscribe button. Clicking it marks the
// person subscribed again in your Resend contacts. If Resend contacts can't be
// updated (for example the API key only has "Sending access"), it emails you
// (OWNER_EMAIL) instead so you can add them back yourself.

import { tokenMatches, unsubscribeLink } from './_unsubscribe.js';
import { markSubscribed } from './_contacts.js';
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
      subject: `Subscribed again: ${email}`,
      text: `${email} subscribed again. Add them back to your list.`,
      html: `<p><strong>${escapeHtml(email)}</strong> subscribed again.</p><p>Add them back to your list.</p>`,
    }),
  });
  if (!reply.ok) console.error('Resend refused the subscribe notice:', reply.status, await reply.text());
  return reply.ok;
}

export default async function handler(req, res) {
  const email = String(req.query.email || '').trim().slice(0, 254);
  const token = String(req.query.token || '').trim();

  if (!EMAIL_PATTERN.test(email) || !tokenMatches(email, token)) {
    return page(res, 400, 'This link doesn’t work',
      'The subscribe link may be incomplete. Open it again from the email, or join again on Armin’s page.');
  }

  const safeEmail = escapeHtml(email);

  // Opening the link only asks to confirm, so email scanners that open links
  // automatically don't subscribe people by accident.
  if (req.method === 'GET') {
    return page(res, 200, 'Subscribe again?',
      `You’ll start getting emails from Armin again at <strong>${safeEmail}</strong>.`,
      '<form method="post"><button type="submit">Subscribe</button></form>');
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return page(res, 405, 'This link doesn’t work', 'Open the subscribe link from your email.');
  }

  const apiKey = process.env.RESEND_API_KEY;
  const done = (apiKey && await markSubscribed(apiKey, email)) || await notifyOwner(email);
  if (!done) {
    return page(res, 502, 'You haven’t been subscribed yet',
      'Something went wrong on our side. Try again in a minute, or join again on Armin’s page.',
      '<form method="post"><button type="submit">Try again</button></form>');
  }

  return page(res, 200, 'You’re subscribed',
    `<strong>${safeEmail}</strong> will get emails from Armin again. Changed your mind? You can unsubscribe.`,
    `<form method="post" action="${escapeHtml(unsubscribeLink(req, email))}"><button type="submit">Unsubscribe</button></form>`);
}
