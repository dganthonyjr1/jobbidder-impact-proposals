export function JessicaWebCallWidget() {
  return (
    <>
      <div id="voiceai-jessica-widget" className="voiceai-orb-wrapper-enh">
        <button className="voiceai-orb-enh" aria-label="Voice AI Assistant">
          <div className="voiceai-spinner-orb"></div>
          <svg className="voiceai-orb-icon-enh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="8" y="4" width="8" height="16" rx="4" />
            <path d="M12 20v3m-4 0h8" />
            <circle cx="10" cy="10" r="1" fill="currentColor" />
            <circle cx="14" cy="10" r="1" fill="currentColor" />
          </svg>
          <div className="voiceai-orb-status-enh">
            <span className="voiceai-status-dot-enh"></span>
          </div>
        </button>
        
        <div className="voiceai-status-msg-orb"></div>
        
        <div className="voiceai-connection-orb">
          <div className="voiceai-connection-dot-orb"></div>
          <span className="voiceai-connection-text-orb">Connected</span>
        </div>
      </div>

      <style>{`
        #voiceai-jessica-widget {
          text-align: center;
        }

        #voiceai-jessica-widget .voiceai-orb-enh {
          position: relative;
          width: 104px;
          height: 104px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #11998edd 0%, #38ef7d 60%, #38ef7dcc 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          cursor: pointer;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 
            inset 0 -20px 40px #22c55e20,
            inset 0 20px 40px rgba(255, 255, 255, 0.08),
            0 0 20px #22c55e40,
            0 0 40px #22c55e20,
            0 0 60px #22c55e10,
            0 8px 20px rgba(0, 0, 0, 0.4);
          transition: all 0.5s ease;
          animation: voiceai-orb-float-enh 3s ease-in-out infinite;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 0;
          outline: none;
          overflow: hidden;
        }

        #voiceai-jessica-widget .voiceai-orb-enh::before {
          content: '';
          position: absolute;
          bottom: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          height: 8px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.4), transparent);
          border-radius: 50%;
          opacity: 0.6;
          animation: voiceai-shadow-float-enh 3s ease-in-out infinite;
          z-index: -1;
        }

        #voiceai-jessica-widget .voiceai-orb-icon-enh {
          width: 40%;
          height: 40%;
          margin-top: -8px;
        }

        #voiceai-jessica-widget .voiceai-orb-status-enh {
          position: absolute;
          bottom: 12px;
          display: flex;
          gap: 3px;
          align-items: center;
          justify-content: center;
        }

        #voiceai-jessica-widget .voiceai-status-dot-enh {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.6;
        }

        #voiceai-jessica-widget .voiceai-spinner-orb {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: currentColor;
          animation: voiceai-spin-orb 1s linear infinite;
          opacity: 0;
          transition: opacity 0.3s;
        }

        #voiceai-jessica-widget .voiceai-orb-enh.loading .voiceai-spinner-orb {
          opacity: 0.5;
        }

        #voiceai-jessica-widget .voiceai-orb-enh.active {
          background: radial-gradient(circle at 30% 30%, #059669dd 0%, #10b981 60%, #10b981cc 100%);
          animation: voiceai-orb-glow-enh 2s ease-in-out infinite;
        }

        #voiceai-jessica-widget .voiceai-orb-enh.active .voiceai-status-dot-enh {
          display: none;
        }

        #voiceai-jessica-widget .voiceai-orb-enh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        #voiceai-jessica-widget .voiceai-status-msg-orb {
          position: absolute;
          top: calc(104px + 20px);
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        #voiceai-jessica-widget .voiceai-status-msg-orb.visible {
          opacity: 1;
        }

        #voiceai-jessica-widget .voiceai-connection-orb {
          position: absolute;
          top: calc(104px + 50px);
          left: 50%;
          transform: translateX(-50%);
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: rgb(16, 185, 129);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        #voiceai-jessica-widget .voiceai-connection-orb.visible {
          opacity: 1;
        }

        #voiceai-jessica-widget .voiceai-connection-dot-orb {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: voiceai-pulse-dot-orb 2s infinite;
        }

        @keyframes voiceai-orb-float-enh {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes voiceai-shadow-float-enh {
          0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.3; transform: translateX(-50%) scale(0.85); }
        }

        @keyframes voiceai-orb-glow-enh {
          0%, 100% { 
            box-shadow: 
              inset 0 -20px 40px #22c55e30,
              inset 0 20px 40px rgba(255, 255, 255, 0.1),
              0 0 30px #22c55e60,
              0 0 60px #22c55e30,
              0 0 90px #22c55e15,
              0 10px 30px rgba(0, 0, 0, 0.5);
          }
          50% { 
            box-shadow: 
              inset 0 -20px 40px #22c55e40,
              inset 0 20px 40px rgba(255, 255, 255, 0.15),
              0 0 40px #22c55e80,
              0 0 80px #22c55e40,
              0 0 120px #22c55e20,
              0 10px 35px rgba(0, 0, 0, 0.6);
          }
        }

        @keyframes voiceai-spin-orb {
          to { transform: rotate(360deg); }
        }

        @keyframes voiceai-pulse-dot-orb {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes pulse-enh { 
          0%, 100% { opacity: 1; } 
          50% { opacity: 0.4; } 
        }
      `}</style>

      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          'use strict';
          
          if (typeof window.LivekitClient === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/livekit-client@1.15.4/dist/livekit-client.umd.min.js';
            script.defer = true;
            document.head.appendChild(script);
            script.onload = () => initJessicaWebCall();
            script.onerror = () => {
              console.error('Failed to load LiveKit SDK');
              showStatusOrb('SDK load failed', 'error');
            };
          } else {
            initJessicaWebCall();
          }
          
          function initJessicaWebCall() {
            const container = document.getElementById('voiceai-jessica-widget');
            if (!container) return;
            
            const CONFIG = {
              locationId: 'ycsIlNye8DF4OmblGPj6',
              agentId: '6a2c5bd995517e66beaeb3d9',
              apiEndpoint: 'https://services.leadconnectorhq.com/chat-widget/public/start-voice-ai-call/',
              livekitUrl: 'wss://retell-ai-4ihahnq7.livekit.cloud'
            };
            
            let room = null;
            let isCallActive = false;
            const callButton = container.querySelector('.voiceai-orb-enh');
            const statusContainer = container.querySelector('.voiceai-orb-status-enh');
            const statusMsg = container.querySelector('.voiceai-status-msg-orb');
            const connectionIndicator = container.querySelector('.voiceai-connection-orb');
            
            function generateUUID() {
              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
            }
            
            function generateMongoId() {
              const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
              const random = Array.from({length: 16}, () => 
                Math.floor(Math.random() * 16).toString(16)
              ).join('');
              return timestamp + random;
            }
            
            function generateContactId() {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
              let result = '';
              for (let i = 0; i < 20; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              return result;
            }
            
            function updateStatus(active) {
              if (active) {
                statusContainer.innerHTML = '<span style="width:5px;height:5px;border-radius:50%;background:currentColor;animation:pulse-enh 0.8s infinite"></span><span style="width:5px;height:5px;border-radius:50%;background:currentColor;animation:pulse-enh 0.8s 0.2s infinite"></span><span style="width:5px;height:5px;border-radius:50%;background:currentColor;animation:pulse-enh 0.8s 0.4s infinite"></span>';
              } else {
                statusContainer.innerHTML = '<span class="voiceai-status-dot-enh"></span>';
              }
            }
            
            function showStatusOrb(message, type) {
              statusMsg.textContent = message;
              statusMsg.classList.add('visible');
              if (type === 'error') {
                statusMsg.style.background = 'rgba(220, 38, 38, 0.9)';
              } else {
                statusMsg.style.background = 'rgba(0, 0, 0, 0.8)';
              }
              setTimeout(() => statusMsg.classList.remove('visible'), 3000);
            }
            
            async function startCall() {
              callButton.disabled = true;
              callButton.classList.add('loading');
              showStatusOrb('Initializing call...', '');
              
              try {
                const sessionId = generateUUID();
                const payload = {
                  contactId: generateContactId(),
                  callId: generateMongoId(),
                  locationId: CONFIG.locationId,
                  sessionId: sessionId,
                  sessionFingerprint: generateUUID(),
                  eventData: {
                    source: 'direct',
                    referrer: document.referrer || '',
                    keyword: '',
                    adSource: '',
                    url_params: {},
                    page: {
                      url: window.location.href,
                      title: document.title
                    },
                    timestamp: Date.now(),
                    campaign: '',
                    contactSessionIds: {
                      ids: [sessionId]
                    },
                    type: 'page-visit',
                    pageVisitType: 'text-widget',
                    domain: window.location.hostname,
                    version: 'v3',
                    parentId: '',
                    parentName: '',
                    fingerprint: null,
                    documentURL: window.location.href
                  }
                };
                
                const response = await fetch(CONFIG.apiEndpoint + CONFIG.agentId, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': '*/*'
                  },
                  body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                  throw new Error('API error: ' + response.status);
                }
                
                const data = await response.json();
                
                showStatusOrb('Connecting...', '');
                
                room = new window.LivekitClient.Room({
                  adaptiveStream: true,
                  dynacast: true,
                  audioCaptureDefaults: {
                    autoGainControl: true,
                    echoCancellation: true,
                    noiseSuppression: true
                  }
                });
                
                room.on(window.LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
                  if (track.kind === window.LivekitClient.Track.Kind.Audio) {
                    const audioElement = track.attach();
                    audioElement.setAttribute('data-voiceai-audio', 'voiceai-jessica-widget');
                    document.body.appendChild(audioElement);
                  }
                });
                
                room.on(window.LivekitClient.RoomEvent.Disconnected, () => {
                  if (isCallActive) {
                    endCall();
                  }
                });
                
                await room.connect(CONFIG.livekitUrl, data.accessToken);
                await room.localParticipant.setMicrophoneEnabled(true);
                
                isCallActive = true;
                callButton.classList.remove('loading');
                callButton.classList.add('active');
                callButton.setAttribute('aria-label', 'End call');
                updateStatus(true);
                callButton.disabled = false;
                connectionIndicator.classList.add('visible');
                showStatusOrb('Call connected', '');
                
              } catch (error) {
                console.error('Error starting call:', error);
                showStatusOrb('Call failed: ' + error.message, 'error');
                callButton.classList.remove('loading');
                callButton.disabled = false;
              }
            }
            
            async function endCall() {
              callButton.disabled = true;
              
              try {
                if (room) {
                  await room.disconnect();
                  room = null;
                }
                
                document.querySelectorAll('[data-voiceai-audio="voiceai-jessica-widget"]').forEach(el => el.remove());
                
                isCallActive = false;
                callButton.classList.remove('active');
                callButton.setAttribute('aria-label', 'Voice AI Assistant');
                updateStatus(false);
                callButton.disabled = false;
                connectionIndicator.classList.remove('visible');
                showStatusOrb('Call ended', '');
                
              } catch (error) {
                console.error('Error ending call:', error);
                callButton.disabled = false;
              }
            }
            
            callButton.addEventListener('click', () => {
              if (isCallActive) {
                endCall();
              } else {
                startCall();
              }
            });
            
            window.addEventListener('beforeunload', () => {
              if (room) {
                room.disconnect();
              }
            });
          }
        })();
      `}} />
    </>
  );
}
