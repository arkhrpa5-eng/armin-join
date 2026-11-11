// Shared look for the unsubscribe and subscribe pages. The underscore at the
// start of this file's name tells Vercel it's a helper, not a page of its own.

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function page(res, status, title, message, form = '') {
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

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
