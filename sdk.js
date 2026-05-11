/**
 * LevelUp SDK — v2.2
 * Auth · Email (via API Vercel) · Watch Party · Clés utilisateur · Scopes · Assistant IA
 * Usage: <script src="sdk.js" data-levelup-key="VOTRE_CLE_SDK"></script>
 */
(function () {
  'use strict';

  const FIREBASE_CONFIG = {
    apiKey            : "AIzaSyA3JgvNu5p-43037jvm4WRDaJHI9ES7uGM",
    authDomain        : "levelup-ecosystem.com",
    projectId         : "levelup-ia",
    storageBucket     : "levelup-ia.firebasestorage.app",
    messagingSenderId : "229420004282",
    appId             : "1:229420004282:web:6735f059a947f0936ae383"
  };

  const ECOSYSTEM_URL   = 'https://levelup-ecosystem.com';
  const ASSISTANT_URL   = 'https://levelupia0-debug.github.io/levelup-assistant/';
  const SDK_KEYS_PATH   = 'artifacts/level-ia-premium/sdk_keys';
  const USERS_PATH      = 'artifacts/level-ia-premium/users';
  const CONFIG_PATH     = 'artifacts/level-ia-premium/config';

  /* ── State ─────────────────────────────────────────── */
  let _db             = null;
  let _auth           = null;
  let _currentUser    = null;
  let _sdkKey         = null;
  let _keyData        = null;
  let _emailApiUrl    = null;   // URL de l'endpoint Vercel email
  let _loginCbs       = [];
  let _logoutCbs      = [];
  let _popupEl        = null;
  let _assistantEl    = null;
  let _turnstileToken = null;
  let _turnstileWid   = null;

  /* ── Scopes ─────────────────────────────────────────── */
  const S = {
    AUTH          : 'auth',
    EMAIL_SEND    : 'email.send',
    EMAIL_INVITE  : 'email.invite',
    USER_READ     : 'user.read',
    USER_WRITE    : 'user.write',
    WATCHPARTY    : 'watchparty',
    KEYGEN        : 'keygen',
    NOTIFICATIONS : 'notifications'
  };

  function _hasScope(scope) {
    if (!_keyData) return false;
    const sc = _keyData.scopes || ['auth'];
    return sc.includes('*') || sc.includes(scope);
  }

  function _requireScope(scope) {
    if (!_hasScope(scope)) {
      const m = `[LevelUp SDK] Permission refusée — scope "${scope}" non autorisé pour cette clé.`;
      console.warn(m); throw new Error(m);
    }
  }

  /* ── Firebase ───────────────────────────────────────── */
  function _loadFirebase() {
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.type = 'module';
      s.textContent = `
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
        import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut }
          from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
        import { getFirestore, doc, getDoc, setDoc, updateDoc, increment }
          from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
        const app = initializeApp(${JSON.stringify(FIREBASE_CONFIG)}, 'levelup-sdk');
        const auth = getAuth(app);
        const db   = getFirestore(app);
        window.__lvlup_db                 = db;
        window.__lvlup_auth               = auth;
        window.__lvlup_getDoc             = getDoc;
        window.__lvlup_setDoc             = setDoc;
        window.__lvlup_doc                = doc;
        window.__lvlup_updateDoc          = updateDoc;
        window.__lvlup_increment          = increment;
        window.__lvlup_GoogleAuthProvider = GoogleAuthProvider;
        window.__lvlup_signInWithPopup    = signInWithPopup;
        window.__lvlup_signOut            = signOut;
        window.__lvlup_onAuthStateChanged = onAuthStateChanged;
        window.__lvlup_ready = true;
      `;
      document.head.appendChild(s);
      const t = setInterval(() => {
        if (window.__lvlup_ready) {
          clearInterval(t);
          _db = window.__lvlup_db; _auth = window.__lvlup_auth;
          resolve();
        }
      }, 80);
    });
  }

  /* ── Key validation ─────────────────────────────────── */
  async function _validateKey(key) {
    try {
      const snap = await window.__lvlup_getDoc(window.__lvlup_doc(_db, SDK_KEYS_PATH, key));
      if (!snap.exists()) return { valid: false, reason: 'Clé SDK introuvable.' };
      const d = snap.data();
      if (!d.active) return { valid: false, reason: 'Clé SDK désactivée.' };
      const origin = window.location.hostname;
      const doms   = d.allowedDomains || [];
      if (!doms.includes('*') && !doms.includes(origin))
        return { valid: false, reason: `Domaine non autorisé : ${origin}` };
      const today = new Date().toISOString().slice(0, 10);
      if (d.dailyLimit > 0 && d.lastUsedDate === today && (d.usageToday || 0) >= d.dailyLimit)
        return { valid: false, reason: 'Limite journalière atteinte.' };
      const upd = { totalUsage: window.__lvlup_increment(1), lastUsedAt: new Date().toISOString() };
      if (d.lastUsedDate !== today) { upd.usageToday = 1; upd.lastUsedDate = today; }
      else upd.usageToday = window.__lvlup_increment(1);
      await window.__lvlup_updateDoc(window.__lvlup_doc(_db, SDK_KEYS_PATH, key), upd);
      return { valid: true, data: d };
    } catch (_) { return { valid: false, reason: 'Erreur réseau.' }; }
  }

  /* ── Email API (Vercel endpoint) ────────────────────── */
  async function _loadEmailApiCfg() {
    try {
      const snap = await window.__lvlup_getDoc(window.__lvlup_doc(_db, CONFIG_PATH, 'email_api'));
      if (snap.exists()) _emailApiUrl = snap.data().endpointUrl || null;
    } catch (_) {}
  }

  async function _callEmailAPI(body) {
    if (!_emailApiUrl)
      throw new Error('[LevelUp SDK] Endpoint email non configuré. Allez dans le panel admin → onglet Email.');
    const res = await fetch(_emailApiUrl, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error('[LevelUp SDK] Email API error: ' + (err.error || res.status));
    }
    return res.json();
  }

  /* ── User profile ───────────────────────────────────── */
  async function _loadUserProfile(uid) {
    try {
      const [pS, kS] = await Promise.all([
        window.__lvlup_getDoc(window.__lvlup_doc(_db, USERS_PATH, uid, 'profile', 'data')),
        window.__lvlup_getDoc(window.__lvlup_doc(_db, USERS_PATH, uid, 'security', 'key'))
      ]);
      const p = pS.exists() ? pS.data() : {};
      const k = kS.exists() ? kS.data() : {};
      return { uid, name: p.displayName || '', email: p.email || '', photo: p.photoURL || '',
               key: k.apiKey || k.key || null, status: p.status || 'active', country: p.country || '', createdAt: p.createdAt || '' };
    } catch (_) { return null; }
  }

  /* ── User key generation ────────────────────────────── */
  function _newKey(prefix = 'lvluser_') {
    const c = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let k = prefix;
    for (let i = 0; i < 32; i++) k += c[Math.floor(Math.random() * c.length)];
    return k;
  }

  async function _createUserKey() {
    if (!_currentUser) throw new Error('[LevelUp SDK] Utilisateur non connecté.');
    const key = _newKey();
    const generatedAt = new Date().toISOString();
    await window.__lvlup_setDoc(
      window.__lvlup_doc(_db, USERS_PATH, _currentUser.uid, 'security', 'key'),
      { apiKey: key, generatedAt, ownerUid: _currentUser.uid, ownerEmail: _currentUser.email }
    );
    _currentUser.key = key;
    if (_emailApiUrl && _currentUser.email) {
      try {
        const masked = key.slice(0, 8) + '••••••••••••••••••••' + key.slice(-6);
        await _callEmailAPI({
          email       : _currentUser.email,
          type        : 'USER_KEY',
          name        : _currentUser.name || _currentUser.email,
          maskedKey   : masked,
          generatedAt : new Date(generatedAt).toLocaleString('fr-FR')
        });
      } catch (_) { /* email failure doesn't block key gen */ }
    }
    return key;
  }

  /* ── Cloudflare Turnstile ───────────────────────────── */
  const TURNSTILE_SITEKEY = '0x4AAAAAADMY4-j7dozqyHdf';

  function _loadTurnstile() {
    if (document.getElementById('_lvl_ts_script')) return;
    const s = Object.assign(document.createElement('script'), {
      id: '_lvl_ts_script',
      src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
      async: true, defer: true
    });
    document.head.appendChild(s);
  }

  function _renderTurnstile() {
    const box = document.getElementById('_lvl_ts_box');
    if (!box || _turnstileWid !== null) return;
    if (!window.turnstile) { setTimeout(_renderTurnstile, 300); return; }
    _turnstileToken = null;
    _turnstileWid = window.turnstile.render(box, {
      sitekey            : TURNSTILE_SITEKEY, theme: 'dark', size: 'flexible',
      callback           : t  => { _turnstileToken = t; _setLoginBtn(true); },
      'expired-callback' : () => { _turnstileToken = null; _setLoginBtn(false); },
      'error-callback'   : () => { _turnstileToken = '__bypass__'; _setLoginBtn(true); }
    });
  }

  function _setLoginBtn(on) {
    const b = document.getElementById('_lvl_gbtn');
    if (!b) return;
    b.disabled = !on; b.style.opacity = on ? '1' : '0.5'; b.style.cursor = on ? 'pointer' : 'not-allowed';
  }

  /* ── Login popup ─────────────────────────────────────── */
  function _openLoginPopup() {
    if (_popupEl) return;
    _loadTurnstile();
    _turnstileWid = null; _turnstileToken = null;

    const style = Object.assign(document.createElement('style'), { id: '_lvl_sty' });
    style.textContent = `
      #_lvl_ov{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:_lvlFi .22s ease}
      @keyframes _lvlFi{from{opacity:0}to{opacity:1}}
      #_lvl_box{background:#0a0a0f;border:1px solid rgba(168,85,247,.28);border-radius:22px;padding:34px 28px 28px;max-width:375px;width:92%;text-align:center;box-shadow:0 0 80px rgba(168,85,247,.13),0 32px 64px rgba(0,0,0,.85);animation:_lvlSi .3s cubic-bezier(.34,1.56,.64,1)}
      @keyframes _lvlSi{from{transform:scale(.88) translateY(22px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
      #_lvl_logo{width:50px;height:50px;margin:0 auto 18px;background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.32);border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:24px}
      #_lvl_box h3{color:#fff;font:800 1.15rem/1.2 system-ui,sans-serif;margin:0 0 6px;letter-spacing:-.02em}
      #_lvl_box p{color:rgba(255,255,255,.42);font:400 .82rem/1.5 system-ui,sans-serif;margin:0 0 18px}
      #_lvl_ts_box{margin:0 auto 14px;display:flex;justify-content:center}
      #_lvl_gbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 20px;border-radius:12px;background:#fff;border:1px solid #dadce0;color:#3c4043;font:600 .9rem system-ui,sans-serif;cursor:not-allowed;transition:all .2s;margin-bottom:10px;opacity:.5}
      #_lvl_gbtn:not(:disabled):hover{background:#f8f9fa;box-shadow:0 2px 10px rgba(0,0,0,.18)}
      #_lvl_st{font:400 .78rem system-ui,sans-serif;color:#a855f7;margin-top:8px;min-height:18px}
      #_lvl_sec{display:flex;align-items:center;justify-content:center;gap:5px;font:400 .67rem system-ui,sans-serif;color:rgba(255,255,255,.18);margin-top:10px}
      #_lvl_cl{background:none;border:none;color:rgba(255,255,255,.22);font:400 .77rem system-ui,sans-serif;cursor:pointer;margin-top:6px;padding:6px;transition:color .2s}
      #_lvl_cl:hover{color:rgba(255,255,255,.5)}
    `;
    document.head.appendChild(style);

    _popupEl = document.createElement('div');
    _popupEl.id = '_lvl_ov';
    _popupEl.innerHTML = `
      <div id="_lvl_box">
        <div id=""_lvl_logo">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L14.85 8.77L22 9.27L17 13.64L18.54 20.64L12 17L5.46 20.64L7 13.64L2 9.27L9.15 8.77L12 2Z" fill="url(#lg)" stroke="#c084fc" stroke-width="0.5"/>
    <defs><radialGradient id="lg" cx="50%" cy="35%" r="60%"><stop offset="0%" stop-color="#e879f9"/><stop offset="100%" stop-color="#7c3aed"/></radialGradient></defs>
  </svg>
</div>
        <h3>Connexion LevelUp</h3>
        <p>Connectez-vous pour accéder à toutes vos fonctionnalités.</p>
        <div id="_lvl_ts_box"></div>
        <button id="_lvl_gbtn" disabled onclick="window.__lvlup_doLogin()">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuer avec Google
        </button>
        <div id="_lvl_st"></div>
        <div id="_lvl_sec">🔒 Protégé par Cloudflare Turnstile</div>
        <button id="_lvl_cl" onclick="window.__lvlup_closePopup()">Annuler</button>
      </div>`;
    document.body.appendChild(_popupEl);
    setTimeout(_renderTurnstile, 200);
  }

  function _closeLoginPopup() {
    if (_popupEl) { _popupEl.remove(); _popupEl = null; }
    const s = document.getElementById('_lvl_sty');
    if (s) s.remove();
  }

  function _setStatus(msg) {
    const el = document.getElementById('_lvl_st');
    if (el) el.textContent = msg;
  }

  window.__lvlup_doLogin = async function () {
    if (!_turnstileToken) { _setStatus('Complétez la vérification de sécurité.'); return; }
    try { _setStatus('Connexion en cours...'); await window.__lvlup_signInWithPopup(_auth, new window.__lvlup_GoogleAuthProvider()); }
    catch (_) { _setStatus('Erreur de connexion. Réessayez.'); }
  };
  window.__lvlup_closePopup = () => _closeLoginPopup();

  /* ── Assistant iframe widget ─────────────────────────── */
  function _buildAssistantWidget() {
    if (_assistantEl) return;
    const style = document.createElement('style');
    style.id = '_lvl_ast_sty';
    style.textContent = `
      #_lvl_ast_btn{position:fixed;bottom:24px;right:24px;z-index:2147483646;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(168,85,247,.5);display:flex;align-items:center;justify-content:center;font-size:22px;transition:all .25s;animation:_lvlAstPop .4s cubic-bezier(.34,1.56,.64,1)}
      @keyframes _lvlAstPop{from{transform:scale(0) rotate(-90deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
      #_lvl_ast_btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(168,85,247,.7)}
      #_lvl_ast_btn:active{transform:scale(.95)}
      #_lvl_ast_notif{position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#22c55e;border-radius:50%;border:2px solid #030303;animation:_lvlPulse 2s infinite}
      @keyframes _lvlPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}70%{box-shadow:0 0 0 5px transparent}}
      #_lvl_ast_panel{position:fixed;bottom:88px;right:24px;z-index:2147483646;width:min(400px,calc(100vw - 48px));height:min(620px,calc(100vh - 120px));background:#0a0a0f;border:1px solid rgba(168,85,247,.25);border-radius:20px;box-shadow:0 0 60px rgba(168,85,247,.15),0 30px 60px rgba(0,0,0,.8);display:none;flex-direction:column;overflow:hidden;animation:_lvlAstSlide .3s cubic-bezier(.34,1.56,.64,1)}
      @keyframes _lvlAstSlide{from{transform:scale(.92) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
      #_lvl_ast_panel.open{display:flex}
      #_lvl_ast_head{background:rgba(168,85,247,.08);border-bottom:1px solid rgba(168,85,247,.15);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
      #_lvl_ast_head .title{display:flex;align-items:center;gap:9px;font:700 .9rem 'Inter',system-ui,sans-serif;color:#fff}
      #_lvl_ast_head .dot{width:7px;height:7px;background:#22c55e;border-radius:50%;animation:_lvlPulse 2s infinite}
      #_lvl_ast_close{background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;font-size:1rem;padding:4px;display:flex;align-items:center;transition:color .2s}
      #_lvl_ast_close:hover{color:rgba(255,255,255,.7)}
      #_lvl_ast_frame{flex:1;border:none;background:#030303}
      #_lvl_ast_foot{padding:8px 14px;border-top:1px solid rgba(255,255,255,.06);font:400 .67rem 'Inter',system-ui,sans-serif;color:rgba(255,255,255,.2);text-align:center;flex-shrink:0}
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = '_lvl_ast_btn';
    btn.title = 'Assistant LevelUp IA';
    btn.innerHTML = `<span>🤖</span><div id="_lvl_ast_notif"></div>`;
    btn.onclick = _toggleAssistant;

    const panel = document.createElement('div');
    panel.id = '_lvl_ast_panel';
    panel.innerHTML = `
      <div id="_lvl_ast_head">
        <div class="title">
          <span>⭐</span>
          <span>LevelUp IA</span>
          <div class="dot"></div>
        </div>
        <button id="_lvl_ast_close" onclick="window.__lvlup_closeAssistant()" title="Fermer">✕</button>
      </div>
      <iframe id="_lvl_ast_frame" src="" allow="microphone; camera" loading="lazy"></iframe>
      <div id="_lvl_ast_foot">Propulsé par LevelUp IA · <a href="${ECOSYSTEM_URL}" target="_blank" style="color:#a855f7;text-decoration:none">levelup-ecosystem.com</a></div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);
    _assistantEl = { btn, panel };
  }

  function _toggleAssistant() {
    if (!_assistantEl) _buildAssistantWidget();
    const panel = document.getElementById('_lvl_ast_panel');
    const frame = document.getElementById('_lvl_ast_frame');
    if (!panel) return;
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
    } else {
      if (!frame.src || frame.src === window.location.href) frame.src = ASSISTANT_URL;
      panel.classList.add('open');
    }
  }

  window.__lvlup_closeAssistant = function () {
    const panel = document.getElementById('_lvl_ast_panel');
    if (panel) panel.classList.remove('open');
  };

  /* ── Init ────────────────────────────────────────────── */
  async function _init() {
    const scriptEl = document.querySelector('script[data-levelup-key]');
    _sdkKey = scriptEl?.getAttribute('data-levelup-key');
    if (!_sdkKey) {
      console.warn('[LevelUp SDK] Clé manquante. Ajoutez data-levelup-key="..." sur votre balise <script>.');
      return;
    }

    await _loadFirebase();

    const res = await _validateKey(_sdkKey);
    if (!res.valid) { console.warn('[LevelUp SDK] Clé invalide :', res.reason); return; }
    _keyData = res.data;

    const needsEmail = [S.EMAIL_SEND, S.EMAIL_INVITE, S.WATCHPARTY, S.KEYGEN, S.NOTIFICATIONS].some(s => _hasScope(s));
    if (needsEmail) await _loadEmailApiCfg();

    window.__lvlup_onAuthStateChanged(_auth, async fbUser => {
      if (fbUser) {
        const profile = await _loadUserProfile(fbUser.uid);
        if (profile && profile.status !== 'suspended' && profile.status !== 'deleted') {
          _currentUser = profile;
          _closeLoginPopup();
          _loginCbs.forEach(cb => cb({ uid: profile.uid, name: profile.name, email: profile.email, photo: profile.photo, country: profile.country, createdAt: profile.createdAt }));
        } else {
          _currentUser = null;
          await window.__lvlup_signOut(_auth);
        }
      } else {
        const was = !!_currentUser;
        _currentUser = null;
        if (was) _logoutCbs.forEach(cb => cb());
      }
    });
  }

  /* ── Public API ──────────────────────────────────────── */
  window.LevelUp = {

    /* AUTH */
    isLoggedIn    : () => !!_currentUser,
    getUser       : () => _currentUser ? { uid: _currentUser.uid, name: _currentUser.name, email: _currentUser.email, photo: _currentUser.photo, country: _currentUser.country, createdAt: _currentUser.createdAt } : null,
    openLogin     : () => { if (!_currentUser) _openLoginPopup(); },
    logout        : async () => { if (_auth) await window.__lvlup_signOut(_auth); },
    onLogin       : cb => { _loginCbs.push(cb); if (_currentUser) cb({ uid: _currentUser.uid, name: _currentUser.name, email: _currentUser.email, photo: _currentUser.photo }); },
    onLogout      : cb => { _logoutCbs.push(cb); },
    openDashboard : () => window.open(ECOSYSTEM_URL, '_blank'),

    /* SCOPES */
    hasScope  : scope => _hasScope(scope),
    getScopes : () => (_keyData?.scopes || []),

    /* USER KEY — jamais exposée en clair dans getUser() */
    getKey            : () => _currentUser?.key ? '••••••••••••' + _currentUser.key.slice(-6) : null,
    generateUserKey   : async () => { _requireScope(S.KEYGEN); await _createUserKey(); return '✅ Clé générée et envoyée par email à ' + _currentUser.email; },
    regenerateUserKey : async () => { _requireScope(S.KEYGEN); await _createUserKey(); return '✅ Clé régénérée et envoyée par email à ' + _currentUser.email; },

    /* EMAIL (via API Vercel) */
    sendEmail : async (to, subject, html) => {
      _requireScope(S.EMAIL_SEND);
      if (!to || !subject || !html) throw new Error('[LevelUp SDK] to, subject et html requis.');
      return _callEmailAPI({ email: to, type: 'CUSTOM_HTML', subject, html });
    },

    /* WATCH PARTY INVITE */
    sendWatchPartyInvite : async ({ to, partyCode, movieTitle = 'Watch Party', inviterName } = {}) => {
      _requireScope(S.WATCHPARTY);
      if (!to || !partyCode) throw new Error('[LevelUp SDK] to et partyCode requis.');
      const name = inviterName || _currentUser?.name || 'Un ami LevelUp';
      return _callEmailAPI({ email: to, type: 'WATCH_PARTY', name, partyCode, movieTitle, inviterName: name });
    },

    /* NOTIFICATIONS */
    sendNotification : async ({ to, title, message } = {}) => {
      _requireScope(S.NOTIFICATIONS);
      if (!to || !title) throw new Error('[LevelUp SDK] to et title requis.');
      return _callEmailAPI({ email: to, type: 'SDK_NOTIFICATION', name: _currentUser?.name || '', title, message: message || '' });
    },

    /* ASSISTANT IA */
    openAssistant  : () => { _buildAssistantWidget(); _toggleAssistant(); },
    closeAssistant : () => window.__lvlup_closeAssistant(),

    /* SDK INFO */
    getSdkInfo : () => _keyData ? { name: _keyData.name, scopes: _keyData.scopes, active: _keyData.active } : null
  };

  /* ── Boot ─────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
  else _init();

})();
