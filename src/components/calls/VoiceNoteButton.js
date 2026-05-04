// frontend/src/app/calls/VoiceNoteButton.js
import React, { useEffect, useRef, useState } from "react";

const SERVER_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// util pour détecter si on est sur iOS Safari (MediaRecorder parfois capricieux)
function isiOSSafari() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua);
}

export default function VoiceNoteButton({ chatId, currentUser, onSent }) {
const clientTagRef = useRef(
   (typeof crypto !== 'undefined' && crypto.randomUUID)      ? crypto.randomUUID()
     : String(Math.random()).slice(2)
 );
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // cleanup si on démonte le composant
      try { clearInterval(timerRef.current); } catch {}
      
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
   try { mediaRecorderRef.current.stop(); } catch {}
 }
      
      streamRef.current?.getTracks()?.forEach(t => t.stop());
    };
  }, []);



 async function startRecording() {
  let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error("[VoiceNoteButton] microphone denied:", e);
      return;
    }

  streamRef.current = stream;

    // Meilleur MIME disponible
    let mimeType = "audio/webm;codecs=opus";
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder && MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else {
        // Fallback iOS récent : audio/mp4 (selon support)
        mimeType = "audio/mp4";
      }
    }

    const mr = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
   mr.onstop = () => {
   try { stream.getTracks().forEach((t) => t.stop()); } catch {}
   streamRef.current = null;
};
    mediaRecorderRef.current = mr;
    mr.start(200); // petits chunks

    setIsRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }
async function stopAndSend() {
  if (!mediaRecorderRef.current) return;
  const mr = mediaRecorderRef.current;

   // --- Guards: on ne tente rien si les identifiants sont invalides ---
 // --- Guards légers : on exige userId, et on aura AU MOINS chatId en texte ---
 const convId = Number(chatId);
if (!currentUser?.id) {
   console.error("[VoiceNoteButton] userId manquant:", currentUser);
   return;
 }

  // stop + cleanup
 try { mr.stop(); } catch {}
  clearInterval(timerRef.current);
  setIsRecording(false);

  // attendre que le dernier chunk arrive
  await new Promise((r) => setTimeout(r, 50));

  // construire le blob
  if (!chunksRef.current.length) {
  // rien à envoyer
 return;
 }
  const mime = mr.mimeType || "audio/webm";
  const ext = mime.includes("mp4") || mime.includes("aac") ? "m4a" : "webm";
  const blob = new Blob(chunksRef.current, { type: mime });

  // ✅ FormData déclaré correctement

   // ✅ FormData déclaré correctement
const fd = new FormData();
 // Toujours envoyer chatId (ancien backend)
 fd.append("chatId", String(chatId ?? ""));      // ← clé attendue par ton backend actuel
 // Et envoyer conversation_id si dispo (nouveau backend)
 if (Number.isFinite(convId)) {
   fd.append("conversation_id", String(convId));  // ← pour compat future
 }
 fd.append("userId", String(currentUser?.id ?? ''));
 fd.append("duration", String(seconds));  
 fd.append("client_tag", clientTagRef.current);   // ← AJOUT             // ← durée côté front
  fd.append("voice", blob, `voice_${Date.now()}.${ext}`);
  // DEBUG: voir exactement les champs envoyés
  try {
    for (const [k, v] of fd.entries()) {
      console.log("[VoiceNoteButton] FD:", k, v instanceof Blob ? `Blob(${v.size})` : v);
    }
  } catch {}
  let data = null;
  setIsUploading(true);
  try {
     const res = await fetch(`${SERVER_URL}/api/voice-notes`, {
      method: "POST",
      body: fd,
    });
      if (!res.ok) {
    const txt = await res.text().catch(() => '');
      throw new Error(`Upload failed ${res.status}: ${txt}`);
    }
    data = await res.json();
  } catch (e) {
    console.error("[VoiceNoteButton] upload error:", e);
    setIsUploading(false);
    return;
  }
 
   const playUrl = data?.playUrl || data?.url;
  if (!playUrl) { setIsUploading(false); return; }
  const absoluteUrl = playUrl.startsWith('http')
    ? playUrl
    : `${SERVER_URL}${playUrl}`;
  const bust = `${absoluteUrl}${absoluteUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

 onSent?.({
   id: data?.id ?? Date.now(),
    type: "voice",
    voice_url: bust,
    duration: data?.duration ?? seconds ?? null,
    created_at: data?.created_at ?? new Date().toISOString(),
    client_tag: clientTagRef.current,
  });

  // reset
  chunksRef.current = [];
   mediaRecorderRef.current = null;
 setIsUploading(false);
 setSeconds(0);
}


  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
           className="px-3 py-2 rounded-2xl shadow bg-emerald-600 text-white hover:brightness-110 disabled:opacity-60"
            onClick={startRecording}
         disabled={isUploading}
          title="Enregistrer une note vocale"
        >
          🎙️ Note vocale
        </button>
      ) : (
        <button
           className="px-3 py-2 rounded-2xl shadow bg-rose-600 text-white hover:brightness-110 disabled:opacity-60"
           onClick={stopAndSend}
         disabled={isUploading}
          title="Arrêter et envoyer"
        >
          ⏹️ Envoyer ({seconds}s)
        </button>
      )}
      {isiOSSafari() && (
        <span className="text-xs text-gray-500">
          iOS : enregistre en AAC/MP4 si nécessaire.
        </span>
      )}
    </div>
  );
}
