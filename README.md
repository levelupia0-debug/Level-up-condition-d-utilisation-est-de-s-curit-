<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>GHOST_V9_EXTREME</title>
    <style>
        :root {
            --term-green: #00ff41;
            --term-yellow: #ffdf00;
            --term-red: #ff3e3e;
            --term-bg: #050505;
            --insta-blue: #0095f6;
            --insta-border: #dbdbdb;
            --insta-grey: #737373;
        }

        body, html {
            margin: 0; padding: 0;
            background-color: var(--term-bg);
            font-family: 'Courier New', Courier, monospace;
            color: var(--term-green);
            height: 100%;
            overflow: hidden;
        }

        /* --- TERMINAL --- */
        #terminal-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 10px;
            box-sizing: border-box;
            overflow-y: hidden;
            position: relative;
        }

        #history {
            flex-grow: 1;
            overflow-y: hidden;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
        }

        .log-line { margin-bottom: 1px; line-height: 1.1; font-size: 10px; word-break: break-all; white-space: pre-wrap; }
        .red { color: var(--term-red); }
        .yellow { color: var(--term-yellow); }
        .green { color: var(--term-green); }
        
        .input-line { display: flex; align-items: center; margin-top: 5px; background: rgba(0,0,0,0.9); padding: 12px; border-top: 1px solid #222; }
        .prompt { margin-right: 8px; white-space: nowrap; color: var(--term-green); font-weight: bold; }
        
        #user-input {
            background: transparent;
            border: none;
            color: var(--term-green);
            font-family: inherit;
            font-size: 14px;
            outline: none;
            flex-grow: 1;
        }

        /* --- INSTAGRAM AUTHENTIC UI --- */
        #insta-ui {
            display: none;
            background-color: #fff;
            color: #000;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            flex-direction: column;
            align-items: center;
            z-index: 1000;
            overflow-y: auto;
        }

        .insta-card {
            width: 100%;
            max-width: 400px;
            padding: 40px 25px;
            box-sizing: border-box;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .profile-pic-container {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            margin: 10px 0 25px 0;
            overflow: hidden;
            background: #fafafa;
            border: 1px solid #efefef;
            cursor: pointer;
        }

        .profile-pic-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform-origin: center;
        }

        h2 { font-size: 24px; font-weight: 600; margin: 10px 0; letter-spacing: -0.5px; }
        .instr { font-size: 14px; color: var(--insta-grey); line-height: 18px; margin-bottom: 35px; padding: 0 15px; }

        .option-container {
            width: 100%;
            margin-bottom: 25px;
        }

        .masked-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px;
            border: 1px solid var(--insta-border);
            border-radius: 14px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: background 0.15s;
        }

        .masked-row:active { background: #f2f2f2; }

        .radio-circle {
            width: 24px;
            height: 24px;
            border: 2px solid var(--insta-border);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .radio-circle.selected { border-color: var(--insta-blue); }
        .radio-circle.selected::after {
            content: "";
            width: 14px;
            height: 14px;
            background: var(--insta-blue);
            border-radius: 50%;
        }

        .blue-btn {
            width: 100%;
            padding: 15px;
            background: var(--insta-blue);
            color: white; border: none; border-radius: 12px;
            font-weight: 700; cursor: pointer;
            font-size: 15px;
            margin-top: 10px;
        }

        .link-footer { color: var(--insta-blue); font-size: 14px; margin-top: 25px; cursor: pointer; font-weight: 600; }
        .divider { width: 100%; display: flex; align-items: center; margin: 35px 0; color: #8e8e8e; font-size: 13px; font-weight: 600; }
        .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: #dbdbdb; margin: 0 15px; }

        /* --- PHOTO ADJUSTER --- */
        #photo-adjuster {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: #000;
            z-index: 2000;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .crop-area {
            width: 320px;
            height: 320px;
            border-radius: 50%;
            border: 2px solid #fff;
            overflow: hidden;
            position: relative;
            touch-action: none;
        }

        .crop-area img {
            position: absolute;
            top: 0; left: 0;
            transform-origin: center;
            max-width: none;
        }

        .hidden { display: none; }
    </style>
</head>
<body>

    <div id="terminal-container">
        <div id="history">
            <div class="log-line green">GHOST_KERNEL_v9.0_EXTREME... ONLINE</div>
            <div class="log-line yellow">Waiting for data injection. [USER MAIL PHONE URL]</div>
        </div>
        <div class="input-line" id="input-area">
            <span class="prompt">root@ghost:~#</span>
            <input type="text" id="user-input" autofocus autocomplete="off" spellcheck="false">
        </div>
    </div>

    <div id="insta-ui">
        <div class="insta-card" id="recovery-page">
            <div class="profile-pic-container" onclick="openAdjuster()">
                <img id="insta-img" src="">
            </div>
            
            <h2 id="display-name">@username</h2>
            <p class="instr">Select where we should send a login link or security code to access your account.</p>
            
            <div class="option-container">
                <div class="masked-row" onclick="selectRadio(0)">
                    <span id="display-mail">Email</span>
                    <div class="radio-circle selected" id="rad-0"></div>
                </div>
                <div class="masked-row" onclick="selectRadio(1)">
                    <span id="display-phone">Phone</span>
                    <div class="radio-circle" id="rad-1"></div>
                </div>
            </div>

            <button class="blue-btn">Send Login Link</button>
            <div class="divider">OR</div>
            <div class="link-footer" onclick="showChangePass()">Can't reset your password?</div>
            <div class="link-footer" style="color:#000; margin-top:60px; font-weight: 500;">Back to login</div>
        </div>

        <div class="insta-card hidden" id="password-page">
             <div class="profile-pic-container">
                <img class="synced-img" src="">
            </div>
            <h2>Create a strong password</h2>
            <p class="instr">Your new password must be at least 6 characters and should include a combination of numbers, letters and special characters.</p>
            <input type="password" placeholder="New password" style="width:100%; padding:16px; margin-bottom:12px; border:1px solid #dbdbdb; border-radius:12px; outline: none; background: #fafafa; font-size:14px;">
            <input type="password" placeholder="Confirm new password" style="width:100%; padding:16px; margin-bottom:12px; border:1px solid #dbdbdb; border-radius:12px; outline: none; background: #fafafa; font-size:14px;">
            <button class="blue-btn" onclick="finishAll()">Reset Password</button>
        </div>

        <div class="insta-card hidden" id="success-page">
            <div style="width:100px; height:100px; border:4px solid #4BB543; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:20px;">
                <span style="color:#4BB543; font-size:50px;">✓</span>
            </div>
            <h2>Password updated</h2>
            <p class="instr">The password for account <span class="synced-name" style="font-weight:bold"></span> has been successfully changed.</p>
            <button class="blue-btn" onclick="location.reload()">Back to Profile</button>
        </div>
    </div>

    <div id="photo-adjuster">
        <div class="crop-area" id="touch-zone">
            <img id="adjust-img" src="">
        </div>
        <div style="color:white; margin-top:40px; text-align:center; font-family: sans-serif;">
            <p style="font-weight:bold; margin-bottom:8px; font-size:18px;">ADJUST PHOTO</p>
            <p style="font-size:14px; opacity:0.6;">Pinch to zoom • Drag to move</p>
        </div>
        <button class="blue-btn" style="width:250px; margin-top:40px; background:#fff; color:#000; border-radius:30px; font-size:16px;" onclick="closeAdjuster()">APPLY</button>
    </div>

<script>
    let config = { user: "", mail: "", phone: "", img: "", x: 0, y: 0, scale: 1 };
    const userInput = document.getElementById('user-input');
    const history = document.getElementById('history');

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const val = userInput.value.trim();
            userInput.value = "";
            addLog(`<span class="prompt">root@ghost:~#</span> ${val}`);
            processCmd(val);
        }
    });

    function addLog(text, type = "") {
        const div = document.createElement('div');
        div.className = "log-line " + type;
        div.innerHTML = text;
        history.appendChild(div);
        // On garde un historique un peu plus large pour le défilement fluide
        if (history.children.length > 150) history.removeChild(history.firstChild);
    }

    function processCmd(inputStr) {
        if (inputStr.toLowerCase() === 'run') {
            startHackingSequence();
            return;
        }
        const parts = inputStr.split(/\s+/);
        parts.forEach(p => {
            if (p.includes('@')) config.mail = p;
            else if (p.startsWith('http')) config.img = p;
            else if (/^\d+$/.test(p)) config.phone = p;
            else if (p.length > 2) config.user = p;
        });
        addLog(`[OK] DATA_INJECTED: ${config.user || '...'}`, "yellow");
    }

    function selectRadio(idx) {
        document.getElementById('rad-0').classList.toggle('selected', idx === 0);
        document.getElementById('rad-1').classList.toggle('selected', idx === 1);
    }

    async function startHackingSequence() {
        document.getElementById('input-area').style.display = 'none';
        
        const complexLogs = [
            "root:x:0:0:root:/root:/bin/bash", 
            "00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|",
            "00000010  03 00 3e 00 01 00 00 00  b0 5e 00 00 00 00 00 00  |..>......^......|",
            "DECRYPTING_AES_GCM_AUTH_TAG: 0x9f 0x22 0xbb 0x4a 0x11 0x02 0x98 0xcc 0xaa 0x44 0x11 0x01",
            "iptables -A INPUT -s 192.168.1.0/24 -j DROP -m comment --comment 'Ghost Protocol Active'",
            "HTTP/1.1 200 OK | Content-Type: application/json | Server: nginx/1.24.0 (Ubuntu) | X-Frame-Options: DENY",
            "FETCHING_MEM_BLOCK: 0x" + Math.random().toString(16).substr(2, 12).toUpperCase() + " | DATA: f3 a2 b4 11 00 ff 22 98 1a cc 34 b1",
            "SHADOW_ENTRY_STOLEN: " + (config.user || "target") + ":$6$vT2$yG8x9.2A:18274:0:99999:7:::",
            "FORK_BOMB_PREVENTION: Releasing memory from subprocesses [" + Math.floor(Math.random()*9000) + ", " + Math.floor(Math.random()*9000) + "]",
            "TCP_DUMP: [20:56:44] SRC=172.217.16.206:443 DST=10.0.2.15:55204 LEN=1500 DF PROTO=TCP SEQ=4221 ACK=1231",
            "EXTRACTING_SQL_SCHEMA: users(id INT PRIMARY KEY, username VARCHAR(255), password_hash TEXT, salt VARCHAR(64), two_factor_secret VARCHAR(32))",
            "ANALYZING_PACKET_STREAM: SSL_STRIP_ACTIVE | MITM_PROXY_READY | INTERCEPTING_HANDSHAKE_V3",
            "import os, sys; if os.getuid() != 0: print('Sudo required'); sys.exit(1); os.system('rm -rf /var/log/apache2/*')",
            "OVERRIDING_DNS_RESOLUTION: instagram.com -> 127.0.0.1 (Ghost Proxy Relay Alpha-X)",
            "PAYLOAD_DELIVERY_CONFIRMED: /tmp/.ghost_service_hidden_init_systemd_unit_" + Math.random().toString(36).substr(2,5),
            "BRUTING_NONCE_VALUE: Attempt " + Math.floor(Math.random()*10000000) + "... NO_MATCH | RE-TRYING WITH NEW VECTOR",
            "REVERSING_BIN_LIBS: /lib/x86_64-linux-gnu/libc.so.6 | FOUND_EXPLOITABLE_OFFSET: 0x" + Math.random().toString(16).substr(2,5),
            "GHOST_SHELL_OPENED: Connection established from 192.168.1." + Math.floor(Math.random()*254),
            "CLEANING_SYSTEM_TRACKS: shred -u -z -n 3 /var/log/auth.log /var/log/syslog /var/log/secure",
            "Bypassing_CSRF_Token_V4_Protection... SUCCESS | INJECTING_SESSION_COOKIE: " + Math.random().toString(36).substr(2, 24),
            "Memory_Dump_Start: 0x00400000 | Segment: .text | Permission: r-x | Entropy: 7.94",
            "Kernel_Module_Load: ghost_net_filter.ko | Status: Registered | Hooking into netfilter_hooks",
            "Wiping_History: ~/.bash_history wiped | /var/log/lastlog cleared | /var/run/utmp sanitized",
            "AWS_EC2_EXPLOIT: SSRF metadata retrieval success | iam-role: ghost-admin-access",
            "EXPLOITING_JAVA_RMI: Deserialization attack payload sent to 10.12.0.44:1099",
            "HEURISTIC_SCAN: 0-day detected in libssl.so.1.1 | Injecting shellcode at offset +0x442",
            "DOCKER_ESCAPE: Container breakout via runc vulnerability (CVE-2019-5736) | ROOT_ACCESS_HOST",
            "DUMPING_KMS_KEYS: MasterKeyID=" + Math.random().toString(36).toUpperCase().substr(0,12),
            "NODE_JS_RECOVERY: Recovering process.env from leaked memory dump... Found API_KEY_PROD",
            "BYPASSING_2FA_TOTP: Clock drift attack synchronization... Offset: -45s | TOKEN_GENERATED"
        ];

        let linesCount = 0;
        const totalLines = 11000; // Plus de 10k lignes !
        
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                // On injecte par blocs de 30 pour la vitesse
                for(let j=0; j<30; j++) { 
                    const randTerm = complexLogs[Math.floor(Math.random() * complexLogs.length)];
                    const color = Math.random() > 0.94 ? "red" : (Math.random() > 0.85 ? "yellow" : "green");
                    addLog(`[${Date.now()}_${linesCount}] ${randTerm}`, color);
                    linesCount++;
                }

                if (linesCount >= totalLines) {
                    clearInterval(interval);
                    addLog("--- TOTAL_SYSTEM_RECON_COMPLETE ---", "yellow");
                    addLog("TAKEOVER_SUCCESSFUL: FINALIZING_REDIRECT", "green");
                    setTimeout(initInstagramUI, 800);
                }
            }, 5); // Intervalle très court pour un effet "torrent de code"
        });
    }

    function initInstagramUI() {
        document.getElementById('terminal-container').style.display = 'none';
        document.getElementById('insta-ui').style.display = 'flex';
        document.getElementById('display-name').innerText = config.user ? `@${config.user}` : "@username";
        document.getElementById('display-mail').innerText = maskMail(config.mail || "target@mail.com");
        document.getElementById('display-phone').innerText = maskPhone(config.phone || "00000000");
        document.getElementById('insta-img').src = config.img;
        document.getElementById('adjust-img').src = config.img;
        updatePhotos();
    }

    function maskMail(m) { let [n, d] = m.split('@'); return n[0] + "••••" + n.slice(-1) + "@" + d; }
    function maskPhone(p) { return "SMS to •••• •••• ••" + p.slice(-2); }

    let isDragging = false, startX, startY, initDist = null, initScale = 1;
    function updatePhotos() {
        const trans = `translate(${config.x}px, ${config.y}px) scale(${config.scale})`;
        document.getElementById('insta-img').style.transform = trans;
        document.getElementById('adjust-img').style.transform = trans;
        document.querySelectorAll('.synced-img').forEach(img => { 
            img.src = config.img; 
            img.style.transform = trans; 
        });
    }
    function openAdjuster() { document.getElementById('photo-adjuster').style.display = 'flex'; }
    function closeAdjuster() { document.getElementById('photo-adjuster').style.display = 'none'; updatePhotos(); }

    const zone = document.getElementById('touch-zone');
    const move = (e) => {
        const c = e.touches ? e.touches[0] : e;
        if (e.touches && e.touches.length === 2) {
            const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            if (!initDist) { initDist = d; initScale = config.scale; }
            config.scale = initScale * (d / initDist);
        } else if (isDragging) {
            config.x = c.clientX - startX;
            config.y = c.clientY - startY;
        }
        updatePhotos();
    };
    zone.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX - config.x; startY = e.clientY - config.y; });
    zone.addEventListener('touchstart', (e) => { 
        if(e.touches.length === 1) { isDragging = true; startX = e.touches[0].clientX - config.x; startY = e.touches[0].clientY - config.y; }
    });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', (e) => { if(e.target.closest('#touch-zone')) e.preventDefault(); move(e); }, {passive:false});
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('touchend', () => { isDragging = false; initDist = null; });

    function showChangePass() {
        document.getElementById('recovery-page').classList.add('hidden');
        document.getElementById('password-page').classList.remove('hidden');
        document.querySelector('.synced-name').innerText = config.user ? `@${config.user}` : "this account";
    }
    function finishAll() {
        document.getElementById('password-page').classList.add('hidden');
        document.getElementById('success-page').classList.remove('hidden');
    }
</script>
</body>
</html>
