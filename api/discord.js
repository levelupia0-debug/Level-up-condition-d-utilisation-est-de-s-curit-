const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://levelup-ecosystem.com';
const REDIRECT_URI = `${BASE_URL}/api/auth/discord`;

let _adminApp;
function getAdminApp() {
  if (_adminApp) return _adminApp;
  const admin = require('firebase-admin');
  if (admin.apps.length) {
    _adminApp = admin.apps[0];
    return _adminApp;
  }
  _adminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
  return _adminApp;
}

module.exports = async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/login?error=discord_denied');
  }

  if (!code) {
    if (!DISCORD_CLIENT_ID) {
      return res.status(500).send('DISCORD_CLIENT_ID not configured in Vercel environment variables.');
    }
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify email',
      prompt: 'none',
    });
    return res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  }

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('No access_token from Discord');

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();

    const uid = `discord_${discordUser.id}`;
    const admin = require('firebase-admin');
    const adminApp = getAdminApp();

    try {
      await admin.auth(adminApp).updateUser(uid, {
        displayName: discordUser.global_name || discordUser.username,
        email: discordUser.email || undefined,
        photoURL: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : undefined,
      });
    } catch {
      await admin.auth(adminApp).createUser({
        uid,
        displayName: discordUser.global_name || discordUser.username,
        email: discordUser.email || undefined,
        photoURL: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : undefined,
      });
    }

    const customToken = await admin.auth(adminApp).createCustomToken(uid, {
      provider: 'discord',
      discordId: discordUser.id,
      username: discordUser.username,
    });

    return res.redirect(`/login?customToken=${encodeURIComponent(customToken)}&provider=discord`);
  } catch (err) {
    console.error('Discord auth error:', err);
    return res.redirect('/login?error=discord_failed');
  }
};
