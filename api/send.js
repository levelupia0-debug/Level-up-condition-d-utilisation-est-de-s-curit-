export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, type, name, ip, country, city, device, date, tools, count } = body || {};

    if (!email || !type) return res.status(400).json({ error: "L'email et le type sont requis" });

    const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Clé API email non configurée sur le serveur' });

    const CSS_BASE = `
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
      .fluid-text { word-break: break-word; overflow-wrap: break-word; }
      @media screen and (max-width: 600px) {
        .responsive-table { width: 100% !important; max-width: 100% !important; }
        .padding-mobile { padding: 40px 20px !important; }
        .title-mobile { font-size: 24px !important; }
        .btn-mobile { padding: 16px 30px !important; font-size: 12px !important; }
      }
    `;

    const displayName = name || 'Utilisateur';
    let subject = '';
    let contentHtml = '';

    // ── 1. BIENVENUE ──────────────────────────────────────────
    if (type === 'WELCOME') {
      subject = "🌟 Bienvenue dans l'écosystème LevelUp !";
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #3b0764;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:30px">Level<span style="color:#a855f7">Up</span></div>
            <h1 class="title-mobile fluid-text" style="font-size:26px;font-weight:800;margin:0 0 15px;color:#fff">Bienvenue ${displayName} ! 🚀</h1>
            <p class="fluid-text" style="font-size:15px;color:#a1a1aa;line-height:1.6;margin:0 0 35px;max-width:90%">Ton compte <strong>LevelUp Ecosystem</strong> est maintenant actif. Génère ta clé privée depuis ton tableau de bord pour débloquer toutes les applications de l'écosystème.</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-radius:16px;margin-bottom:35px;width:100%">
              <tr><td align="left" style="padding:25px 20px">
                <h3 style="font-size:13px;color:#a855f7;text-transform:uppercase;font-weight:800;letter-spacing:1px;margin:0 0 15px">Tes accès débloqués</h3>
                <p class="fluid-text" style="font-size:14px;color:#d4d4d8;margin:0 0 10px;line-height:1.4">🎬 <strong>LevelMovie</strong> : Films &amp; Séries 4K</p>
                <p class="fluid-text" style="font-size:14px;color:#d4d4d8;margin:0 0 10px;line-height:1.4">🎵 <strong>LevelMusic</strong> : Catalogue musical</p>
                <p class="fluid-text" style="font-size:14px;color:#d4d4d8;margin:0 0 10px;line-height:1.4">🤖 <strong>LevelIA</strong> : Assistant Gemini Pro</p>
                <p class="fluid-text" style="font-size:14px;color:#d4d4d8;margin:0;line-height:1.4">🔧 <strong>Outils</strong> : Utilitaires premium</p>
              </td></tr>
            </table>
            <a href="https://levelup-ecosystem.com" class="btn-mobile" style="display:inline-block;background-color:#a855f7;color:#fff;text-decoration:none;padding:18px 40px;border-radius:50px;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;border:1px solid #c084fc">Ouvrir le Dashboard</a>
          </td></tr>
        </table>`;

    // ── 2. SUSPENSION ─────────────────────────────────────────
    } else if (type === 'SUSPENDED') {
      subject = '⚠️ Ton compte LevelUp a été suspendu';
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #7f1d1d;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:30px">Level<span style="color:#ef4444">Up</span></div>
            <h1 class="title-mobile fluid-text" style="font-size:26px;font-weight:800;margin:0 0 15px;color:#fff">Compte Suspendu ⚠️</h1>
            <p class="fluid-text" style="font-size:15px;color:#a1a1aa;line-height:1.6;margin:0 0 35px;max-width:90%">Ton compte <strong>LevelUp Ecosystem</strong> a été temporairement suspendu suite à une activité suspecte ou un non-respect de nos conditions d'utilisation.</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-left:4px solid #ef4444;border-radius:8px;width:100%;margin-bottom:35px">
              <tr><td align="left" style="padding:15px">
                <p style="font-size:11px;color:#ef4444;font-weight:800;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px">Information</p>
                <p class="fluid-text" style="font-size:13px;color:#d4d4d8;margin:0;line-height:1.5">Si tu penses qu'il s'agit d'une erreur, tu peux faire appel de cette décision en contactant notre équipe de support.</p>
              </td></tr>
            </table>
            <a href="mailto:contact@levelup-ecosystem.com?subject=Appel%20Suspension%20Compte" class="btn-mobile" style="display:inline-block;background-color:transparent;color:#ef4444;text-decoration:none;padding:18px 40px;border-radius:50px;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;border:1px solid #ef4444">Contacter le support</a>
          </td></tr>
        </table>`;

    // ── 3. SUPPRESSION ────────────────────────────────────────
    } else if (type === 'DELETED') {
      subject = '🗑️ Ton compte LevelUp a été supprimé';
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #3f3f46;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:30px">Level<span style="color:#a1a1aa">Up</span></div>
            <h1 class="title-mobile fluid-text" style="font-size:26px;font-weight:800;margin:0 0 15px;color:#fff">Compte Supprimé 👋</h1>
            <p class="fluid-text" style="font-size:15px;color:#a1a1aa;line-height:1.6;margin:0 0 35px;max-width:90%">Ton compte <strong>LevelUp Ecosystem</strong> a été définitivement supprimé. Toutes tes données, tes playlists et tes favoris ont été effacés de nos serveurs.</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-radius:16px;margin-bottom:35px;width:100%">
              <tr><td align="center" style="padding:25px 20px">
                <p class="fluid-text" style="font-size:14px;color:#d4d4d8;margin:0;line-height:1.4">Tu nous manques déjà ! Tu peux recréer un compte à tout moment pour rejoindre l'aventure.</p>
              </td></tr>
            </table>
            <a href="https://levelup-ecosystem.com" class="btn-mobile" style="display:inline-block;background-color:#27272a;color:#fff;text-decoration:none;padding:18px 40px;border-radius:50px;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;border:1px solid #52525b">Recréer un compte</a>
          </td></tr>
        </table>`;

    // ── 4. NOUVELLE CONNEXION (IP / APPAREIL) ─────────────────
    } else if (type === 'NEW_LOGIN') {
      subject = '🔐 Nouvelle connexion détectée sur ton compte LevelUp';
      const loginIp = ip || 'Inconnue';
      const loginCity = city || '—';
      const loginCountry = country || '—';
      const loginDevice = device ? device.substring(0, 120) : 'Inconnu';
      const loginDate = date || new Date().toLocaleString('fr-FR');
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #78350f;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:16px">Level<span style="color:#f97316">Up</span></div>
            <div style="width:56px;height:56px;border-radius:16px;background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
              <span style="font-size:24px">🔐</span>
            </div>
            <h1 class="title-mobile fluid-text" style="font-size:24px;font-weight:800;margin:0 0 12px;color:#fff">Nouvelle connexion détectée</h1>
            <p class="fluid-text" style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 28px;max-width:90%">Bonjour <strong style="color:#fff">${displayName}</strong>, une connexion à ton compte LevelUp a été détectée depuis un nouvel appareil ou une nouvelle adresse IP.</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-radius:16px;margin-bottom:28px;width:100%;border:1px solid rgba(249,115,22,.15)">
              <tr><td align="left" style="padding:22px 20px">
                <h3 style="font-size:11px;color:#f97316;text-transform:uppercase;font-weight:800;letter-spacing:1px;margin:0 0 16px">Détails de la connexion</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;color:#71717a;font-weight:600">Adresse IP</span></td>
                    <td align="right" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;color:#d4d4d8;font-family:monospace">${loginIp}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;color:#71717a;font-weight:600">Localisation</span></td>
                    <td align="right" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;color:#d4d4d8">${loginCity}, ${loginCountry}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;color:#71717a;font-weight:600">Date &amp; heure</span></td>
                    <td align="right" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;color:#d4d4d8">${loginDate}</span></td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:10px 0 0"><span style="font-size:11px;color:#52525b;word-break:break-all">Appareil : ${loginDevice}</span></td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:12px;margin-bottom:28px">
              <tr><td align="left" style="padding:14px 16px">
                <p class="fluid-text" style="font-size:13px;color:#fca5a5;margin:0;line-height:1.5"><strong>Ce n'était pas toi ?</strong> Contacte immédiatement le support et change ton accès Google.</p>
              </td></tr>
            </table>
            <a href="mailto:contact@levelup-ecosystem.com?subject=Connexion%20non%20autorisée" class="btn-mobile" style="display:inline-block;background-color:transparent;color:#f97316;text-decoration:none;padding:16px 36px;border-radius:50px;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:2px;border:1px solid #f97316">Signaler une activité suspecte</a>
          </td></tr>
        </table>`;

    // ── 5. NOUVEL OUTIL ───────────────────────────────────────
    } else if (type === 'NEW_TOOL') {
      const toolCount = count || 1;
      const toolNames = tools || 'Nouvel outil';
      subject = `🔧 ${toolCount > 1 ? toolCount + ' nouveaux outils disponibles' : 'Un nouvel outil disponible'} sur LevelUp !`;
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #14532d;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:16px">Level<span style="color:#22c55e">Up</span></div>
            <div style="width:56px;height:56px;border-radius:16px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
              <span style="font-size:24px">🔧</span>
            </div>
            <h1 class="title-mobile fluid-text" style="font-size:24px;font-weight:800;margin:0 0 12px;color:#fff">${toolCount > 1 ? toolCount + ' nouveaux outils' : 'Un nouvel outil'} disponible${toolCount > 1 ? 's' : ''} !</h1>
            <p class="fluid-text" style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 28px;max-width:90%">Bonjour <strong style="color:#fff">${displayName}</strong>, l'équipe LevelUp vient d'ajouter ${toolCount > 1 ? 'de nouveaux outils' : 'un nouvel outil'} à ton écosystème.</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-radius:16px;margin-bottom:28px;width:100%;border:1px solid rgba(34,197,94,.12)">
              <tr><td align="left" style="padding:22px 20px">
                <h3 style="font-size:11px;color:#22c55e;text-transform:uppercase;font-weight:800;letter-spacing:1px;margin:0 0 14px">${toolCount > 1 ? 'Nouveaux outils ajoutés' : 'Nouvel outil ajouté'}</h3>
                ${toolNames.split(',').map(t => `<p class="fluid-text" style="font-size:14px;color:#d4d4d8;margin:0 0 8px;line-height:1.4;display:flex;align-items:center;gap:8px">🔧 <strong>${t.trim()}</strong></p>`).join('')}
              </td></tr>
            </table>
            <a href="https://levelup-ecosystem.com" class="btn-mobile" style="display:inline-block;background-color:#22c55e;color:#000;text-decoration:none;padding:18px 40px;border-radius:50px;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;border:1px solid #16a34a">Découvrir les outils</a>
          </td></tr>
        </table>`;

    } else {
      return res.status(400).json({ error: 'Type inconnu : utilisez WELCOME, SUSPENDED, DELETED, NEW_LOGIN ou NEW_TOOL' });
    }

    const finalHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${CSS_BASE}</style>
</head>
<body style="margin:0;padding:0;background-color:#060608;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#060608;width:100%;table-layout:fixed">
    <tr>
      <td align="center" style="padding:40px 10px">
        ${contentHtml}
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto">
          <tr><td align="center" style="padding-top:30px">
            <p class="fluid-text" style="color:#52525b;font-size:11px;margin:0;line-height:1.5;font-weight:500">
              Cet email a été envoyé automatiquement par LevelUp Ecosystem.<br>
              <a href="mailto:contact@levelup-ecosystem.com" style="color:#a855f7;text-decoration:none">contact@levelup-ecosystem.com</a>
            </p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'LevelUp <contact@levelup-ecosystem.com>',
        to: [email],
        subject,
        html: finalHtml
      })
    });

    const result = await response.json();
    if (response.ok) return res.status(200).json({ ok: true, id: result.id });
    console.error('Erreur Resend:', result);
    return res.status(500).json({ error: result.message || 'Erreur lors de l\'envoi via Resend' });

  } catch (err) {
    console.error('Erreur send.js:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne du serveur' });
  }
}
