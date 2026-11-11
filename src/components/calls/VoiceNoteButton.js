import React, { useEffect, useRef, useState } from "react";
import {
  FiMic,
  FiSquare,
  FiSend,
  FiTrash2,
  FiLoader,
  FiX,
} from "react-icons/fi";
import "./VoiceNoteButton.css";

const SERVER_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function formatDuration(value) {
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function VoiceNoteButton({ chatId, currentUser, onSent }) {
  const [phase, setPhase] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const phaseRef = useRef("idle");
  const aliveRef = useRef(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const blobRef = useRef(null);
  const previewUrlRef = useRef("");
  const previewAudioRef = useRef(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);
  const discardRef = useRef(false);
  const clientTagRef = useRef("");

  function changePhase(value) {
    phaseRef.current = value;
    if (aliveRef.current) setPhase(value);
  }

  function releaseMicrophone() {
    clearInterval(timerRef.current);
    timerRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearPreview() {
    previewAudioRef.current?.pause();

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = "";
    blobRef.current = null;

    if (aliveRef.current) setPreviewUrl("");
  }

  useEffect(() => {
    aliveRef.current = true;

    return () => {
      aliveRef.current = false;
      discardRef.current = true;
      clearInterval(timerRef.current);

      const recorder = recorderRef.current;

      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  async function startRecording() {
    if (phaseRef.current !== "idle") return;

    setError("");

    const conversationId = Number(chatId);

    // La route backend actuelle attend une conversation numérique.
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      setError("L’envoi de vocaux dans les groupes doit encore être activé côté serveur.");
      return;
    }

    if (!currentUser?.id) {
      setError("Connecte-toi pour envoyer un message vocal.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("L’enregistrement audio n’est pas disponible dans ce navigateur.");
      return;
    }

    changePhase("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: { ideal: 1 },
        },
      });

      if (!aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const formats = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];

      const mimeType = formats.find((format) =>
        window.MediaRecorder.isTypeSupported(format)
      );

      const recorder = new window.MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 96000,
      });

      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRef.current = false;
      durationRef.current = 0;

      clientTagRef.current =
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        discardRef.current = true;

        if (recorder.state !== "inactive") recorder.stop();

        releaseMicrophone();

        if (aliveRef.current) {
          setError("L’enregistrement a été interrompu. Réessaie.");
          changePhase("idle");
        }
      };

      recorder.onstop = () => {
        releaseMicrophone();
        recorderRef.current = null;

        if (!aliveRef.current || discardRef.current) return;

        durationRef.current =
          (performance.now() - startedAtRef.current) / 1000;

        const type = recorder.mimeType || chunksRef.current[0]?.type;
        const blob = new Blob(chunksRef.current, { type });

        if (!blob.size) {
          setError("Aucun son enregistré. Réessaie.");
          changePhase("idle");
          return;
        }

        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;

        setPreviewUrl(url);
        setSeconds(durationRef.current);
        changePhase("preview");
      };

      recorder.start();
      startedAtRef.current = performance.now();

      setSeconds(0);
      changePhase("recording");

      timerRef.current = window.setInterval(() => {
        if (aliveRef.current) {
          setSeconds((performance.now() - startedAtRef.current) / 1000);
        }
      }, 250);
    } catch (err) {
      releaseMicrophone();

      if (!aliveRef.current) return;

      setError(
        err.name === "NotAllowedError"
          ? "Autorise l’accès au microphone dans ton navigateur."
          : err.name === "NotFoundError"
            ? "Aucun microphone détecté."
            : "Impossible de démarrer l’enregistrement."
      );

      changePhase("idle");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;

    if (
      phaseRef.current !== "recording" ||
      !recorder ||
      recorder.state === "inactive"
    ) {
      return;
    }

    changePhase("stopping");
    clearInterval(timerRef.current);

    // onstop reçoit le dernier morceau audio avant de créer l’aperçu.
    recorder.stop();
  }

  function discardRecording() {
    if (phaseRef.current === "uploading") return;

    discardRef.current = true;

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    releaseMicrophone();
    clearPreview();

    chunksRef.current = [];
    setSeconds(0);
    setError("");
    changePhase("idle");
  }

  async function sendRecording() {
    // Verrou immédiat : un double clic ne lance pas deux requêtes.
    if (phaseRef.current !== "preview" || !blobRef.current) return;

    changePhase("uploading");
    setError("");
    previewAudioRef.current?.pause();

    const blob = blobRef.current;
    const extension = blob.type.includes("mp4")
      ? "m4a"
      : blob.type.includes("ogg")
        ? "ogg"
        : "webm";

    const formData = new FormData();
    formData.append("chatId", String(chatId));
    formData.append("conversation_id", String(chatId));
    formData.append("userId", String(currentUser.id));
    formData.append("duration", String(durationRef.current));
    formData.append("client_tag", clientTagRef.current);
    formData.append("voice", blob, `voice_${Date.now()}.${extension}`);

    let savedMessage;

    try {
      const response = await fetch(`${SERVER_URL}/api/voice-notes`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Envoi impossible.");
      }

      const url = data.voice_url || data.playUrl || data.url;

      if (!data.id || !url) {
        throw new Error("Confirmation du serveur incomplète.");
      }

      savedMessage = {
        ...data,
        type: "voice",
        sender_id: data.user_id ?? currentUser.id,
        voice_url: new URL(url, `${SERVER_URL}/`).href,
      };
    } catch (err) {
      if (aliveRef.current) {
        setError(
          `${err.message} Vérifie la conversation avant de réessayer : le serveur peut avoir reçu le vocal.`
        );
        changePhase("preview");
      }
      return;
    }

    if (!aliveRef.current) return;

    clearPreview();
    chunksRef.current = [];
    setSeconds(0);
    changePhase("idle");

    // Le serveur a déjà enregistré le message.
    // Ce callback ne fait que mettre à jour l’affichage.
    try {
      onSent?.(savedMessage);
    } catch (err) {
      console.error("[VOCAL] Actualisation de l’affichage :", err);
    }
  }

  const panelVisible = [
    "recording",
    "stopping",
    "preview",
    "uploading",
  ].includes(phase);

  return (
    <div className="onvm-recorder">
      <button
        type="button"
        className={`onvm-recorder__trigger ${
          phase === "recording" ? "is-recording" : ""
        }`}
        onClick={startRecording}
        disabled={phase !== "idle"}
        aria-label={
          phase === "requesting"
            ? "Autorisation du microphone en cours"
            : "Enregistrer un message vocal"
        }
      >
        {phase === "requesting" ? (
          <FiLoader className="onvm-recorder__spinner" />
        ) : (
          <FiMic />
        )}
      </button>

      {panelVisible && (
        <section
          className="onvm-recorder__panel"
          aria-label="Enregistrement vocal"
        >
          <div className="onvm-recorder__heading">
            <span>
              {phase === "recording" && (
                <span className="onvm-recorder__dot" aria-hidden="true" />
              )}

              {phase === "recording"
                ? "Enregistrement"
                : phase === "stopping"
                  ? "Préparation…"
                  : phase === "uploading"
                    ? "Envoi en cours…"
                    : "Écouter avant d’envoyer"}
            </span>

            <span className="onvm-recorder__timer">
              {formatDuration(seconds)}
            </span>
          </div>

          {previewUrl && (
            <audio
              ref={previewAudioRef}
              src={previewUrl}
              controls
              className="onvm-recorder__preview"
            />
          )}

          <div className="onvm-recorder__actions">
            <button
              type="button"
              className="onvm-recorder__discard"
              onClick={discardRecording}
              disabled={phase === "uploading" || phase === "stopping"}
            >
              <FiTrash2 />
              Supprimer
            </button>

            {phase === "recording" ? (
              <button
                type="button"
                className="onvm-recorder__stop"
                onClick={stopRecording}
              >
                <FiSquare />
                Arrêter
              </button>
            ) : (
              <button
                type="button"
                className="onvm-recorder__send"
                onClick={sendRecording}
                disabled={phase !== "preview"}
              >
                {phase === "uploading" || phase === "stopping" ? (
                  <FiLoader className="onvm-recorder__spinner" />
                ) : (
                  <FiSend />
                )}
                {phase === "uploading" ? "Envoi…" : "Envoyer"}
              </button>
            )}
          </div>

          {error && (
            <p className="onvm-recorder__error" role="alert">
              {error}
            </p>
          )}
        </section>
      )}

      {error && !panelVisible && (
        <div className="onvm-recorder__panel onvm-recorder__notice">
          <p className="onvm-recorder__error" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Fermer le message"
          >
            <FiX />
          </button>
        </div>
      )}
    </div>
  );
}