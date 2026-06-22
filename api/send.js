export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, type, name, ip, country, city, device, date, tools, count,
            partyCode, movieTitle, inviterName, maskedKey, generatedAt,
            title, message, subject, html, code } = body || {};

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
    let emailSubject = '';
    let contentHtml = '';
    let rawHtml = null;

    // ── 1. BIENVENUE ──────────────────────────────────────────
    if (type === 'WELCOME') {
      emailSubject = "🌟 Bienvenue dans l'écosystème LevelUp !";
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
      emailSubject = '⚠️ Ton compte LevelUp a été suspendu';
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
      emailSubject = '🗑️ Ton compte LevelUp a été supprimé';
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

    // ── 4. NOUVELLE CONNEXION ─────────────────────────────────
    } else if (type === 'NEW_LOGIN') {
      emailSubject = '🔐 Nouvelle connexion détectée sur ton compte LevelUp';
      const loginIp = ip || 'Inconnue';
      const loginCity = city || '—';
      const loginCountry = country || '—';
      const loginDevice = device ? device.substring(0, 120) : 'Inconnu';
      const loginDate = date || new Date().toLocaleString('fr-FR');
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #78350f;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:16px">Level<span style="color:#f97316">Up</span></div>
            <h1 class="title-mobile fluid-text" style="font-size:24px;font-weight:800;margin:0 0 12px;color:#fff">Nouvelle connexion détectée</h1>
            <p class="fluid-text" style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 28px;max-width:90%">Bonjour <strong style="color:#fff">${displayName}</strong>, une connexion à ton compte LevelUp a été détectée.</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-radius:16px;margin-bottom:28px;width:100%;border:1px solid rgba(249,115,22,.15)">
              <tr><td align="left" style="padding:22px 20px">
                <h3 style="font-size:11px;color:#f97316;text-transform:uppercase;font-weight:800;letter-spacing:1px;margin:0 0 16px">Détails de la connexion</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;color:#71717a;font-weight:600">Adresse IP</span></td><td align="right"><span style="font-size:12px;color:#d4d4d8;font-family:monospace">${loginIp}</span></td></tr>
                  <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;color:#71717a;font-weight:600">Localisation</span></td><td align="right"><span style="font-size:12px;color:#d4d4d8">${loginCity}, ${loginCountry}</span></td></tr>
                  <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;color:#71717a;font-weight:600">Date &amp; heure</span></td><td align="right"><span style="font-size:12px;color:#d4d4d8">${loginDate}</span></td></tr>
                  <tr><td colspan="2" style="padding:10px 0 0"><span style="font-size:11px;color:#52525b;word-break:break-all">Appareil : ${loginDevice}</span></td></tr>
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
      emailSubject = `🔧 ${toolCount > 1 ? toolCount + ' nouveaux outils disponibles' : 'Un nouvel outil disponible'} sur LevelUp !`;
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #14532d;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:16px">Level<span style="color:#22c55e">Up</span></div>
            <h1 class="title-mobile fluid-text" style="font-size:24px;font-weight:800;margin:0 0 12px;color:#fff">${toolCount > 1 ? toolCount + ' nouveaux outils' : 'Un nouvel outil'} disponible${toolCount > 1 ? 's' : ''} !</h1>
            <p class="fluid-text" style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 28px;max-width:90%">Bonjour <strong style="color:#fff">${displayName}</strong>, l'équipe LevelUp vient d'ajouter ${toolCount > 1 ? 'de nouveaux outils' : 'un nouvel outil'} à ton écosystème.</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-radius:16px;margin-bottom:28px;width:100%;border:1px solid rgba(34,197,94,.12)">
              <tr><td align="left" style="padding:22px 20px">
                <h3 style="font-size:11px;color:#22c55e;text-transform:uppercase;font-weight:800;letter-spacing:1px;margin:0 0 14px">${toolCount > 1 ? 'Nouveaux outils ajoutés' : 'Nouvel outil ajouté'}</h3>
                ${toolNames.split(',').map(t => `<p class="fluid-text" style="font-size:14px;color:#d4d4d8;margin:0 0 8px;line-height:1.4">🔧 <strong>${t.trim()}</strong></p>`).join('')}
              </td></tr>
            </table>
            <a href="https://levelup-ecosystem.com" class="btn-mobile" style="display:inline-block;background-color:#22c55e;color:#000;text-decoration:none;padding:18px 40px;border-radius:50px;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;border:1px solid #16a34a">Découvrir les outils</a>
          </td></tr>
        </table>`;

    // ── 6. WATCH PARTY ────────────────────────────────────────
    } else if (type === 'WATCH_PARTY') {
      const wPartyCode   = partyCode   || '------';
      const wMovieTitle  = movieTitle  || 'Watch Party';
      const wInviterName = inviterName || displayName;
      emailSubject = `🎬 ${wInviterName} t'invite à regarder ${wMovieTitle} ensemble !`;
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #1e3a5f;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:16px">Level<span style="color:#3b82f6">Up</span></div>
            <div style="width:60px;height:60px;border-radius:18px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.25);display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px"><span style="font-size:28px">🎬</span></div>
            <h1 class="title-mobile fluid-text" style="font-size:24px;font-weight:800;margin:0 0 12px;color:#fff">Invitation Watch Party</h1>
            <p class="fluid-text" style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 24px;max-width:90%"><strong style="color:#fff">${wInviterName}</strong> t'invite à regarder <strong style="color:#fff">${wMovieTitle}</strong> ensemble sur LevelMovie !</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-radius:16px;margin-bottom:28px;width:100%;border:1px solid rgba(59,130,246,.2)">
              <tr><td align="center" style="padding:28px 20px">
                <p style="font-size:11px;color:#60a5fa;text-transform:uppercase;font-weight:800;letter-spacing:1px;margin:0 0 14px">Code d'accès Watch Party</p>
                <div style="background:#0f1929;border:1px solid rgba(59,130,246,.35);border-radius:14px;padding:22px 20px;font-family:monospace;font-size:2rem;font-weight:900;color:#3b82f6;letter-spacing:.15em">${wPartyCode}</div>
                <p style="font-size:12px;color:#52525b;margin:14px 0 0">Ce code est valable pour cette session uniquement.</p>
              </td></tr>
            </table>
            <a href="https://levelup-ecosystem.com" class="btn-mobile" style="display:inline-block;background-color:#3b82f6;color:#fff;text-decoration:none;padding:18px 40px;border-radius:50px;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;border:1px solid #60a5fa">Rejoindre la Watch Party</a>
            <p style="font-size:11px;color:#3f3f46;margin-top:24px">Si tu ne connais pas ${wInviterName}, ignore cet email.</p>
          </td></tr>
        </table>`;

    // ── 7. CLÉ UTILISATEUR ────────────────────────────────────
    } else if (type === 'USER_KEY') {
      const keyMasked = maskedKey  || 'LVL-•••••-•••••';
      const keyDate   = generatedAt || new Date().toLocaleString('fr-FR');
      emailSubject = '🔑 Votre clé personnelle LevelUp';
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #3b0764;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:16px">Level<span style="color:#a855f7">Up</span></div>
            <div style="width:60px;height:60px;border-radius:18px;background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.25);display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px"><span style="font-size:28px">🔑</span></div>
            <h1 class="title-mobile fluid-text" style="font-size:24px;font-weight:800;margin:0 0 12px;color:#fff">Votre clé personnelle LevelUp</h1>
            <p class="fluid-text" style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 24px;max-width:90%">Bonjour <strong style="color:#fff">${displayName}</strong>, votre clé a été générée le <strong style="color:#fff">${keyDate}</strong>.</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-radius:16px;margin-bottom:24px;width:100%;border:1px solid rgba(168,85,247,.2)">
              <tr><td align="center" style="padding:28px 20px">
                <p style="font-size:11px;color:#a855f7;text-transform:uppercase;font-weight:800;letter-spacing:1px;margin:0 0 14px">Votre clé (partiellement masquée)</p>
                <div style="background:#0a0a0f;border:1px solid rgba(168,85,247,.35);border-radius:14px;padding:20px;font-family:monospace;font-size:1rem;font-weight:800;color:#a855f7;letter-spacing:.06em;word-break:break-all">${keyMasked}</div>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:12px;margin-bottom:28px">
              <tr><td align="left" style="padding:14px 16px">
                <p class="fluid-text" style="font-size:13px;color:#fca5a5;margin:0;line-height:1.5">⚠️ <strong>Ne partagez jamais cette clé.</strong> Elle est strictement personnelle et liée à votre compte.</p>
              </td></tr>
            </table>
            <a href="https://levelup-ecosystem.com" class="btn-mobile" style="display:inline-block;background-color:#a855f7;color:#fff;text-decoration:none;padding:18px 40px;border-radius:50px;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;border:1px solid #c084fc">Accéder à LevelUp</a>
          </td></tr>
        </table>`;

    // ── 8. NOTIFICATION SDK ───────────────────────────────────
    } else if (type === 'SDK_NOTIFICATION') {
      const notifTitle   = title   || 'Notification LevelUp';
      const notifMessage = message || '';
      emailSubject = `🔔 ${notifTitle}`;
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111116;border-radius:24px;border:1px solid #713f12;box-shadow:0 20px 40px rgba(0,0,0,0.8);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:50px 30px">
            <div style="font-size:28px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:16px">Level<span style="color:#eab308">Up</span></div>
            <div style="width:60px;height:60px;border-radius:18px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.2);display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px"><span style="font-size:28px">🔔</span></div>
            <h1 class="title-mobile fluid-text" style="font-size:24px;font-weight:800;margin:0 0 12px;color:#fff">${notifTitle}</h1>
            <p class="fluid-text" style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 28px;max-width:90%">Bonjour <strong style="color:#fff">${displayName}</strong>, vous avez une nouvelle notification de LevelUp Ecosystem.</p>
            ${notifMessage ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a24;border-radius:16px;margin-bottom:28px;width:100%;border:1px solid rgba(234,179,8,.12)"><tr><td align="left" style="padding:22px 20px"><p class="fluid-text" style="font-size:14px;color:#d4d4d8;margin:0;line-height:1.7">${notifMessage}</p></td></tr></table>` : ''}
            <a href="https://levelup-ecosystem.com" class="btn-mobile" style="display:inline-block;background-color:#eab308;color:#000;text-decoration:none;padding:18px 40px;border-radius:50px;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;border:1px solid #facc15">Ouvrir LevelUp</a>
          </td></tr>
        </table>`;

    // ── 9. DOUBLE AUTHENTIFICATION (2FA) ──────────────────────
    } else if (type === 'TWO_FA') {
      if (!code) return res.status(400).json({ error: 'Le champ code est requis pour TWO_FA' });
      emailSubject = '🔐 Votre code de vérification LevelUp';
      const digits = String(code).split('');
      const digitBoxes = digits.map(d =>
        `<td align="center" style="padding:0 4px"><div style="width:46px;height:56px;background:#0f0f17;border:2px solid rgba(168,85,247,.45);border-radius:12px;font-family:'Courier New',monospace;font-size:1.7rem;font-weight:900;color:#a855f7;line-height:56px;text-align:center">${d}</div></td>`
      ).join('');
      contentHtml = `
        <table class="responsive-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#111116;border-radius:24px;border:1px solid rgba(168,85,247,.3);box-shadow:0 20px 60px rgba(168,85,247,.1),0 0 0 1px rgba(255,255,255,.03);overflow:hidden;margin:0 auto">
          <tr><td align="center" class="padding-mobile" style="padding:48px 30px">
            <div style="font-size:26px;font-weight:900;letter-spacing:1px;color:#fff;margin-bottom:28px">Level<span style="color:#a855f7">Up</span></div>
            <div style="width:68px;height:68px;border-radius:20px;background:linear-gradient(135deg,rgba(124,58,237,.2),rgba(168,85,247,.12));border:1px solid rgba(168,85,247,.35);display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;font-size:2rem">🔐</div>
            <h1 class="title-mobile fluid-text" style="font-size:22px;font-weight:800;margin:0 0 10px;color:#fff;letter-spacing:-.02em">Vérification en deux étapes</h1>
            <p class="fluid-text" style="font-size:14px;color:#71717a;line-height:1.65;margin:0 0 34px;max-width:86%">Bonjour <strong style="color:#d4d4d8">${displayName}</strong>, une nouvelle connexion a été détectée. Entrez ce code dans l'application pour confirmer votre identité.</p>
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 34px">
              <tr>${digitBoxes}</tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(168,85,247,.07),rgba(124,58,237,.05));border:1px solid rgba(168,85,247,.18);border-radius:14px;margin-bottom:24px">
              <tr><td align="center" style="padding:16px 20px">
                <p class="fluid-text" style="font-size:12px;color:#a1a1aa;margin:0;line-height:1.6">⏱️ Ce code est valable <strong style="color:#c4b5fd">10 minutes</strong>. Ne le partagez avec personne.</p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.12);border-radius:12px">
              <tr><td align="left" style="padding:14px 18px">
                <p class="fluid-text" style="font-size:12px;color:#fca5a5;margin:0;line-height:1.55">🚨 <strong>Pas vous ?</strong> Si vous n'avez pas tenté de connexion, ignorez cet email et sécurisez votre compte immédiatement.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>`;

    // ── 10. HTML CUSTOM ───────────────────────────────────────
    } else if (type === 'CUSTOM_HTML') {
      if (!subject || !html) return res.status(400).json({ error: 'subject et html requis pour CUSTOM_HTML' });
      emailSubject = subject;
      rawHtml = html;

    } else {
      return res.status(400).json({ error: 'Type inconnu. Types valides : WELCOME, SUSPENDED, DELETED, NEW_LOGIN, NEW_TOOL, WATCH_PARTY, USER_KEY, SDK_NOTIFICATION, TWO_FA, CUSTOM_HTML' });
    }

    const finalHtml = rawHtml || `<!DOCTYPE html>
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
        subject: emailSubject,
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
