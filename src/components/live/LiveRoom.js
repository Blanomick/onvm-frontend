import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiEye,
  FiHeart,
  FiMic,
  FiMicOff,
  FiRefreshCw,
  FiSend,
  FiShare2,
  FiVolume2,
  FiX,
} from "react-icons/fi";
import { avatarUrl, connectLives, request } from "./liveSocket";
import { copyText } from "../../utils/share";
import "./Live.css";

// Qualité envoyée à chaque spectateur : légère pour les réseaux mobiles
const LIVE_VIDEO = { width: 854, height: 480, fps: 24, bitrate: 650000 };

function cameraConstraints(facingMode) {
  return {
    video: {
      width: { ideal: LIVE_VIDEO.width },
      height: { ideal: LIVE_VIDEO.height },
      frameRate: { ideal: LIVE_VIDEO.fps, max: 30 },
      facingMode,
    },
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  };
}

function Hearts({ hearts }) {
  return (
    <div className="onvm-live__hearts" aria-hidden="true">
      {hearts.map((heart) => (
        <span key={heart.id} style={{ left: `${heart.x}%`, animationDuration: `${heart.d}ms` }}>
          {heart.emoji}
        </span>
      ))}
    </div>
  );
}

/**
 * Live vidéo : mode "host" (je diffuse) ou "watch" (je regarde)
 */
export default function LiveRoom({ mode, currentUser }) {
  const { liveId: routeLiveId } = useParams();
  const navigate = useNavigate();
  const isHost = mode === "host";

  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const iceRef = useRef([]);
  const peersRef = useRef(new Map()); // hôte : socketId -> RTCPeerConnection
  const viewerPcRef = useRef(null); // spectateur
  const pendingIce = useRef([]);
  const liveIdRef = useRef(routeLiveId || null);
  const chatEndRef = useRef(null);

  const [phase, setPhase] = useState(isHost ? "setup" : "connecting"); // setup | live | connecting | watching | ended | error
  const [error, setError] = useState("");
  const [live, setLive] = useState(null);
  const [title, setTitle] = useState("");
  const [viewers, setViewers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [hearts, setHearts] = useState([]);
  const [muted, setMuted] = useState(false); // hôte : micro coupé
  const [soundBlocked, setSoundBlocked] = useState(!isHost);
  const [facing, setFacing] = useState("user");
  const [toast, setToast] = useState("");

  const flash = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2200);
  };

  const popHeart = useCallback((emoji = "❤️") => {
    const heart = { id: Math.random(), x: 70 + Math.random() * 20, d: 1800 + Math.random() * 900, emoji };
    setHearts((current) => [...current.slice(-25), heart]);
    setTimeout(() => setHearts((current) => current.filter((item) => item.id !== heart.id)), heart.d);
  }, []);

  const addChat = useCallback((item) => {
    setChat((current) => [...current.slice(-40), { ...item, key: Math.random() }]);
  }, []);

  // --- Hôte : une connexion par spectateur ---
  const connectViewer = useCallback(async (socketId) => {
    const socket = socketRef.current;
    const stream = streamRef.current;
    if (!socket || !stream) return;

    peersRef.current.get(socketId)?.close();
    const pc = new RTCPeerConnection({ iceServers: iceRef.current });
    peersRef.current.set(socketId, pc);

    stream.getTracks().forEach((track) => {
      const options = { direction: "sendonly", streams: [stream] };
      if (track.kind === "video") {
        options.sendEncodings = [{ maxBitrate: LIVE_VIDEO.bitrate, maxFramerate: LIVE_VIDEO.fps }];
      }
      try {
        pc.addTransceiver(track, options);
      } catch {
        pc.addTrack(track, stream);
      }
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("live:signal", {
          liveId: liveIdRef.current,
          to: socketId,
          candidate: event.candidate.toJSON(),
        });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        pc.close();
        peersRef.current.delete(socketId);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("live:signal", {
      liveId: liveIdRef.current,
      to: socketId,
      description: pc.localDescription.toJSON(),
    });
  }, []);

  // --- Spectateur : reçoit l'offre de l'hôte ---
  const handleViewerSignal = useCallback(async ({ from, description, candidate }) => {
    const socket = socketRef.current;
    if (!socket) return;

    if (description?.type === "offer") {
      viewerPcRef.current?.close();
      const pc = new RTCPeerConnection({ iceServers: iceRef.current });
      viewerPcRef.current = pc;
      pendingIce.current = [];

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = false;
          videoRef.current.play().then(
            () => setSoundBlocked(false),
            () => {
              // Lecture avec son bloquée : on démarre muet
              if (!videoRef.current) return;
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => undefined);
              setSoundBlocked(true);
            }
          );
        }
        setPhase("watching");
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("live:signal", { liveId: liveIdRef.current, to: from, candidate: event.candidate.toJSON() });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          setError("Connexion au live perdue.");
          setPhase("error");
        }
      };

      await pc.setRemoteDescription(description);
      for (const item of pendingIce.current) await pc.addIceCandidate(item).catch(() => undefined);
      pendingIce.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("live:signal", { liveId: liveIdRef.current, to: from, description: pc.localDescription.toJSON() });
    } else if (candidate) {
      const pc = viewerPcRef.current;
      if (pc?.remoteDescription) await pc.addIceCandidate(candidate).catch(() => undefined);
      else pendingIce.current.push(candidate);
    }
  }, []);

  // Connexion au serveur
  useEffect(() => {
    const socket = connectLives();
    socketRef.current = socket;
    let disposed = false;

    const onConnect = async () => {
      try {
        const config = await request(socket, "live:config");
        iceRef.current = config.iceServers || [];

        if (isHost) {
          // Retour après coupure pendant un live
          if (liveIdRef.current) await request(socket, "live:resume", { liveId: liveIdRef.current }).catch(() => undefined);
          return;
        }

        const result = await request(socket, "live:join", { liveId: routeLiveId });
        if (disposed) return;
        setLive(result.live);
        setViewers(result.live.viewers);
        setLikes(result.live.likes);
      } catch (joinError) {
        if (disposed) return;
        setError(joinError.message);
        setPhase(isHost ? "setup" : "error");
      }
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", (connectError) => setError(connectError.message));

    socket.on("live:viewer-joined", ({ socketId }) => {
      connectViewer(socketId).catch((offerError) => console.warn("Live :", offerError.message));
    });
    socket.on("live:viewer-left", ({ socketId }) => {
      peersRef.current.get(socketId)?.close();
      peersRef.current.delete(socketId);
    });
    socket.on("live:signal", async (data) => {
      if (isHost) {
        const pc = peersRef.current.get(data.from);
        if (!pc) return;
        if (data.description) await pc.setRemoteDescription(data.description).catch(() => undefined);
        if (data.candidate) await pc.addIceCandidate(data.candidate).catch(() => undefined);
      } else {
        handleViewerSignal(data).catch((signalError) => console.warn("Live :", signalError.message));
      }
    });
    socket.on("live:stats", (data) => {
      setViewers(data.viewers);
      setLikes(data.likes);
    });
    socket.on("live:chat", addChat);
    socket.on("live:like", (data) => {
      setLikes(data.likes);
      popHeart();
    });
    socket.on("live:ended", () => {
      setPhase("ended");
      viewerPcRef.current?.close();
    });

    // Fermeture propre (quitter la page = fin du live pour l'hôte)
    const teardown = () => {
      const liveId = liveIdRef.current;
      if (isHost && liveId) socket.emit("live:end", { liveId });
      if (!isHost && liveId) socket.emit("live:leave", { liveId });
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      viewerPcRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      socket.disconnect();
    };

    return () => {
      disposed = true;
      teardown();
    };
  }, [isHost, routeLiveId, connectViewer, handleViewerSignal, addChat, popHeart]);

  // Hôte : aperçu caméra
  useEffect(() => {
    if (!isHost) return undefined;
    let stopped = false;
    navigator.mediaDevices
      .getUserMedia(cameraConstraints("user"))
      .then((stream) => {
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => undefined);
        }
      })
      .catch(() => setError("Autorise la caméra et le micro pour lancer un live."));
    return () => {
      stopped = true;
    };
  }, [isHost]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [chat]);

  const start = async () => {
    if (!streamRef.current) {
      setError("Caméra non disponible.");
      return;
    }
    try {
      const result = await request(socketRef.current, "live:start", { title });
      liveIdRef.current = result.live.id;
      setLive(result.live);
      setPhase("live");
      setError("");
    } catch (startError) {
      setError(startError.message);
    }
  };

  const stop = () => {
    if (isHost && liveIdRef.current) {
      socketRef.current?.emit("live:end", { liveId: liveIdRef.current });
      liveIdRef.current = null;
    }
    navigate("/lives");
  };

  const switchCamera = async () => {
    const next = facing === "user" ? "environment" : "user";
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({ video: cameraConstraints(next).video });
      const track = fresh.getVideoTracks()[0];
      const stream = streamRef.current;
      const old = stream.getVideoTracks()[0];
      peersRef.current.forEach((pc) => {
        pc.getSenders()
          .filter((sender) => sender.track?.kind === "video")
          .forEach((sender) => sender.replaceTrack(track).catch(() => undefined));
      });
      stream.removeTrack(old);
      old.stop();
      stream.addTrack(track);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setFacing(next);
    } catch {
      flash("Impossible de changer de caméra.");
    }
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  const sendChat = (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || !liveIdRef.current) return;
    socketRef.current?.emit("live:chat", { liveId: liveIdRef.current, text });
    setMessage("");
  };

  const like = () => {
    if (!liveIdRef.current) return;
    socketRef.current?.emit("live:like", { liveId: liveIdRef.current });
  };

  const shareLive = async () => {
    const url = `${window.location.origin}/lives/${liveIdRef.current}`;
    try {
      if (navigator.share) await navigator.share({ title: live?.title || "Live ONVM", url });
      else if (await copyText(url)) flash("Lien du live copié");
    } catch {
      // partage annulé
    }
  };

  const enableSound = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    videoRef.current.play().then(() => setSoundBlocked(false)).catch(() => undefined);
  };

  const host = live?.host || (isHost ? currentUser : null);
  const onAir = phase === "live" || phase === "watching";

  return (
    <main className="onvm-live">
      <video
        ref={videoRef}
        className={`onvm-live__video ${isHost && facing === "user" ? "is-mirrored" : ""}`}
        playsInline
        autoPlay
      />

      {/* Barre du haut */}
      <header className="onvm-live__top">
        {host && (
          <div className="onvm-live__host">
            <img src={avatarUrl(host.profilePicture)} alt="" data-avatar="true" />
            <span>
              <strong>{host.username}</strong>
              {live?.title && <small>{live.title}</small>}
            </span>
          </div>
        )}
        {onAir && <span className="onvm-live-badge">EN DIRECT</span>}
        {onAir && (
          <span className="onvm-live__count">
            <FiEye /> {viewers}
          </span>
        )}
        <button type="button" className="onvm-live__close" onClick={stop} aria-label="Quitter">
          <FiX />
        </button>
      </header>

      {/* Préparation (hôte) */}
      {isHost && phase === "setup" && (
        <section className="onvm-live__setup">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
            placeholder="Titre de ton live (ex : Questions-réponses, match ce soir…)"
          />
          <button type="button" className="onvm-live__start" onClick={start}>
            🔴 Passer en direct
          </button>
          <p>Tes abonnés recevront une notification. Jusqu’à 20 spectateurs en même temps.</p>
        </section>
      )}

      {/* États */}
      {!isHost && phase === "connecting" && !error && (
        <div className="onvm-live__center">
          <span className="onvm-lives__spinner" />
          <p>Connexion au live…</p>
        </div>
      )}
      {(phase === "ended" || phase === "error" || (error && !onAir && !isHost)) && (
        <div className="onvm-live__center">
          <p>{phase === "ended" ? "Ce live est terminé." : error}</p>
          <button type="button" onClick={() => navigate("/lives")}>
            Voir les autres lives
          </button>
        </div>
      )}
      {isHost && error && phase === "setup" && <p className="onvm-live__error">{error}</p>}

      {!isHost && soundBlocked && phase === "watching" && (
        <button type="button" className="onvm-live__sound" onClick={enableSound}>
          <FiVolume2 /> Activer le son
        </button>
      )}

      <Hearts hearts={hearts} />

      {/* Commentaires */}
      {onAir && (
        <section className="onvm-live__chat">
          <ul>
            {chat.map((item) => (
              <li key={item.key} className={item.system ? "is-system" : ""}>
                {item.system ? (
                  item.text
                ) : (
                  <>
                    <strong>{item.host ? `⭐ ${item.username}` : item.username}</strong> {item.text}
                  </>
                )}
              </li>
            ))}
            <li ref={chatEndRef} aria-hidden="true" />
          </ul>
        </section>
      )}

      {/* Barre du bas */}
      {onAir && (
        <footer className="onvm-live__bottom">
          <form onSubmit={sendChat}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Commenter…"
              maxLength={300}
              enterKeyHint="send"
            />
            <button type="submit" aria-label="Envoyer" disabled={!message.trim()}>
              <FiSend />
            </button>
          </form>
          {isHost ? (
            <>
              <button type="button" onClick={toggleMic} aria-label={muted ? "Activer le micro" : "Couper le micro"}>
                {muted ? <FiMicOff /> : <FiMic />}
              </button>
              <button type="button" onClick={switchCamera} aria-label="Changer de caméra">
                <FiRefreshCw />
              </button>
            </>
          ) : null}
          <button type="button" onClick={shareLive} aria-label="Partager le live">
            <FiShare2 />
          </button>
          <button type="button" className="onvm-live__like" onClick={like} aria-label="J’aime">
            <FiHeart />
            <small>{likes}</small>
          </button>
        </footer>
      )}

      {toast && <div className="onvm-live__toast">{toast}</div>}
    </main>
  );
}
