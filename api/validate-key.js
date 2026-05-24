import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
    if (getApps().length > 0) return;
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(sa) });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { key, appId } = req.body || {};

    // Validate key format
    if (!key || !/^LVL-[A-Z0-9]{5}-[A-Z0-9]{5}$/i.test(key.trim())) {
        return res.status(400).json({ valid: false, error: 'Format de clé invalide. Attendu: LVL-XXXXX-XXXXX' });
    }

    const cleanKey = key.trim().toUpperCase();

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ error: 'Configuration serveur manquante.' });
    }

    try {
        initAdmin();
        const db = getFirestore();

        // Search across all user security/key documents using collectionGroup
        const snapshot = await db
            .collectionGroup('security')
            .where('apiKey', '==', cleanKey)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Also try alternate field names
            const snap2 = await db
                .collectionGroup('security')
                .where('key', '==', cleanKey)
                .limit(1)
                .get();

            if (snap2.empty) {
                return res.status(200).json({ valid: false, error: 'Clé introuvable.' });
            }

            const doc2 = snap2.docs[0];
            const data2 = doc2.data();
            const uid = doc2.ref.parent.parent?.id || null;

            return res.status(200).json({
                valid: true,
                uid,
                role:    data2.role || 'user',
                isAdmin: data2.isAdmin || false,
                name:    data2.displayName || data2.name || null,
                email:   data2.email || null,
                appId:   appId || 'levelup-ecosystem'
            });
        }

        const docSnap = snapshot.docs[0];
        const data    = docSnap.data();

        // Get the userId from path: artifacts/{appId}/users/{userId}/security
        const uid = docSnap.ref.parent.parent?.id || null;

        // Check if key is active
        if (data.disabled === true || data.banned === true) {
            return res.status(200).json({ valid: false, error: 'Clé désactivée.' });
        }

        return res.status(200).json({
            valid:   true,
            uid,
            role:    data.role || 'user',
            isAdmin: data.isAdmin || false,
            name:    data.displayName || data.name || null,
            email:   data.email || null,
            appId:   appId || 'levelup-ecosystem',
            // Return safe user info for the app to use
            keyMeta: {
                generatedAt: data.generatedAt || null,
                lastUsed:    new Date().toISOString(),
            }
        });

    } catch (err) {
        console.error('[validate-key]', err);
        return res.status(500).json({ valid: false, error: 'Erreur serveur: ' + err.message });
    }
}
