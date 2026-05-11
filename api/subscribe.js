import { createSign } from 'crypto';

// ── Génère un access token OAuth2 depuis le service account ──
async function getAccessToken() {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const now = Math.floor(Date.now() / 1000);

    const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss:   sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud:   'https://oauth2.googleapis.com/token',
        iat:   now,
        exp:   now + 3600
    })).toString('base64url');

    const unsigned  = `${header}.${payload}`;
    const signer    = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = signer.sign(sa.private_key, 'base64url');
    const jwt       = `${unsigned}.${signature}`;

    const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    });
    const data = await r.json();
    if (!data.access_token) throw new Error('OAuth2 token error: ' + JSON.stringify(data));
    return data.access_token;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT not configured on Vercel' });
    }

    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });

    try {
        const accessToken = await getAccessToken();

        const r = await fetch(
            `https://iid.googleapis.com/iid/v1/${token}/rel/topics/levelup-all`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'access_token_auth': 'true'
                }
            }
        );
        if (!r.ok) {
            const txt = await r.text();
            return res.status(r.status).json({ error: 'Subscribe failed', details: txt });
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('[subscribe]', err);
        return res.status(500).json({ error: err.message });
    }
}
