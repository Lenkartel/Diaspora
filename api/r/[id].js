// api/r/[id].js
// Resolves a short link ID → redirects to receipt.html with Base64 payload

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).send('Missing ID');

  const raw = await kv.get(`pay:${id}`);
  if (!raw) {
    return res.status(404).send(`
      <!doctype html><html><head><meta charset="utf-8">
      <title>Link Expired</title></head><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>Link not found or expired</h2>
      <p>This payment link may have expired. Links are valid for 7 days.</p>
      </body></html>
    `);
  }

  // Re-encode as Base64 for receipt.html
  const encoded = Buffer.from(raw).toString('base64');
  const receiptURL = `/receipt.html?p=${encodeURIComponent(encoded)}`;

  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, receiptURL);
}
