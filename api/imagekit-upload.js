import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://levelup-ecosystem.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
  const IMAGEKIT_PUBLIC_KEY  = process.env.IMAGEKIT_PUBLIC_KEY;
  const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_URL_ENDPOINT) {
    return res.status(500).json({ error: 'ImageKit not configured' });
  }

  try {
    const rawBody = await getRawBody(req);
    const contentType = req.headers['content-type'] || '';

    const ikForm = new FormData();

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return res.status(400).json({ error: 'No boundary in multipart' });

    const parts = rawBody.toString('binary').split('--' + boundary);
    let fileBuffer = null, fileName = 'upload', folder = '/levelup/avatars';

    for (const part of parts) {
      if (part.includes('Content-Disposition')) {
        const nameMatch = part.match(/name="([^"]+)"/);
        const filenameMatch = part.match(/filename="([^"]+)"/);
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        const body = part.slice(headerEnd + 4, part.length - 2);

        if (nameMatch && nameMatch[1] === 'file' && filenameMatch) {
          fileName = filenameMatch[1];
          fileBuffer = Buffer.from(body, 'binary');
        } else if (nameMatch && nameMatch[1] === 'fileName') {
          fileName = body.trim();
        } else if (nameMatch && nameMatch[1] === 'folder') {
          folder = body.trim();
        }
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'No file found in request' });

    ikForm.append('file', fileBuffer, { filename: fileName });
    ikForm.append('fileName', fileName);
    ikForm.append('folder', folder);
    ikForm.append('useUniqueFileName', 'true');

    const authString = Buffer.from(IMAGEKIT_PRIVATE_KEY + ':').toString('base64');
    const ikRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        ...ikForm.getHeaders()
      },
      body: ikForm
    });

    const ikData = await ikRes.json();
    if (!ikRes.ok) return res.status(ikRes.status).json({ error: ikData.message || 'ImageKit error' });

    return res.status(200).json({ url: ikData.url, fileId: ikData.fileId, name: ikData.name });
  } catch (err) {
    console.error('imagekit-upload error:', err);
    return res.status(500).json({ error: err.message });
  }
}
