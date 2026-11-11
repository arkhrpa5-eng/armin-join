// Shared helpers for the unsubscribe link. The underscore at the start of
// this file's name tells Vercel it's a helper, not a page of its own.

import { createHmac, timingSafeEqual } from 'node:crypto';

// A short signature tied to one email address, so nobody can unsubscribe
// someone else just by typing their address into the link.
export function unsubscribeToken(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || '';
  return createHmac('sha256', secret)
    .update(String(email).trim().toLowerCase())
    .digest('base64url')
    .slice(0, 32);
}

export function tokenMatches(email, token) {
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(String(token || ''));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// The site's own address, e.g. https://armin-join.vercel.app
export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'armin-join.vercel.app')
    .split(',')[0]
    .trim();
  return `https://${host}`;
}

export function unsubscribeLink(req, email) {
  const params = new URLSearchParams({ email, token: unsubscribeToken(email) });
  return `${siteUrl(req)}/api/unsubscribe?${params}`;
}
