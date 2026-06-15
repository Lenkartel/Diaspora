// api/r/[id].js
// Reads payload from Vercel Blob and redirects to receipt.html

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing ID');

  const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  if (!BLOB_TOKEN) return res.status(500).send('Missing BLOB_READ_WRITE_TOKEN');

  // Fetch the stored JSON from Blob
  const blobRes = await fetch(`https://blob.vercel-storage.com/pay/${id}.json`, {
    headers: { 'Authorization': `Bearer ${BLOB_TOKEN}` },
  });

  if (!blobRes.ok) {
    return res.status(404).send(`
      <!doctype html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Link Expired</title>
      <style>body{font-family:sans-serif;text-align:center;padding:60px 24px;color:#0a1f44}h2{margin-bottom:12px}p{color:#6b82a8}</style>
      </head><body>
      <h2>Link not found or expired</h2>
      <p>This payment link may have expired or is invalid.</p>
      </body></html>
    `);
  }

  const payload = await blobRes.json();

  // Encode payload as Base64 for receipt.html
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, `/receipt.html?p=${encodeURIComponent(encoded)}`);
}
