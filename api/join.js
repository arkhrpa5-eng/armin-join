// This is your API. When someone clicks "Join me", the page sends their
// details here, and this code asks Resend to send the emails.
//
// It reads these settings (you add them in Vercel, never in this file):
//   RESEND_API_KEY        your secret key from resend.com
//   OWNER_EMAIL           your own email, so you hear about every new signup
//   FROM_EMAIL            who the emails come from, e.g. "Armin <hello@yourdomain.com>"
//                         (leave it out while testing to use Resend's test sender)
//   RECAPTCHA_SITE_KEY    the public reCAPTCHA key (shows the "I'm not a robot" box)
//   RECAPTCHA_SECRET_KEY  the secret reCAPTCHA key (checks the box was really ticked)
//   RECAPTCHA_VERSION     "v3" (default: invisible check, small badge in the corner)
//                         or "v2" (the "I'm not a robot" tick box). Must match your key's type.
//                         Leave the reCAPTCHA settings out and the form works without any check.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function recaptchaVersion() {
  return String(process.env.RECAPTCHA_VERSION || 'v3').trim().toLowerCase() === 'v2' ? 'v2' : 'v3';
}

// Asks Google whether this visitor is a real person.
async function passedRecaptcha(secret, token, ip, version) {
  if (!token) return false;
  try {
    const reply = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const result = await reply.json();
    if (!result.success) {
      console.error('reCAPTCHA said no:', result['error-codes']);
      return false;
    }
    // v3 gives a score from 0 (bot) to 1 (human) instead of a tick.
    if (version === 'v3') {
      if (result.action && result.action !== 'join') return false;
      if (typeof result.score === 'number' && result.score < 0.5) {
        console.error('reCAPTCHA score too low:', result.score);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Could not reach reCAPTCHA:', error);
    return false;
  }
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// Stops anyone from sneaking HTML into the emails through the form.
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendEmail(apiKey, message) {
  const reply = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  if (!reply.ok) {
    const detail = await reply.text();
    console.error('Resend refused the email:', reply.status, detail);
  }
  return reply.ok;
}

export default async function handler(req, res) {
  // The page asks this first, to find out whether to show the reCAPTCHA box.
  if (req.method === 'GET') {
    const key = String(process.env.RECAPTCHA_SITE_KEY || '').trim();
    return res.status(200).json({ recaptchaSiteKey: key || null, recaptchaVersion: recaptchaVersion() });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use POST to join.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const owner = process.env.OWNER_EMAIL;
  const from = process.env.FROM_EMAIL || 'Armin <onboarding@resend.dev>';
  if (!apiKey || !owner) {
    console.error('RESEND_API_KEY or OWNER_EMAIL is missing in Vercel settings.');
    return res.status(500).json({ error: 'The server is not set up yet.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const email = clean(body.email, 254);

  // A hidden field real people never fill in. Bots usually do.
  if (clean(body.website, 200)) {
    return res.status(201).json({ joined: true, emailSent: true });
  }

  if (!firstName || !lastName || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Add your first name, last name and a valid email.' });
  }

  const recaptchaSecret = String(process.env.RECAPTCHA_SECRET_KEY || '').trim();
  if (recaptchaSecret) {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const version = recaptchaVersion();
    const passed = await passedRecaptcha(recaptchaSecret, clean(body.recaptchaToken, 4000), ip, version);
    if (!passed) {
      const message = version === 'v2'
        ? 'Tick the “I’m not a robot” box, then click Join me again.'
        : 'We couldn’t confirm you’re not a robot. Wait a moment and click Join me again.';
      return res.status(400).json({ error: message, recaptcha: true });
    }
  }

  const safeFirst = escapeHtml(firstName);
  const safeLast = escapeHtml(lastName);
  const safeEmail = escapeHtml(email);

  // 1. Tell you about the new signup. This email is your list.
  const ownerNotified = await sendEmail(apiKey, {
    from,
    to: [owner],
    subject: `New signup: ${firstName} ${lastName}`,
    html: `<p><strong>${safeFirst} ${safeLast}</strong> just joined.</p><p>Email: ${safeEmail}</p>`,
    text: `${firstName} ${lastName} just joined.\nEmail: ${email}`,
  });

  if (!ownerNotified) {
    return res.status(502).json({ error: 'Your details did not go through. Please try again.' });
  }

  // 2. Send the thank-you to the person who joined.
  const emailSent = await sendEmail(apiKey, {
    from,
    to: [email],
    reply_to: owner,
    subject: 'Thank you for joining!',
    html: `<p>Hi ${safeFirst},</p>
<p>Thank you for joining! This email came from the very first API I've built, so you're part of something new.</p>
<p>I'll be in touch soon.</p>
<p>Armin</p>`,
    text: `Hi ${firstName},\n\nThank you for joining! This email came from the very first API I've built, so you're part of something new.\n\nI'll be in touch soon.\n\nArmin`,
  });

  return res.status(201).json({ joined: true, emailSent });
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
