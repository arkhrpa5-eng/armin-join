// "Check my subscription": looks up an email in your Resend contacts and
// says whether it's subscribed, unsubscribed, or not on the list.
// Needs a Resend API key with "Full access" to read contacts.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST to check a subscription.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'The server is not set up yet.' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email to check.' });
  }

  try {
    const reply = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (reply.status === 404) return res.status(200).json({ status: 'not_found' });
    if (!reply.ok) {
      console.error('Resend contacts GET refused:', reply.status, await reply.text());
      const message = reply.status === 401 || reply.status === 403
        ? 'Subscriptions can’t be checked right now. Armin needs to give the site a Full access key.'
        : 'Subscriptions can’t be checked right now. Try again in a minute.';
      return res.status(502).json({ error: message });
    }
    const contact = await reply.json();
    return res.status(200).json({ status: contact.unsubscribed === true ? 'unsubscribed' : 'subscribed' });
  } catch (error) {
    console.error('Could not reach Resend contacts:', error);
    return res.status(502).json({ error: 'Subscriptions can’t be checked right now. Try again in a minute.' });
  }
}
