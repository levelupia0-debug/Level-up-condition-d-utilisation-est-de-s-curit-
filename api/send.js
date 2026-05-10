export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, type, name } = body || {};

    if (!email || !type) return res.status(400).json({ error: 'email et type requis' });

    const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Clé API email non configurée' });

    let subject = '';
    let html = '';

    if (type === 'WELCOME') {
      subject = '🌟 Bienvenue dans l\'écosystème LevelUp !';
      html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07070d;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.25);border-radius:100px;padding:8px 20px">
        <span style="font-size:1.1rem">⭐</span>
        <span style="color:#d8b4fe;font-weight:800;letter-spacing:.08em;font-size:.85rem">LEVELUP ECOSYSTEM</span>
      </div>
    </div>
    <div style="background:linear-gradient(145deg,#160a28,#0e061a);border:1px solid rgba(168,85,247,.2);border-radius:20px;padding:36px 32px;text-align:center">
      <div style="font-size:3rem;margin-bottom:16px">🎉</div>
      <h1 style="color:#fff;font-size:1.6rem;font-weight:800;margin:0 0 12px;letter-spacing:-.02em">
        Bienvenue${name ? ', ' + name : ''} !
      </h1>
      <p style="color:rgba(255,255,255,.55);font-size:.95rem;line-height:1.7;margin:0 0 28px">
        Ton compte LevelUp Ecosystem est maintenant actif.<br>
        Génère ta clé depuis ton tableau de bord pour débloquer toutes les apps.
      </p>
      <div style="background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.18);border-radius:14px;padding:20px;margin-bottom:28px;text-align:left">
        <p style="color:rgba(255,255,255,.7);font-size:.82rem;margin:0 0 12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Tes accès :</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="color:rgba(255,255,255,.6);font-size:.88rem">🎬 <strong style="color:#fff">LevelMovie</strong> — Films, séries, K-Dramas HD</div>
          <div style="color:rgba(255,255,255,.6);font-size:.88rem">🎵 <strong style="color:#fff">LevelMusic</strong> — Catalogue musical mondial</div>
          <div style="color:rgba(255,255,255,.6);font-size:.88rem">⭐ <strong style="color:#fff">Level IA</strong> — Assistant Gemini 2.5 Flash</div>
          <div style="color:rgba(255,255,255,.6);font-size:.88rem">🔧 <strong style="color:#fff">Outils</strong> — Utilitaires gratuits</div>
        </div>
      </div>
      <a href="https://levelup-ecosystem.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:700;font-size:.95rem;letter-spacing:.02em">
        Accéder à mon tableau de bord →
      </a>
    </div>
    <p style="text-align:center;color:rgba(255,255,255,.18);font-size:.72rem;margin-top:24px">
      LevelUp Ecosystem · <a href="mailto:levelup.ia0@gmail.com" style="color:rgba(168,85,247,.5)">levelup.ia0@gmail.com</a>
    </p>
  </div>
</body>
</html>`;
    } else if (type === 'SUSPENDED') {
      subject = '⚠️ Ton compte LevelUp a été suspendu';
      html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07070d;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="background:linear-gradient(145deg,#1a0a0a,#120606);border:1px solid rgba(239,68,68,.2);border-radius:20px;padding:36px 32px;text-align:center">
      <div style="font-size:3rem;margin-bottom:16px">⚠️</div>
      <h1 style="color:#fca5a5;font-size:1.4rem;font-weight:800;margin:0 0 12px">Compte suspendu</h1>
      <p style="color:rgba(255,255,255,.55);font-size:.92rem;line-height:1.7;margin:0 0 20px">
        Ton compte LevelUp${name ? ' (' + name + ')' : ''} a été temporairement suspendu.<br>
        Contacte le support pour plus d'informations.
      </p>
      <a href="mailto:levelup.ia0@gmail.com?subject=Suspension compte LevelUp" style="display:inline-block;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.35);color:#fca5a5;text-decoration:none;padding:11px 28px;border-radius:12px;font-weight:700;font-size:.88rem">
        Contacter le support
      </a>
    </div>
    <p style="text-align:center;color:rgba(255,255,255,.18);font-size:.72rem;margin-top:24px">
      LevelUp Ecosystem · <a href="mailto:levelup.ia0@gmail.com" style="color:rgba(168,85,247,.5)">levelup.ia0@gmail.com</a>
    </p>
  </div>
</body>
</html>`;
    } else if (type === 'DELETED') {
      subject = '🗑️ Ton compte LevelUp a été supprimé';
      html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07070d;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="background:linear-gradient(145deg,#160a28,#0e061a);border:1px solid rgba(168,85,247,.2);border-radius:20px;padding:36px 32px;text-align:center">
      <div style="font-size:3rem;margin-bottom:16px">👋</div>
      <h1 style="color:#fff;font-size:1.4rem;font-weight:800;margin:0 0 12px">Compte supprimé</h1>
      <p style="color:rgba(255,255,255,.55);font-size:.92rem;line-height:1.7;margin:0">
        Ton compte LevelUp${name ? ' (' + name + ')' : ''} a été définitivement supprimé.<br>
        Toutes tes données ont été effacées. Tu peux recréer un compte à tout moment.
      </p>
    </div>
    <p style="text-align:center;color:rgba(255,255,255,.18);font-size:.72rem;margin-top:24px">
      LevelUp Ecosystem · <a href="mailto:levelup.ia0@gmail.com" style="color:rgba(168,85,247,.5)">levelup.ia0@gmail.com</a>
    </p>
  </div>
</body>
</html>`;
    } else {
      return res.status(400).json({ error: 'Type inconnu : utilisez WELCOME, SUSPENDED ou DELETED' });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LevelUp <contact@levelup-ecosystem.com>',
        to: [email],
        subject,
        html,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      return res.status(200).json({ ok: true, id: result.id });
    } else {
      console.error('Resend error:', result);
      return res.status(500).json({ error: result.message || 'Erreur Resend' });
    }
  } catch (err) {
    console.error('send.js error:', err);
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
}
