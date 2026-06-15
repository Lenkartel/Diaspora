// api/shorten.js
// Stores payment payload in Vercel KV and returns a 6-char ID
// Setup: run `vercel kv create` and link to your project

import { kv } from '@vercel/kv';

function randomId(len = 6) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // no confusable chars
  let id = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) id += chars[b % chars.length];
  return id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  let payload = {};
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  // Generate unique ID (retry on collision, max 5 attempts)
  let id;
  for (let i = 0; i < 5; i++) {
    const candidate = randomId();
    const exists = await kv.get(`pay:${candidate}`);
    if (!exists) { id = candidate; break; }
  }
  if (!id) return res.status(500).send('Could not generate ID');

  // Store for 7 days (604800 seconds)
  await kv.set(`pay:${id}`, JSON.stringify(payload), { ex: 604800 });

  return res.status(200).json({ id });
}
