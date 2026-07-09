import { useEffect } from 'react';

const CONFIG = {
  locationId: 'ycsIlNye8DF4OmblGPj6',
  agentId: '6a2c5bd995517e66beaeb3d9',
  apiEndpoint: 'https://services.leadconnectorhq.com/chat-widget/public/start-voice-ai-call/',
  livekitUrl: 'wss://retell-ai-4ihahnq7.livekit.cloud',
  // Jobbidder brand colors
  colorPrimary: '#7C3AED',
  colorLight: '#A855F7',
  colorDark: '#5B21B6',
};

// Prevent multiple initializations
let isJessicaInitialized = false;

export function JessicaWebCallWidget() {
  useEffect(() => {
    // Only initialize once
    if (isJessicaInitialized) return;
    isJessicaInitialized = true;

    // Load LiveKit SDK if not already loaded
    if (typeof (window as any).LivekitClient === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/livekit-client@1.15.4/dist/livekit-client.umd.min.js';
      script.defer = true;
      document.head.appendChild(script);
      script.onload = () => initJessicaWebCall();
      script.onerror = () => console.error('[Jessica] Failed to load LiveKit SDK');
    } else {
      initJessicaWebCall();
    }

    return () => {
      document.querySelectorAll('[data-jessica-audio]').forEach(el => el.remove());
    };
  }, []);

  return (
    <>
      {/* ── Desktop: floating orb (hidden on mobile) ── */}
      <div id="jessica-orb-desktop">
        <button id="jessica-orb-btn" aria-label="Talk to AI Proposal Agent">
          <div id="jessica-orb-spinner"></div>
          <svg id="jessica-orb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="8" y="4" width="8" height="16" rx="4" />
            <path d="M12 20v3m-4 0h8" />
            <circle cx="10" cy="10" r="1" fill="currentColor" />
            <circle cx="14" cy="10" r="1" fill="currentColor" />
          </svg>
          <div id="jessica-orb-dots">
            <span></span><span></span><span></span>
          </div>
        </button>
        <div id="jessica-orb-label">Talk to Jessica</div>
        <div id="jessica-orb-status"></div>
        <div id="jessica-orb-connected">
          <span id="jessica-orb-pulse"></span>
          <span>Connected</span>
        </div>
      </div>

      {/* ── Mobile: sticky full-width button (hidden on desktop) ── */}
      <div id="jessica-mobile-bar">
        <button id="jessica-mobile-btn" aria-label="Talk to AI Proposal Agent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <rect x="8" y="4" width="8" height="16" rx="4" />
            <path d="M12 20v3m-4 0h8" />
          </svg>
          <span id="jessica-mobile-text">🎙️ Talk to Jessica</span>
        </button>
        <div id="jessica-mobile-status"></div>
      </div>

      <style>{`
        /* ── Desktop orb ── */
        #jessica-orb-desktop {
          position: relative;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        #jessica-orb-btn {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, ${CONFIG.colorLight} 0%, ${CONFIG.colorPrimary} 55%, ${CONFIG.colorDark} 100%);
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow:
            inset 0 -16px 32px rgba(0,0,0,0.25),
            inset 0 16px 32px rgba(255,255,255,0.1),
            0 0 24px rgba(124,58,237,0.5),
            0 0 48px rgba(124,58,237,0.25),
            0 8px 24px rgba(0,0,0,0.4);
          transition: all 0.4s ease;
          animation: jessica-float 3s ease-in-out infinite;
          outline: none;
          overflow: hidden;
          padding: 0;
        }

        #jessica-orb-btn::before {
          content: '';
          position: absolute;
          top: 12%;
          left: 20%;
          width: 30%;
          height: 20%;
          background: rgba(255,255,255,0.25);
          border-radius: 50%;
          filter: blur(4px);
          pointer-events: none;
        }

        #jessica-orb-btn:hover {
          transform: scale(1.06) translateY(-4px);
          box-shadow:
            inset 0 -16px 32px rgba(0,0,0,0.3),
            inset 0 16px 32px rgba(255,255,255,0.15),
            0 0 32px rgba(124,58,237,0.7),
            0 0 64px rgba(124,58,237,0.35),
            0 12px 32px rgba(0,0,0,0.5);
        }

        #jessica-orb-btn.active {
          background: radial-gradient(circle at 35% 35%, #C084FC 0%, #9333EA 55%, #6D28D9 100%);
          animation: jessica-glow 2s ease-in-out infinite;
        }

        #jessica-orb-btn.loading #jessica-orb-spinner {
          opacity: 0.6;
        }

        #jessica-orb-icon {
          width: 38%;
          height: 38%;
          margin-top: -6px;
          transition: opacity 0.3s;
        }

        #jessica-orb-dots {
          display: flex;
          gap: 4px;
          align-items: center;
          position: absolute;
          bottom: 14px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        #jessica-orb-dots span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: white;
        }

        #jessica-orb-btn.active #jessica-orb-dots {
          opacity: 1;
        }

        #jessica-orb-btn.active #jessica-orb-dots span:nth-child(1) { animation: jessica-bounce 0.8s 0s infinite; }
        #jessica-orb-btn.active #jessica-orb-dots span:nth-child(2) { animation: jessica-bounce 0.8s 0.15s infinite; }
        #jessica-orb-btn.active #jessica-orb-dots span:nth-child(3) { animation: jessica-bounce 0.8s 0.3s infinite; }

        #jessica-orb-spinner {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: rgba(255,255,255,0.7);
          animation: jessica-spin 1s linear infinite;
          opacity: 0;
          transition: opacity 0.3s;
        }

        #jessica-orb-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        #jessica-orb-status {
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 16px;
          text-align: center;
          transition: opacity 0.3s;
        }

        #jessica-orb-connected {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(124,58,237,0.2);
          border: 1px solid rgba(124,58,237,0.5);
          color: #C084FC;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        #jessica-orb-connected.visible { opacity: 1; }

        #jessica-orb-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #A855F7;
          animation: jessica-pulse 2s infinite;
        }

        /* ── Mobile sticky bar ── */
        #jessica-mobile-bar {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9998;
          padding: 10px 16px 20px;
          background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.0) 100%);
          pointer-events: none;
        }

        #jessica-mobile-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 24px;
          background: linear-gradient(135deg, ${CONFIG.colorLight} 0%, ${CONFIG.colorPrimary} 50%, ${CONFIG.colorDark} 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 17px;
          font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          cursor: pointer;
          pointer-events: all;
          box-shadow:
            0 4px 20px rgba(124,58,237,0.5),
            0 2px 8px rgba(0,0,0,0.4);
          transition: all 0.3s ease;
          letter-spacing: 0.01em;
        }

        #jessica-mobile-btn:active {
          transform: scale(0.97);
          box-shadow: 0 2px 10px rgba(124,58,237,0.4);
        }

        #jessica-mobile-btn.active {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          box-shadow: 0 4px 20px rgba(239,68,68,0.5);
        }

        #jessica-mobile-status {
          text-align: center;
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 18px;
          margin-top: 6px;
          pointer-events: none;
        }

        /* ── Responsive: show orb on desktop, sticky bar on mobile ── */
        @media (max-width: 767px) {
          #jessica-orb-desktop {
            display: none !important;
          }
          #jessica-mobile-bar {
            display: block;
          }
        }

        @media (min-width: 768px) {
          #jessica-mobile-bar {
            display: none !important;
          }
        }

        /* ── Animations ── */
        @keyframes jessica-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes jessica-glow {
          0%, 100% {
            box-shadow:
              inset 0 -16px 32px rgba(0,0,0,0.3),
              0 0 32px rgba(124,58,237,0.6),
              0 0 64px rgba(124,58,237,0.3),
              0 8px 24px rgba(0,0,0,0.4);
          }
          50% {
            box-shadow:
              inset 0 -16px 32px rgba(0,0,0,0.3),
              0 0 48px rgba(168,85,247,0.8),
              0 0 96px rgba(168,85,247,0.4),
              0 8px 32px rgba(0,0,0,0.5);
          }
        }

        @keyframes jessica-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes jessica-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-4px); opacity: 1; }
        }

        @keyframes jessica-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </>
  );
}

/* ─── Call logic (runs after LiveKit loads) ─────────────────────────── */
function initJessicaWebCall() {
  const orbBtn = document.getElementById('jessica-orb-btn') as HTMLButtonElement | null;
  const orbStatus = document.getElementById('jessica-orb-status') as HTMLElement | null;
  const orbConnected = document.getElementById('jessica-orb-connected') as HTMLElement | null;
  const mobileBtn = document.getElementById('jessica-mobile-btn') as HTMLButtonElement | null;
  const mobileStatus = document.getElementById('jessica-mobile-status') as HTMLElement | null;
  const mobileText = document.getElementById('jessica-mobile-text') as HTMLElement | null;

  if (!orbBtn && !mobileBtn) return;

  let room: any = null;
  let isCallActive = false;

  function setStatus(msg: string) {
    if (orbStatus) orbStatus.textContent = msg;
    if (mobileStatus) mobileStatus.textContent = msg;
  }

  function setLoading(loading: boolean) {
    if (orbBtn) {
      orbBtn.disabled = loading;
      orbBtn.classList.toggle('loading', loading);
    }
    if (mobileBtn) mobileBtn.disabled = loading;
  }

  function setActive(active: boolean) {
    isCallActive = active;
    if (orbBtn) {
      orbBtn.classList.toggle('active', active);
      orbBtn.setAttribute('aria-label', active ? 'End call' : 'Talk to AI Proposal Agent');
    }
    if (orbConnected) orbConnected.classList.toggle('visible', active);
    if (mobileBtn) {
      mobileBtn.classList.toggle('active', active);
    }
    if (mobileText) {
      mobileText.textContent = active ? '🔴 End Call' : '🎙️ Talk to Jessica';
    }
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function generateMongoId() {
    return Math.floor(Date.now() / 1000).toString(16).padStart(8, '0') +
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  function generateContactId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  async function startCall() {
    setLoading(true);
    setStatus('Connecting...');

    try {
      const sessionId = generateUUID();
      const payload = {
        contactId: generateContactId(),
        callId: generateMongoId(),
        locationId: CONFIG.locationId,
        sessionId,
        sessionFingerprint: generateUUID(),
        eventData: {
          source: 'direct',
          referrer: document.referrer || '',
          keyword: '',
          adSource: '',
          url_params: {},
          page: { url: window.location.href, title: document.title },
          timestamp: Date.now(),
          campaign: '',
          contactSessionIds: { ids: [sessionId] },
          type: 'page-visit',
          pageVisitType: 'text-widget',
          domain: window.location.hostname,
          version: 'v3',
          parentId: '',
          parentName: '',
          fingerprint: null,
          documentURL: window.location.href,
        },
      };

      const res = await fetch(CONFIG.apiEndpoint + CONFIG.agentId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: '*/*' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (!data.accessToken) throw new Error('No access token returned');

      const LivekitClient = (window as any).LivekitClient;
      room = new LivekitClient.Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      room.on(LivekitClient.RoomEvent.TrackSubscribed, (track: any) => {
        if (track.kind === LivekitClient.Track.Kind.Audio) {
          const el = track.attach();
          el.setAttribute('data-jessica-audio', '1');
          document.body.appendChild(el);
        }
      });

      room.on(LivekitClient.RoomEvent.Disconnected, () => {
        if (isCallActive) endCall();
      });

      await room.connect(CONFIG.livekitUrl, data.accessToken);
      await room.localParticipant.setMicrophoneEnabled(true);

      setLoading(false);
      setActive(true);
      setStatus('');

    } catch (err: any) {
      console.error('[Jessica]', err);
      setStatus('Could not connect. Please try again.');
      setLoading(false);
      setTimeout(() => setStatus(''), 4000);
    }
  }

  async function endCall() {
    setLoading(true);
    try {
      if (room) { await room.disconnect(); room = null; }
      document.querySelectorAll('[data-jessica-audio]').forEach(el => el.remove());
    } catch (_) {}
    setActive(false);
    setLoading(false);
    setStatus('Call ended');
    setTimeout(() => setStatus(''), 3000);
  }

  function handleClick() {
    if (isCallActive) endCall(); else startCall();
  }

  // Remove any existing listeners first to prevent duplicates
  if (orbBtn) {
    const newOrbBtn = orbBtn.cloneNode(true) as HTMLButtonElement;
    orbBtn.parentNode?.replaceChild(newOrbBtn, orbBtn);
    newOrbBtn.addEventListener('click', handleClick);
  }
  if (mobileBtn) {
    const newMobileBtn = mobileBtn.cloneNode(true) as HTMLButtonElement;
    mobileBtn.parentNode?.replaceChild(newMobileBtn, mobileBtn);
    newMobileBtn.addEventListener('click', handleClick);
  }

  window.addEventListener('beforeunload', () => room?.disconnect());
}
