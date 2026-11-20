import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import "./Calls.css";
import CallScreen from "./CallScreen";
const SERVER_URL = (
  process.env.REACT_APP_WEBSOCKET_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const CallsContext = createContext(null);

// Qualité vidéo : taille de l'image + débit maximum envoyé.
// Sans débit plus élevé, le navigateur garde une image floue même en 1080p.
const QUALITIES = {
  "360": { width: 640, height: 360, fps: 24, bitrate: 450000, label: "Économie · 360p" },
  "720": { width: 1280, height: 720, fps: 30, bitrate: 2000000, label: "HD · 720p" },
  "1080": { width: 1920, height: 1080, fps: 30, bitrate: 4500000, label: "Full HD · 1080p" },
  "2160": { width: 3840, height: 2160, fps: 30, bitrate: 12000000, label: "4K si disponible" },
};
export const QUALITY_OPTIONS = Object.entries(QUALITIES).map(([value, q]) => ({
  value,
  label: q.label,
}));
const DEFAULT_QUALITY = "1080";

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
        <audio ref={ref} autoPlay muted={muted} />
      )}

      {blocked && (
  <button
    type="button"
    className="oc-playback"
    onClick={play}
  >
    Activer {video ? "la vidéo" : "le son"}
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

    if (
      !audioContextRef.current ||
      audioContextRef.current.state === "closed"
    ) {
      audioContextRef.current = new AudioContextClass();
    }

    await audioContextRef.current.resume();

    setSoundEnabled(
      audioContextRef.current.state === "running"
    );
  } catch {
    setNotice(
      "Le son n’a pas pu être activé. Réessaie depuis l’écran d’appel."
    );
  }
}

// Active le contexte audio lors d’une interaction avec l’application.
// Aucun bouton permanent n’est affiché sur le fil de publications.
useEffect(() => {
  if (!currentUser?.id) return;

  let disposed = false;
  let unlocking = false;

  function removeListeners() {
    document.removeEventListener("click", unlock, true);
    document.removeEventListener("keydown", unlock, true);
  }

  async function unlock() {
    if (disposed || unlocking) return;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    unlocking = true;

    try {
      if (
        !audioContextRef.current ||
        audioContextRef.current.state === "closed"
      ) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;
      await context.resume();

      if (!disposed && context.state === "running") {
        setSoundEnabled(true);
        removeListeners();
      }
    } catch {
      // L’écran d’appel conserve une activation manuelle si nécessaire.
    } finally {
      unlocking = false;
    }
  }

  document.addEventListener("click", unlock, true);
  document.addEventListener("keydown", unlock, true);

  return () => {
    disposed = true;
    removeListeners();
  };
}, [currentUser?.id]);

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

        const incomingRing = call.phase === "incoming";
        oscillator.type = incomingRing ? "triangle" : "sine";
        oscillator.frequency.value = incomingRing ? (offset ? 784 : 660) : 440;
        gain.gain.setValueAtTime(0, start + offset);
        gain.gain.linearRampToValueAtTime(incomingRing ? 0.35 : 0.12, start + offset + 0.03);
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
    const timer = setInterval(ring, call.phase === "incoming" ? 1600 : 2200);

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

  // Vibration pendant un appel entrant (Android)
  useEffect(() => {
    if (call?.phase !== "incoming" || !navigator.vibrate) return;
    const buzz = () => {
      try {
        navigator.vibrate([800, 400, 800]);
      } catch {
        // non pris en charge
      }
    };
    buzz();
    const timer = setInterval(buzz, 2400);
    return () => {
      clearInterval(timer);
      try {
        navigator.vibrate(0);
      } catch {
        // rien
      }
    };
  }, [call?.phase]);

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
        clearInterval(item.statsTimer);

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
          update(item, {
  phase: "connected",
  connectedAt: item.connectedAt || Date.now(),
});
          socket.emit("call:connected", { callId: item.id });

          if (item.type === "video" && !item.qualityApplied) {
            item.qualityApplied = true;
            applySendQuality(item, item.requestedQuality || DEFAULT_QUALITY);
            watchStats(item);
          }
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

        update(item, { phase: "dialing" });

        const result = await request("call:start", {
          callId: item.id,
          conversationId: Number(conversationId),
          type,
        });

        if (active !== item) {
          socket.emit("call:end", { callId: item.id });
          return;
        }

       update(item, {
  peer: result.peer,
  phase: item.phase === "dialing" ? "ringing" : item.phase,
});
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

    // Règle ce que J'ENVOIE : taille de la caméra + débit + priorité à la netteté
    async function applySendQuality(item, value) {
      const preset = QUALITIES[value];
      const track = item?.local?.getVideoTracks()[0];
      if (!preset || !track || active !== item) return;

      try {
        track.contentHint = Number(value) >= 1080 ? "detail" : "motion";
      } catch {
        // non pris en charge
      }

      try {
        await track.applyConstraints({
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: preset.fps, max: preset.fps },
        });
      } catch {
        // la caméra garde sa taille actuelle ; le débit change quand même
      }
      if (active !== item) return;

      const settings = track.getSettings();
      const sender = item.pc
        ?.getSenders()
        .find((candidate) => candidate.track?.kind === "video");

      if (sender?.getParameters && sender.setParameters) {
        const params = sender.getParameters();
        if (!params.encodings || !params.encodings.length) params.encodings = [{}];

        // Si la caméra filme plus grand que demandé (ex. 1080p en mode 360p),
        // on réduit l'image envoyée.
        const scale =
          settings.height && settings.height > preset.height
            ? settings.height / preset.height
            : 1;

        params.encodings[0].maxBitrate = preset.bitrate;
        params.encodings[0].maxFramerate = preset.fps;
        params.encodings[0].scaleResolutionDownBy = scale;

        try {
          await sender.setParameters({
            ...params,
            degradationPreference: value === "360" ? "balanced" : "maintain-resolution",
          });
        } catch {
          try {
            await sender.setParameters(params);
          } catch (error) {
            console.warn("Qualité vidéo :", error.message);
          }
        }
      }

      update(item, {
        captureSize:
          settings.width && settings.height ? `${settings.width} × ${settings.height}` : "",
      });
    }

    // Mesure l'image réellement reçue (taille, images/s) toutes les 2 s
    function watchStats(item) {
      clearInterval(item.statsTimer);
      item.statsTimer = setInterval(async () => {
        if (active !== item || !item.pc) {
          clearInterval(item.statsTimer);
          return;
        }
        try {
          const stats = await item.pc.getStats();
          let info = "";
          stats.forEach((report) => {
            if (report.type === "inbound-rtp" && report.kind === "video" && report.frameHeight) {
              const fps = Math.round(report.framesPerSecond || 0);
              info = `${report.frameWidth} × ${report.frameHeight}${fps ? ` · ${fps} i/s` : ""}`;
            }
          });
          if (active === item && info !== item.receiveInfo) {
            update(item, { receiveInfo: info });
          }
        } catch {
          // statistiques indisponibles
        }
      }, 2000);
    }

    // Choix de l'utilisateur : vaut pour tout l'appel.
    // L'autre personne adapte ce qu'elle envoie (c'est l'image que JE vois),
    // et j'adapte ce que j'envoie.
    async function quality(value) {
      const item = active;
      if (!item || !QUALITIES[value] || item.type !== "video") return;

      update(item, { requestedQuality: value, changingQuality: true });
      setNotice(`Qualité : ${QUALITIES[value].label}`);

      socket.emit("call:quality", { callId: item.id, quality: value });

      try {
        await applySendQuality(item, value);
      } finally {
        update(item, { changingQuality: false });
        setTimeout(() => setNotice((current) =>
          current.startsWith("Qualité :") ? "" : current
        ), 2500);
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

      // Ouvert avec « Répondre » depuis la notification : on décroche
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("answer") === data.callId) {
          params.delete("answer");
          const query = params.toString();
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${query ? `?${query}` : ""}`
          );
          accept();
        }
      } catch {
        // l'appel reste affiché, l'utilisateur peut décrocher à la main
      }
    });

    socket.on("call:accepted", accepted);

    socket.on("call:quality", ({ callId, quality: value } = {}) => {
      const item = active;
      if (!item || item.id !== callId || !QUALITIES[value]) return;
      update(item, { requestedQuality: value });
      applySendQuality(item, value);
    });

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
  const peerPhoto = call?.peer?.profilePicture;

  let photoUrl = null;

  if (peerPhoto) {
    try {
      const mediaBase =
        process.env.REACT_APP_API_URL || SERVER_URL;

      photoUrl = new URL(peerPhoto, `${mediaBase}/`).href;
    } catch {
      photoUrl = null;
    }
  }

  return (
    <CallsContext.Provider
      value={{
        ready,
        inCall: Boolean(call),
        startCall: (chatId, type) => {
          enableSound();
          actions.current.start?.(chatId, type);
        },
      }}
    >
      {children}

      {notice && (
        <div className="onvm-call-notice" role="status">
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
          >
            Fermer
          </button>
        </div>
      )}

      {call && (
        <CallScreen
          key={call.id}
          call={call}
          qualityOptions={QUALITY_OPTIONS}
          photoUrl={photoUrl}
          soundEnabled={soundEnabled}
          enableSound={enableSound}
          actions={actions}
          MediaView={MediaView}
        />
      )}
    </CallsContext.Provider>
  );
}