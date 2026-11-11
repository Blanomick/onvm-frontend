import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import "./Calls.css";

const SERVER_URL = (
  process.env.REACT_APP_WEBSOCKET_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const CallsContext = createContext(null);

export function useCalls() {
  return useContext(CallsContext);
}

function MediaView({ stream, muted = false, video = false, className = "" }) {
  const ref = useRef(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const element = ref.current;
    let active = true;

    setBlocked(false);
    element.srcObject = stream || null;

    if (stream) {
      element.play().catch(() => {
        if (active) setBlocked(true);
      });
    }

    return () => {
      active = false;
      element.srcObject = null;
    };
  }, [stream]);

  async function play() {
    try {
      await ref.current.play();
      setBlocked(false);
    } catch {
      setBlocked(true);
    }
  }

  return (
    <>
      {video ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className={className}
        />
      ) : (
        <audio ref={ref} autoPlay />
      )}

      {blocked && (
        <button type="button" onClick={play}>
          Activer {video && muted ? "l’aperçu" : "le son"}
        </button>
      )}
    </>
  );
}

export function CallProvider({ currentUser, children }) {
  const actions = useRef({});
  const audioContextRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notice, setNotice] = useState("");
  const [call, setCall] = useState(null);

  async function enableSound() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      await audioContextRef.current.resume();
      setSoundEnabled(audioContextRef.current.state === "running");
    } catch {
      setNotice("Le navigateur bloque la sonnerie. Vérifie ses autorisations.");
    }
  }

  // Sonnerie synthétique, arrêtée dès que l’appel change d’état.
  useEffect(() => {
    const context = audioContextRef.current;

    if (
      !soundEnabled ||
      !context ||
      !["incoming", "ringing"].includes(call?.phase)
    ) {
      return;
    }

    const nodes = new Set();

    function ring() {
      if (context.state !== "running") return;

      const start = context.currentTime;

      [0, 0.45].forEach((offset) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.frequency.value = call.phase === "incoming" ? 660 : 440;
        gain.gain.setValueAtTime(0, start + offset);
        gain.gain.linearRampToValueAtTime(0.08, start + offset + 0.03);
        gain.gain.linearRampToValueAtTime(0, start + offset + 0.3);

        oscillator.connect(gain);
        gain.connect(context.destination);
        nodes.add(oscillator);

        oscillator.onended = () => {
          nodes.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };

        oscillator.start(start + offset);
        oscillator.stop(start + offset + 0.32);
      });
    }

    ring();
    const timer = setInterval(ring, 2200);

    return () => {
      clearInterval(timer);
      nodes.forEach((node) => {
        try {
          node.stop();
        } catch {
          // L’oscillateur est déjà arrêté.
        }
      });
    };
  }, [soundEnabled, call?.phase]);

  useEffect(() => {
    return () => {
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      setReady(false);
      setCall(null);
      actions.current = {};
      return;
    }

    let disposed = false;
    let active = null;

    const socket = io(`${SERVER_URL}/calls`, {
      transports: ["websocket", "polling"],
      auth: (callback) =>
        callback({ token: localStorage.getItem("token") }),
    });

    function update(item, patch) {
      if (disposed || active !== item) return;
      Object.assign(item, patch);
      setCall({ ...item });
    }

    function request(event, payload) {
      return new Promise((resolve, reject) => {
        socket.timeout(12000).emit(event, payload, (error, result) => {
          if (error) {
            reject(new Error("Le serveur ne répond pas."));
          } else if (!result?.ok) {
            reject(new Error(result?.error || "Appel impossible."));
          } else {
            resolve(result);
          }
        });
      });
    }

    function cleanup(message = "", notify = false, reason = "ended") {
      const item = active;
      active = null;

      if (item) {
        if (notify) {
          socket.emit("call:end", { callId: item.id, reason });
        }

        clearTimeout(item.disconnectTimer);

        if (item.pc) {
          item.pc.ontrack = null;
          item.pc.onicecandidate = null;
          item.pc.onconnectionstatechange = null;
          item.pc.close();
        }

        item.local?.getTracks().forEach((track) => track.stop());
        item.remote?.getTracks().forEach((track) => track.stop());
      }

      if (!disposed) {
        setCall(null);
        if (message) setNotice(message);
      }
    }

    function fail(item, error) {
      if (active !== item || disposed) return;

      const message =
        error.name === "NotAllowedError"
          ? "Autorise le microphone et la caméra pour cet appel."
          : error.message || "Connexion de l’appel impossible.";

      cleanup(message, true);
    }

    async function prepare(item) {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        throw new Error("Appels indisponibles : utilise HTTPS et un navigateur compatible.");
      }

      const config = await request("call:config", {});
      if (active !== item || disposed) return false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          item.type === "video"
            ? {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30, max: 30 },
                facingMode: "user",
              }
            : false,
      });

      // L’utilisateur a pu raccrocher pendant la demande d’autorisation.
      if (active !== item || disposed) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }

      const pc = new RTCPeerConnection({
        iceServers: config.iceServers,
      });

      item.pc = pc;
      item.local = stream;
      item.remote = new MediaStream();
      item.candidates = [];

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && active === item) {
          socket.emit("call:signal", {
            callId: item.id,
            candidate: candidate.toJSON(),
          });
        }
      };

      pc.ontrack = ({ track }) => {
        if (active !== item) return;

        if (!item.remote.getTrackById(track.id)) {
          item.remote.addTrack(track);
        }

        // Nouvelle instance pour actualiser les éléments audio/vidéo.
        update(item, { remote: new MediaStream(item.remote.getTracks()) });
      };

      pc.onconnectionstatechange = () => {
        if (active !== item) return;

        if (pc.connectionState === "connected") {
          clearTimeout(item.disconnectTimer);
          update(item, { phase: "connected" });
          socket.emit("call:connected", { callId: item.id });
        } else if (pc.connectionState === "failed") {
          cleanup("Connexion impossible. Vérifie le réseau et le serveur TURN.", true);
        } else if (pc.connectionState === "disconnected") {
          update(item, { phase: "reconnecting" });

          clearTimeout(item.disconnectTimer);
          item.disconnectTimer = setTimeout(() => {
            if (active === item) cleanup("La connexion a été interrompue.", true);
          }, 15000);
        }
      };

      update(item, {
        local: stream,
        remote: item.remote,
        microphone: true,
        camera: item.type === "video",
      });

      return true;
    }

    async function start(conversationId, type) {
      if (active) {
        setNotice("Termine l’appel actuel avant d’en démarrer un autre.");
        return;
      }

      if (!socket.connected) {
        setNotice("La connexion aux appels n’est pas encore disponible.");
        return;
      }

      if (!Number.isInteger(Number(conversationId))) {
        setNotice("Cette version gère les appels individuels.");
        return;
      }

      const item = {
        id:
          window.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        phase: "preparing",
        caller: true,
        peer: null,
      };

      active = item;
      setNotice("");
      setCall({ ...item });

      try {
        if (!(await prepare(item))) return;

        update(item, { phase: "ringing" });

        const result = await request("call:start", {
          callId: item.id,
          conversationId: Number(conversationId),
          type,
        });

        if (active !== item) {
          socket.emit("call:end", { callId: item.id });
          return;
        }

        update(item, { peer: result.peer });
      } catch (error) {
        fail(item, error);
      }
    }

    async function accept() {
      const item = active;
      if (!item || item.phase !== "incoming") return;

      update(item, { phase: "preparing" });

      try {
        if (!(await prepare(item))) return;

        update(item, { phase: "connecting" });
        await request("call:accept", { callId: item.id });
      } catch (error) {
        fail(item, error);
      }
    }

    async function accepted({ callId }) {
      const item = active;
      if (!item || item.id !== callId || !item.caller || !item.pc) return;

      try {
        update(item, { phase: "connecting" });

        const offer = await item.pc.createOffer();
        if (active !== item) return;

        await item.pc.setLocalDescription(offer);
        if (active !== item) return;

        socket.emit("call:signal", {
          callId,
          description: item.pc.localDescription.toJSON(),
        });
      } catch (error) {
        fail(item, error);
      }
    }

    // Sérialise les descriptions et candidats ICE reçus.
    let signalQueue = Promise.resolve();

    async function handleSignal({ callId, description, candidate }) {
      const item = active;
      if (!item || item.id !== callId || !item.pc) return;

      try {
        if (description) {
          await item.pc.setRemoteDescription(description);
          if (active !== item) return;

          for (const queued of item.candidates.splice(0)) {
            await item.pc.addIceCandidate(queued);
          }

          if (description.type === "offer") {
            const answer = await item.pc.createAnswer();
            if (active !== item) return;

            await item.pc.setLocalDescription(answer);
            if (active !== item) return;

            socket.emit("call:signal", {
              callId,
              description: item.pc.localDescription.toJSON(),
            });
          }
        } else if (candidate) {
          if (item.pc.remoteDescription) {
            await item.pc.addIceCandidate(candidate);
          } else {
            item.candidates.push(candidate);
          }
        }
      } catch (error) {
        fail(item, error);
      }
    }

    async function quality(value) {
      const item = active;
      const track = item?.local?.getVideoTracks()[0];

      if (!track || item.changingQuality) return;

      const sizes = {
        "720": [1280, 720],
        "1080": [1920, 1080],
        "2160": [3840, 2160],
      };

      const size = sizes[value];
      if (!size) return;

      update(item, { changingQuality: true });

      try {
        await track.applyConstraints({
          width: { ideal: size[0] },
          height: { ideal: size[1] },
          frameRate: { ideal: 30, max: 30 },
        });

        const settings = track.getSettings();

        update(item, {
          requestedQuality: value,
          captureSize: `${settings.width} × ${settings.height}`,
        });
      } catch {
        if (active === item) setNotice("Cette qualité n’est pas disponible.");
      } finally {
        update(item, { changingQuality: false });
      }
    }

    actions.current = {
      start,
      accept,
      end: () => cleanup("", true),
      decline: () => cleanup("", true, "declined"),
      quality,
      microphone: () => {
        const item = active;
        if (!item?.local) return;

        const enabled = !item.microphone;
        item.local.getAudioTracks().forEach((track) => {
          track.enabled = enabled;
        });
        update(item, { microphone: enabled });
      },
      camera: () => {
        const item = active;
        if (!item?.local) return;

        const enabled = !item.camera;
        item.local.getVideoTracks().forEach((track) => {
          track.enabled = enabled;
        });
        update(item, { camera: enabled });
      },
    };

    socket.on("connect", () => {
      if (!disposed) setReady(true);
    });

    socket.on("connect_error", (error) => {
      if (!disposed) {
        setReady(false);
        setNotice(error.message || "Connexion aux appels impossible.");
      }
    });

    socket.on("disconnect", () => {
      if (!disposed) setReady(false);
      cleanup("Connexion aux appels interrompue.");
    });

    socket.on("call:incoming", (data) => {
      if (active) return;

      active = {
        id: data.callId,
        type: data.type,
        peer: data.peer,
        phase: "incoming",
        caller: false,
      };

      setNotice("");
      setCall({ ...active });
    });

    socket.on("call:accepted", accepted);

    socket.on("call:signal", (data) => {
      signalQueue = signalQueue.then(() => handleSignal(data));
    });

    socket.on("call:answered-elsewhere", ({ callId }) => {
      if (active?.id === callId) cleanup("Appel décroché sur un autre onglet.");
    });

    socket.on("call:ended", ({ callId, reason }) => {
      if (active?.id !== callId) return;

      const messages = {
        declined: "Appel refusé.",
        "no-answer": "Aucune réponse.",
        disconnected: "Le contact a été déconnecté.",
        "connection-failed": "La connexion de l’appel n’a pas abouti.",
        ended: "Appel terminé.",
      };

      cleanup(messages[reason] || "Appel terminé.");
    });

    return () => {
      disposed = true;
      cleanup("", true);
      actions.current = {};
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [currentUser?.id]);

  const labels = {
    incoming: "Appel entrant",
    preparing: "Préparation du micro et de la caméra…",
    ringing: "Ça sonne…",
    connecting: "Connexion…",
    connected: "En communication",
    reconnecting: "Connexion interrompue…",
  };

  const peerPhoto = call?.peer?.profilePicture;
  const photoUrl = peerPhoto
    ? new URL(peerPhoto, `${SERVER_URL}/`).href
    : null;

  return (
    <CallsContext.Provider
      value={{
        ready,
        startCall: (chatId, type) => {
          enableSound();
          actions.current.start?.(chatId, type);
        },
      }}
    >
      {children}

      {currentUser && !soundEnabled && (
        <button
          type="button"
          className="onvm-call-enable"
          onClick={enableSound}
        >
          Activer la sonnerie des appels
        </button>
      )}

      {notice && (
        <div className="onvm-call-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}>
            Fermer
          </button>
        </div>
      )}

      {call && (
        <div className="onvm-call-overlay">
          <section
            className="onvm-call-card"
            role="dialog"
            aria-modal="true"
            aria-label={call.type === "video" ? "Appel vidéo" : "Appel vocal"}
          >
            <p className="onvm-call-label">
              ONVM · {call.type === "video" ? "Vidéo" : "Vocal"}
            </p>

            {photoUrl && (
              <img
                className="onvm-call-avatar"
                src={photoUrl}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}

            <h2>{call.peer?.username || "Votre contact"}</h2>
            <p role="status">{labels[call.phase]}</p>

            {call.type === "video" && call.local && (
              <div className="onvm-call-videos">
                <MediaView
                  stream={call.remote}
                  video
                  muted
                  className="onvm-call-remote"
                />
                <MediaView
                  stream={call.local}
                  video
                  muted
                  className="onvm-call-local"
                />
              </div>
            )}

            {/* Le son distant est diffusé une seule fois, ici. */}
            {call.remote && <MediaView stream={call.remote} />}

            {call.type === "video" && call.local && (
              <label className="onvm-call-quality">
                Qualité souhaitée
                <select
                  value={call.requestedQuality || "1080"}
                  disabled={call.changingQuality}
                  onChange={(event) =>
                    actions.current.quality?.(event.target.value)
                  }
                >
                  <option value="720">HD · 720p</option>
                  <option value="1080">Full HD · 1080p</option>
                  <option value="2160">4K · si disponible</option>
                </select>
                {call.captureSize && (
                  <small>Capture locale : {call.captureSize}</small>
                )}
              </label>
            )}

            <div className="onvm-call-controls">
              {call.phase === "incoming" ? (
                <>
                  <button
                    type="button"
                    className="onvm-call-answer"
                    onClick={() => {
                      enableSound();
                      actions.current.accept?.();
                    }}
                  >
                    Décrocher
                  </button>
                  <button
                    type="button"
                    className="onvm-call-end"
                    onClick={() => actions.current.decline?.()}
                  >
                    Refuser
                  </button>
                </>
              ) : (
                <>
                  {call.local && (
                    <button
                      type="button"
                      onClick={() => actions.current.microphone?.()}
                      aria-pressed={!call.microphone}
                    >
                      {call.microphone ? "Couper le micro" : "Activer le micro"}
                    </button>
                  )}

                  {call.type === "video" && call.local && (
                    <button
                      type="button"
                      onClick={() => actions.current.camera?.()}
                      aria-pressed={!call.camera}
                    >
                      {call.camera ? "Couper la caméra" : "Activer la caméra"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="onvm-call-end"
                    onClick={() => actions.current.end?.()}
                  >
                    Raccrocher
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </CallsContext.Provider>
  );
}