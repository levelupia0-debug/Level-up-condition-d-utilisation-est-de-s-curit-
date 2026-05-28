const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://levelup-ecosystem.com';
const REDIRECT_URI = `${BASE_URL}/api/twitch`;
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
return res.redirect('/?error=twitch_denied');  }

  if (!code) {
    if (!TWITCH_CLIENT_ID) {
      return res.status(500).send('TWITCH_CLIENT_ID not configured in Vercel environment variables.');
    }
    const params = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'user:read:email',
      force_verify: 'false',
    });
    return res.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`);
  }

  try {
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('No access_token from Twitch');

    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });
    const userData = await userRes.json();
    const twitchUser = userData.data?.[0];
    if (!twitchUser) throw new Error('Could not fetch Twitch user');

    const uid = `twitch_${twitchUser.id}`;
    const admin = require('firebase-admin');
    const adminApp = getAdminApp();

    try {
      await admin.auth(adminApp).updateUser(uid, {
        displayName: twitchUser.display_name || twitchUser.login,
        email: twitchUser.email || undefined,
        photoURL: twitchUser.profile_image_url || undefined,
      });
    } catch {
      await admin.auth(adminApp).createUser({
        uid,
        displayName: twitchUser.display_name || twitchUser.login,
        email: twitchUser.email || undefined,
        photoURL: twitchUser.profile_image_url || undefined,
      });
    }

    const customToken = await admin.auth(adminApp).createCustomToken(uid, {
      provider: 'twitch',
      twitchId: twitchUser.id,
      login: twitchUser.login,
    });

  return res.redirect(`/?customToken=${encodeURIComponent(customToken)}&provider=twitch`);
 } catch (err) {
    console.error('Twitch auth error:', err);
    // On bloque la redirection et on affiche l'erreur Twitch en plein écran !
    return res.status(500).send("🚨 ERREUR FATALE TWITCH : " + err.message + " | Détails : " + err.stack);
  }
};
