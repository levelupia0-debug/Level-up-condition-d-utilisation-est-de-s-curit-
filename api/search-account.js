import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
    if (getApps().length > 0) return;
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(sa) });
}

export default async function handler(req, res) {
    // Autoriser Dona depuis n'importe où
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email } = req.body || {};

    if (!email || !email.includes('@')) {
        return res.status(400).json({ found: false, error: 'Email invalide.' });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ error: 'Configuration serveur manquante.' });
    }

    try {
        initAdmin();
        const db = getFirestore();

        // On utilise collectionGroup en tant qu'ADMIN (Bypasse tes Firestore Rules)
        const snapshot = await db.collectionGroup('security')
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Tentative avec ownerEmail au cas où
            const snap2 = await db.collectionGroup('security')
                .where('ownerEmail', '==', email.toLowerCase())
                .limit(1)
                .get();

            if (snap2.empty) {
                return res.status(200).json({ found: false });
            }
            
            const docData = snap2.docs[0].data();
            return res.status(200).json({
                found: true,
                user: {
                    name: docData.displayName || docData.name || null,
                    photoURL: docData.photoURL || docData.avatar || null
                }
            });
        }

        const docData = snapshot.docs[0].data();
        
        return res.status(200).json({
            found: true,
            user: {
                name: docData.displayName || docData.name || null,
                photoURL: docData.photoURL || docData.avatar || null
            }
        });

    } catch (err) {
        console.error('[search-account]', err);
        return res.status(500).json({ found: false, error: 'Erreur serveur: ' + err.message });
    }
}
