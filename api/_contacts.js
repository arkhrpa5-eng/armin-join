// Keeps your list in Resend: everyone who joins becomes a Contact, and
// unsubscribing marks them unsubscribed there. Resend Broadcasts then skip
// unsubscribed contacts automatically.
//
// Needs a Resend API key with "Full access". A "Sending access" key can send
// emails but can't touch contacts; if that happens, these return false and
// the rest of the site keeps working.

const CONTACTS_URL = 'https://api.resend.com/contacts';

async function call(apiKey, method, url, body) {
  try {
    const reply = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!reply.ok) console.error(`Resend contacts ${method} refused:`, reply.status, await reply.text());
    return reply.ok;
  } catch (error) {
    console.error('Could not reach Resend contacts:', error);
    return false;
  }
}

function contactUrl(email) {
  return `${CONTACTS_URL}/${encodeURIComponent(email)}`;
}

// Has this address unsubscribed before? true or false, or null when Resend
// can't tell us (no contact access, or Resend unreachable).
export async function isUnsubscribed(apiKey, email) {
  try {
    const reply = await fetch(contactUrl(email), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (reply.status === 404) return false; // never joined before
    if (!reply.ok) {
      console.error('Resend contacts GET refused:', reply.status, await reply.text());
      return null;
    }
    const contact = await reply.json();
    return contact.unsubscribed === true;
  } catch (error) {
    console.error('Could not reach Resend contacts:', error);
    return null;
  }
}

// Adds someone who joined. If they're already a contact, updates their
// name only. It never re-subscribes anyone: an unsubscribe always sticks.
export async function saveContact(apiKey, { email, firstName, lastName }) {
  const details = { email, first_name: firstName, last_name: lastName, unsubscribed: false };
  if (await call(apiKey, 'POST', CONTACTS_URL, details)) return true;
  return call(apiKey, 'PATCH', contactUrl(email), { first_name: firstName, last_name: lastName });
}

// Marks someone as unsubscribed. If they aren't a contact yet (they joined
// before contacts were switched on), adds them as already unsubscribed.
export async function markUnsubscribed(apiKey, email) {
  if (await call(apiKey, 'PATCH', contactUrl(email), { unsubscribed: true })) return true;
  return call(apiKey, 'POST', CONTACTS_URL, { email, unsubscribed: true });
}
