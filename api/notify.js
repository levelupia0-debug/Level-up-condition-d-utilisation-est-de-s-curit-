import { createSign } from 'crypto';

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const adminKey    = req.headers['x-admin-key'];
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminKey || !adminSecret || adminKey !== adminSecret) {
        return res.status(401).json({
            error: 'Non autorisé — la clé x-admin-key ne correspond pas à ADMIN_SECRET.'
        });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT non configuré.' });
    }

    const {
        title, body, url, image,
        // Bilingual support
        title_fr, title_en, body_fr, body_en,
        // Targeting
        topic = 'levelup-all',
        // Category for filtering in dashboard
        category = 'general'
    } = req.body || {};

    const finalTitle = title || title_fr || title_en;
    const finalBody  = body  || body_fr  || body_en;

    if (!finalTitle || !finalBody) {
        return res.status(400).json({ error: 'Les champs "title" et "body" (ou leurs variantes FR/EN) sont obligatoires.' });
    }

    const targetUrl = url || 'https://levelup-ecosystem.com';
    const iconUrl   = 'https://levelup-ecosystem.com/icon.svg';

    // All data fields (bilingual + meta)
    const dataFields = {
        title:    finalTitle,
        body:     finalBody,
        url:      targetUrl,
        icon:     iconUrl,
        sentAt:   new Date().toISOString(),
        category,
        // Bilingual fields for service worker
        title_fr: title_fr || title || '',
        title_en: title_en || title || '',
        body_fr:  body_fr  || body  || '',
        body_en:  body_en  || body  || '',
        ...(image ? { image } : {})
    };

    const message = {
        topic,
        data: dataFields,
        webpush: {
            headers: { Urgency: 'high', TTL: '86400' },
            fcm_options: { link: targetUrl }
        },
        android: {
            priority: 'high',
            notification: {
                title: finalTitle,
                body:  finalBody,
                icon:       'notification_icon',
                channel_id: 'levelup_push',
                tag:        `lvlup-${finalTitle.slice(0, 10)}`,
                ...(image ? { image } : {})
            }
        },
        apns: {
            payload: { aps: { alert: { title: finalTitle, body: finalBody }, sound: 'default', badge: 1 } },
            ...(image ? { fcm_options: { image } } : {})
        }
    };

    try {
        const accessToken = await getAccessToken();
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const r = await fetch(
            `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type':  'application/json'
                },
                body: JSON.stringify({ message })
            }
        );
        const data = await r.json();
        if (!r.ok) return res.status(r.status).json({ error: 'Erreur FCM v1', details: data });
        return res.status(200).json({ success: true, name: data.name });
    } catch (err) {
        console.error('[notify]', err);
        return res.status(500).json({ error: err.message });
    }
}
