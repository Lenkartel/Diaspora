// api/shorten.js
// Stores payment payload in Vercel Blob — no npm package needed, plain fetch

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  if (!BLOB_TOKEN) return res.status(500).send('Missing BLOB_READ_WRITE_TOKEN');

  let payload = {};
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  // Generate a random 6-char ID
  function randomId(len = 6) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let id = '';
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    for (const b of arr) id += chars[b % chars.length];
    return id;
  }

  const id = randomId();

  // Upload to Vercel Blob as a JSON file
  const blobRes = await fetch(`https://blob.vercel-storage.com/pay/${id}.json`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${BLOB_TOKEN}`,
      'Content-Type': 'application/json',
      'x-cache-control-max-age': '604800', // 7 days
    },
    body: JSON.stringify(payload),
  });

  if (!blobRes.ok) {
    const err = await blobRes.text();
    console.error('Blob upload error:', err);
    return res.status(502).send('Failed to store link');
  }

  return res.status(200).json({ id });
}
