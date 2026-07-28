// api/cron/notifications.js
//
// Tâche planifiée qui envoie les notifications automatiques de LevelMovie :
//   1. Rappels de sortie (films/séries suivis, sortis aujourd'hui ou avant)
//   2. Relance "viens finir ton film" (contenu ouvert il y a 2-5 jours, jamais revenu depuis)
//
// Tourne sur VERCEL (pas Firebase Cloud Functions) via la config "crons" de vercel.json —
// gratuit sur le plan Hobby. Utilise le même FIREBASE_SERVICE_ACCOUNT que /api/validate-key.js,
// donc aucune nouvelle variable d'environnement à ajouter si elle existe déjà.
//
// Vercel appelle cette route automatiquement à l'heure programmée dans vercel.json, avec un header
// d'autorisation qu'on vérifie ci-dessous pour empêcher n'importe qui d'appeler cette route à la main.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function initAdmin() {
    if (getApps().length > 0) return;
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(sa) });
}

const NOTIF_PATH = ['artifacts', 'levelup-ecosystem', 'public', 'data', 'notifications'];

async function sendToUser(db, messaging, uid, title, body, url) {
    const tokenSnap = await db.doc(`artifacts/levelup-ecosystem/public/data/fcm_tokens/${uid}`).get();
    if (!tokenSnap.exists) return false;
    const token = tokenSnap.data().token;
    if (!token) return false;

    try {
        await messaging.send({ token, notification: { title, body }, data: { url, title, body } });
    } catch (e) {
        if (e.code === 'messaging/registration-token-not-registered') {
            await db.doc(`artifacts/levelup-ecosystem/public/data/fcm_tokens/${uid}`).delete().catch(() => {});
        }
        return false;
    }

    await db.collection(NOTIF_PATH.join('/')).add({ title, body, url, targetUid: uid, createdAt: new Date() }).catch(() => {});
    return true;
}

async function runReleaseReminders(db, messaging) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const snap = await db.collection('artifacts/levelup-ecosystem/public/data/release_reminders').where('notified', '==', false).get();

    const due = snap.docs.filter(d => {
        const data = d.data();
        return data.releaseDate && data.releaseDate.slice(0, 10) <= todayStr;
    });

    let sent = 0;
    for (const docSnap of due) {
        const r = docSnap.data();
        const url = `https://levelup-ecosystem.com/movie?watch=${r.movieId}&type=${r.mediaType || 'movie'}`;
        const ok = await sendToUser(db, messaging, r.uid, '🎬 Disponible maintenant !', `${r.title} est enfin sorti — regarde-le dès maintenant sur LevelMovie.`, url);
        if (ok) { await docSnap.ref.update({ notified: true, notifiedAt: new Date() }); sent++; }
    }
    return { checked: due.length, sent };
}

async function runResumeWatchingNudge(db, messaging) {
    const usersSnap = await db.collectionGroup('recent').get(); // artifacts/{appId}/users/{uid}/history/recent
    const now = Date.now();
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
    let sent = 0;

    for (const docSnap of usersSnap.docs) {
        const items = docSnap.data().items || [];
        if (items.length === 0) continue;

        const mostRecent = items[0];
        const age = now - (mostRecent.viewedAt || 0);
        if (age < TWO_DAYS || age > FIVE_DAYS) continue;

        const uid = docSnap.ref.parent.parent?.id;
        if (!uid) continue;

        const nudgeKey = `nudge_${uid}_${mostRecent.id}`;
        const already = await db.doc(`artifacts/levelup-ecosystem/public/data/sent_nudges/${nudgeKey}`).get();
        if (already.exists) continue;

        const url = `https://levelup-ecosystem.com/movie?watch=${mostRecent.id}&type=${mostRecent.media_type || 'movie'}`;
        const ok = await sendToUser(db, messaging, uid, "🍿 Tu n'as pas fini ?", `Reviens finir "${mostRecent.title}" sur LevelMovie.`, url);
        if (ok) { await db.doc(`artifacts/levelup-ecosystem/public/data/sent_nudges/${nudgeKey}`).set({ sentAt: new Date() }); sent++; }
    }
    return { sent };
}

export default async function handler(req, res) {
    // Vercel envoie ce header sur les vrais appels Cron. On protège la route pour que
    // personne d'autre ne puisse la déclencher à la main (et spammer tes utilisateurs).
    const authHeader = req.headers['authorization'];
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT manquant sur Vercel.' });
    }

    try {
        initAdmin();
        const db = getFirestore();
        const messaging = getMessaging();

        const releaseResult = await runReleaseReminders(db, messaging);
        const nudgeResult = await runResumeWatchingNudge(db, messaging);

        return res.status(200).json({ ok: true, releaseReminders: releaseResult, resumeNudge: nudgeResult });
    } catch (err) {
        console.error('[cron/notifications]', err);
        return res.status(500).json({ error: err.message || 'Erreur interne' });
    }
}
