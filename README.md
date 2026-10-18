# Armin's first API

A join page plus a tiny API. When someone clicks **Join me**:

1. The page sends their name and email to `/api/join` (your API).
2. Your API emails **you** about the new signup. Those emails are your list.
3. Your API emails **them** a thank-you through Resend.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The page people visit |
| `api/join.js` | Your API. It talks to Resend |
| `package.json` | Tells the host this is a Node project |
| `.gitignore` | Keeps secrets out of GitHub |

Your API key is **not** in any of these files. You add it in Vercel's settings (step 4), so it never ends up somewhere people can read it.

## Putting it online (about 15 minutes, all free)

### 1. Get your Resend API key
1. Sign up at [resend.com](https://resend.com).
2. Go to **API Keys** and click **Create API Key**. Give it **Sending access**.
3. Copy the key (it starts with `re_`). Keep it somewhere private. Don't paste it into chats or files.

### 2. Put the files on GitHub
1. Sign up at [github.com](https://github.com) if you haven't.
2. Click **New repository**, name it `armin-join`, and create it.
3. Click **uploading an existing file** and drag in everything from this folder, including the `api` folder. Click **Commit changes**.

### 3. Connect it to Vercel
1. Sign up at [vercel.com](https://vercel.com) using your GitHub account. The free Hobby plan is enough.
2. Click **Add New → Project** and pick your `armin-join` repository.

### 4. Add your settings (before you click Deploy)
Open **Environment Variables** and add:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | the key from step 1 |
| `OWNER_EMAIL` | the email you signed up to Resend with |

Then click **Deploy**. Vercel gives you a link like `armin-join.vercel.app`. That's your live page.

### 5. Test it
Open your link and join using **your own email** (the one you used for Resend). You should get two emails: a "New signup" one and the thank-you.

## Letting anyone get the thank-you

Until you verify a domain, Resend only delivers to your own email. Other people can still join, and you'll still get the "New signup" email, but their thank-you won't arrive. The page tells them that honestly.

To fix it:
1. Buy a domain if you don't have one (often around $10–15 a year).
2. In Resend, go to **Domains → Add Domain** and follow the steps. You'll copy a few records into wherever you bought the domain.
3. Once it says **Verified**, add one more setting in Vercel:

| Name | Value |
|---|---|
| `FROM_EMAIL` | `Armin <hello@yourdomain.com>` |

4. In Vercel, go to **Deployments**, open the latest one and click **Redeploy** so the new setting takes effect.

## Changing the email

The thank-you text is near the bottom of `api/join.js`, under "Send the thank-you". Edit it on GitHub and Vercel updates your site automatically.

## If something goes wrong

In Vercel, open your project, then **Logs**. If Resend refuses an email, the reason shows up there (for example, a missing setting or an unverified domain).
