/**
 * LevelUp SDK — v2.3
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
  let _emailApiUrl    = null;
  let _loginCbs       = [];
  let _logoutCbs      = [];
  let _popupEl        = null;
  let _assistantEl    = null;

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
      return {
        uid,
        name      : p.displayName || '',
        email     : p.email || '',
        photo     : p.photoURL || '',
        key       : k.apiKey || k.key || null,
        status    : p.status || 'active',
        country   : p.country || '',
        createdAt : p.createdAt || '',
        _exists   : pS.exists()
      };
    } catch (_) { return null; }
  }

  /* ── Upsert user profile (crée si absent) ───────────── */
  async function _upsertUserProfile(fbUser) {
    try {
      const profileRef = window.__lvlup_doc(_db, USERS_PATH, fbUser.uid, 'profile', 'data');
      const snap = await window.__lvlup_getDoc(profileRef);
      if (!snap.exists()) {
        await window.__lvlup_setDoc(profileRef, {
          displayName : fbUser.displayName || '',
          email       : fbUser.email || '',
          photoURL    : fbUser.photoURL || '',
          status      : 'active',
          createdAt   : new Date().toISOString(),
          lastLoginAt : new Date().toISOString()
        });
      } else {
        await window.__lvlup_updateDoc(profileRef, {
          lastLoginAt : new Date().toISOString()
        });
      }
    } catch (_) {}
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

  /* ── Login popup ─────────────────────────────────────── */
  function _openLoginPopup() {
    if (_popupEl) return;

    const style = Object.assign(document.createElement('style'), { id: '_lvl_sty' });
    style.textContent = `
      #_lvl_ov{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);animation:_lvlFi .25s ease}
      @keyframes _lvlFi{from{opacity:0}to{opacity:1}}
      #_lvl_box{position:relative;background:linear-gradient(145deg,#0d0d14 0%,#0a0a0f 100%);border:1px solid rgba(168,85,247,.3);border-radius:24px;padding:36px 28px 30px;max-width:370px;width:92%;text-align:center;box-shadow:0 0 0 1px rgba(168,85,247,.08),0 0 80px rgba(168,85,247,.18),0 40px 80px rgba(0,0,0,.9);animation:_lvlSi .35s cubic-bezier(.34,1.56,.64,1);overflow:hidden}
      @keyframes _lvlSi{from{transform:scale(.88) translateY(24px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
      #_lvl_glow1{position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:260px;height:260px;background:radial-gradient(circle,rgba(168,85,247,.22) 0%,transparent 70%);pointer-events:none;filter:blur(30px)}
      #_lvl_glow2{position:absolute;bottom:-80px;right:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(99,102,241,.14) 0%,transparent 70%);pointer-events:none;filter:blur(40px)}
      #_lvl_logo{width:58px;height:58px;margin:0 auto 16px;background:linear-gradient(145deg,rgba(168,85,247,.18),rgba(168,85,247,.08));border:1px solid rgba(168,85,247,.35);border-radius:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 24px rgba(168,85,247,.25);position:relative;z-index:1}
      #_lvl_brand{font:800 .7rem/1 system-ui,sans-serif;letter-spacing:.18em;color:rgba(168,85,247,.7);text-transform:uppercase;margin:0 0 10px;position:relative;z-index:1}
      #_lvl_box h3{color:#fff;font:800 1.25rem/1.2 system-ui,sans-serif;margin:0 0 8px;letter-spacing:-.02em;position:relative;z-index:1}
      #_lvl_box .sub{color:rgba(255,255,255,.38);font:400 .82rem/1.55 system-ui,sans-serif;margin:0 0 24px;position:relative;z-index:1}
      #_lvl_gbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:13px 20px;border-radius:14px;background:#fff;border:1px solid rgba(255,255,255,.9);color:#3c4043;font:600 .9rem system-ui,sans-serif;cursor:pointer;transition:all .22s;margin-bottom:14px;position:relative;z-index:1;box-shadow:0 4px 16px rgba(0,0,0,.3)}
      #_lvl_gbtn:hover{background:#f8f9fa;box-shadow:0 6px 22px rgba(0,0,0,.4);transform:translateY(-1px)}
      #_lvl_gbtn:active{transform:scale(.98)}
      #_lvl_gbtn:disabled{opacity:.5;cursor:not-allowed;transform:none}
      #_lvl_divider{display:flex;align-items:center;gap:10px;margin:0 0 14px;position:relative;z-index:1}
      #_lvl_divider span{color:rgba(255,255,255,.18);font:400 .72rem system-ui,sans-serif;white-space:nowrap}
      #_lvl_divider::before,#_lvl_divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}
      #_lvl_st{font:500 .8rem system-ui,sans-serif;color:#c084fc;min-height:20px;margin-bottom:4px;position:relative;z-index:1;animation:_lvlFi .2s ease}
      #_lvl_badges{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:16px;position:relative;z-index:1}
      #_lvl_badges span{font:400 .64rem system-ui,sans-serif;color:rgba(255,255,255,.2);display:flex;align-items:center;gap:4px}
      #_lvl_cl{background:none;border:none;color:rgba(255,255,255,.2);font:400 .76rem system-ui,sans-serif;cursor:pointer;padding:6px 12px;transition:color .2s;position:relative;z-index:1;border-radius:8px}
      #_lvl_cl:hover{color:rgba(255,255,255,.5)}
      #_lvl_footer{font:400 .6rem system-ui,sans-serif;color:rgba(255,255,255,.1);margin-top:14px;letter-spacing:.05em;position:relative;z-index:1}
      @keyframes _lvlSpin{to{transform:rotate(360deg)}}
      ._lvl_spin{display:inline-block;animation:_lvlSpin .8s linear infinite}
    `;
    document.head.appendChild(style);

    _popupEl = document.createElement('div');
    _popupEl.id = '_lvl_ov';
    _popupEl.innerHTML = `
      <div id="_lvl_box">
        <div id="_lvl_glow1"></div>
        <div id="_lvl_glow2"></div>

        <div id="_lvl_logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L14.6 8.26L21.5 9.27L16.75 13.97L17.97 20.82L12 17.77L6.03 20.82L7.25 13.97L2.5 9.27L9.4 8.26L12 2Z"
              fill="url(#_lvl_star_grad)" stroke="rgba(192,132,252,0.5)" stroke-width="0.6" stroke-linejoin="round"/>
            <defs>
              <radialGradient id="_lvl_star_grad" cx="50%" cy="30%" r="65%">
                <stop offset="0%" stop-color="#e879f9"/>
                <stop offset="55%" stop-color="#a855f7"/>
                <stop offset="100%" stop-color="#6d28d9"/>
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div id="_lvl_brand">LevelUp</div>
        <h3>Bienvenue</h3>
        <p class="sub">Connectez-vous pour accéder à toutes vos fonctionnalités LevelUp.</p>

        <button id="_lvl_gbtn" onclick="window.__lvlup_doLogin()">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuer avec Google
        </button>

        <div id="_lvl_st"></div>

        <div id="_lvl_badges">
          <span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="rgba(168,85,247,0.6)"/></svg>
            LevelUp Ecosystem
          </span>
          <span style="width:1px;height:10px;background:rgba(255,255,255,.1)"></span>
          <span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round"/></svg>
            Connexion sécurisée
          </span>
          <span style="width:1px;height:10px;background:rgba(255,255,255,.1)"></span>
          <span>
            <svg width="11" height="11" viewBox="0 0 48 48" fill="none"><path fill="#4285F4" d="M44 20H24v8h11.5c-1.1 5-5.4 8-11.5 8a13 13 0 0 1 0-26c3.1 0 5.8 1.1 8 2.8L38 7C34 3.5 29.3 1 24 1 11.3 1 1 11.3 1 24s10.3 23 23 23c12.7 0 22-9 22-22 0-1.4-.1-2.7-.4-4z"/></svg>
            Google OAuth
          </span>
        </div>

        <button id="_lvl_cl" onclick="window.__lvlup_closePopup()">Annuler</button>
        <div id="_lvl_footer">levelup-ecosystem.com · v2.3</div>
      </div>`;
    document.body.appendChild(_popupEl);
  }

  function _closeLoginPopup() {
    if (_popupEl) { _popupEl.remove(); _popupEl = null; }
    const s = document.getElementById('_lvl_sty');
    if (s) s.remove();
  }

  function _setStatus(msg, loading = false) {
    const el = document.getElementById('_lvl_st');
    if (!el) return;
    el.innerHTML = loading
      ? `<span class="_lvl_spin">◌</span> ${msg}`
      : msg;
  }

  function _setLoginBtn(enabled) {
    const b = document.getElementById('_lvl_gbtn');
    if (!b) return;
    b.disabled = !enabled;
  }

  window.__lvlup_doLogin = async function () {
    _setLoginBtn(false);
    try {
      _setStatus('Connexion en cours…', true);
      await window.__lvlup_signInWithPopup(_auth, new window.__lvlup_GoogleAuthProvider());
    } catch (e) {
      _setLoginBtn(true);
      if (e.code === 'auth/popup-closed-by-user') {
        _setStatus('');
      } else {
        _setStatus('Erreur de connexion. Réessayez.');
      }
    }
  };
  window.__lvlup_closePopup = () => _closeLoginPopup();

  /* ── Assistant iframe widget ─────────────────────────── */
  function _buildAssistantWidget() {
    if (_assistantEl) return;
    const style = document.createElement('style');
    style.id = '_lvl_ast_sty';
    style.textContent = `
      #_lvl_ast_btn{position:fixed;bottom:24px;right:24px;z-index:2147483646;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(168,85,247,.5);display:flex;align-items:center;justify-content:center;transition:all .25s;animation:_lvlAstPop .4s cubic-bezier(.34,1.56,.64,1)}
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
    btn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" fill="rgba(255,255,255,0.9)"/>
        <circle cx="9" cy="14" r="1.2" fill="#030303"/>
        <circle cx="15" cy="14" r="1.2" fill="#030303"/>
      </svg>
      <div id="_lvl_ast_notif"></div>`;
    btn.onclick = _toggleAssistant;

    const panel = document.createElement('div');
    panel.id = '_lvl_ast_panel';
    panel.innerHTML = `
      <div id="_lvl_ast_head">
        <div class="title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.6 8.26L21.5 9.27L16.75 13.97L17.97 20.82L12 17.77L6.03 20.82L7.25 13.97L2.5 9.27L9.4 8.26L12 2Z" fill="#a855f7"/>
          </svg>
          <span>LevelUp IA</span>
          <div class="dot"></div>
        </div>
        <button id="_lvl_ast_close" onclick="window.__lvlup_closeAssistant()" title="Fermer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
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
        /* 1. Crée le profil Firestore si absent (premier login ou nouveau chemin SDK) */
        await _upsertUserProfile(fbUser);

        /* 2. Charge le profil */
        const profile = await _loadUserProfile(fbUser.uid);

        /* 3. Vérifie que le compte n'est pas suspendu */
        if (profile && profile.status === 'suspended') {
          _currentUser = null;
          await window.__lvlup_signOut(_auth);
          return;
        }
        if (profile && profile.status === 'deleted') {
          _currentUser = null;
          await window.__lvlup_signOut(_auth);
          return;
        }

        /* 4. Construit l'objet utilisateur (profil Firestore ou fallback Firebase) */
        _currentUser = profile
          ? {
              uid       : profile.uid,
              name      : profile.name || fbUser.displayName || '',
              email     : profile.email || fbUser.email || '',
              photo     : profile.photo || fbUser.photoURL || '',
              key       : profile.key || null,
              status    : profile.status || 'active',
              country   : profile.country || '',
              createdAt : profile.createdAt || ''
            }
          : {
              uid       : fbUser.uid,
              name      : fbUser.displayName || '',
              email     : fbUser.email || '',
              photo     : fbUser.photoURL || '',
              key       : null,
              status    : 'active',
              country   : '',
              createdAt : ''
            };

        /* 5. Ferme le popup et notifie les callbacks */
        _closeLoginPopup();
        _loginCbs.forEach(cb => cb({
          uid       : _currentUser.uid,
          name      : _currentUser.name,
          email     : _currentUser.email,
          photo     : _currentUser.photo,
          country   : _currentUser.country,
          createdAt : _currentUser.createdAt
        }));

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
    getUser       : () => _currentUser
      ? { uid: _currentUser.uid, name: _currentUser.name, email: _currentUser.email, photo: _currentUser.photo, country: _currentUser.country, createdAt: _currentUser.createdAt }
      : null,
    openLogin     : () => { if (!_currentUser) _openLoginPopup(); },
    logout        : async () => { if (_auth) await window.__lvlup_signOut(_auth); },
    onLogin       : cb => {
      _loginCbs.push(cb);
      if (_currentUser) cb({ uid: _currentUser.uid, name: _currentUser.name, email: _currentUser.email, photo: _currentUser.photo });
    },
    onLogout      : cb => { _logoutCbs.push(cb); },
    openDashboard : () => window.open(ECOSYSTEM_URL, '_blank'),

    /* SCOPES */
    hasScope  : scope => _hasScope(scope),
    getScopes : () => (_keyData?.scopes || []),

    /* USER KEY */
    getKey            : () => _currentUser?.key ? '••••••••••••' + _currentUser.key.slice(-6) : null,
    generateUserKey   : async () => {
      _requireScope(S.KEYGEN);
      if (!_currentUser) throw new Error('[LevelUp SDK] Utilisateur non connecté.');
      await _createUserKey();
      return '✅ Clé générée et envoyée par email à ' + _currentUser.email;
    },
    regenerateUserKey : async () => {
      _requireScope(S.KEYGEN);
      if (!_currentUser) throw new Error('[LevelUp SDK] Utilisateur non connecté.');
      await _createUserKey();
      return '✅ Clé régénérée et envoyée par email à ' + _currentUser.email;
    },

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
    getSdkInfo : () => _keyData
      ? { name: _keyData.name, scopes: _keyData.scopes, active: _keyData.active }
      : null
  };

  /* ── Boot ─────────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
  else _init();

})();
