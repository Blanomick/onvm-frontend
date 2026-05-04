// frontend/src/app/calls/CallPanel.js
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SERVER_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const socket = io(SERVER_URL, { transports: ["websocket"] }); // une seule instance par onglet

export default function CallPanel({ chatId, currentUser }) {
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' | 'video'
  const [isCaller, setIsCaller] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;

    socket.emit("chat:join", { chatId, userId: currentUser?.id });

    socket.on("webrtc:incoming-call", async ({ type }) => {
      setCallType(type);
      setIsCaller(false);
      await startCallSetup(type, false);
    });

    socket.on("webrtc:offer", async ({ sdp }) => {
      await ensurePC();
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("webrtc:answer", { chatId, sdp: answer });
    });

    socket.on("webrtc:answer", async ({ sdp }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("webrtc:ice-candidate", async ({ candidate }) => {
      try { if (pcRef.current && candidate) await pcRef.current.addIceCandidate(candidate); }
      catch (e) { console.error("ICE error", e); }
    });

    socket.on("webrtc:end", () => endCall(false));

    return () => {
      socket.off("webrtc:incoming-call");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
      socket.off("webrtc:end");
      socket.emit("chat:leave", { chatId, userId: currentUser?.id });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      // Recommande: ajoute un TURN en prod pour fiabiliser les appels
      // { urls: "turn:HOST:3478", username: "USER", credential: "PASS" }
    ],
  };

  async function ensurePC() {
    if (pcRef.current) return;
    pcRef.current = new RTCPeerConnection(rtcConfig);

    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) socket.emit("webrtc:ice-candidate", { chatId, candidate: e.candidate });
    };

    pcRef.current.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => remoteStreamRef.current.addTrack(t));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };
  }

  async function startCallSetup(type, caller) {
    setInCall(true);
    setCallType(type);
    setIsCaller(caller);

    await ensurePC();

    const constraints = type === "video"
      ? { audio: true, video: { width: { ideal: 640 }, height: { ideal: 480 } } }
      : { audio: true, video: false };

    localStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current.getTracks().forEach((track) => pcRef.current.addTrack(track, localStreamRef.current));

    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

    if (caller) {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit("webrtc:offer", { chatId, sdp: offer, type });
      socket.emit("webrtc:incoming-call", { chatId, type, fromUser: currentUser?.id });
    }
  }

  async function startCall(type) {
    await startCallSetup(type, true);
  }

  function endCall(emit = true) {
    setInCall(false);
    setCallType(null);
    setIsCaller(false);

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => { try { s.track?.stop(); } catch {} });
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = new MediaStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (emit) socket.emit("webrtc:end", { chatId });
  }

  return (
    <div className="space-x-2">
      <button className="px-3 py-2 rounded-2xl shadow" onClick={() => startCall("audio")}>Appel vocal</button>
      <button className="px-3 py-2 rounded-2xl shadow" onClick={() => startCall("video")}>Appel vidéo</button>

      {inCall && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3">
            <div className="text-center font-semibold">
              {callType === "video" ? "Appel vidéo en cours" : "Appel vocal en cours"}
            </div>

            {callType === "video" ? (
              <>
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-xl" />
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-xl" />
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl border text-center">🎧 Micro actif</div>
                <div className="p-3 rounded-xl border text-center">🔊 Audio distant</div>
              </>
            )}

            <div className="flex justify-center">
              <button className="px-4 py-2 rounded-2xl shadow bg-red-500 text-white" onClick={() => endCall(true)}>
                Raccrocher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
