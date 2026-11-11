import React, { useEffect, useRef, useState } from "react";
import { FiPlay, FiPause, FiLoader, FiRotateCw } from "react-icons/fi";
import "./VoiceMessageBubble.css";

// Un seul lecteur vocal actif à la fois.
let activeVoiceAudio = null;

const SPEEDS = [1, 1.5, 2];

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return "--:--";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function VoiceMessageBubble(props) {
  // Réinitialise le lecteur si le fichier change.
  return <VoicePlayer key={props.src || "empty"} {...props} />;
}

function VoicePlayer({ src, isOwn = false, autoPlay = false }) {
  const audioRef = useRef(null);
  const mountedRef = useRef(false);
  const pendingPlayRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");

  const hasDuration = Number.isFinite(duration) && duration > 0;
  const progress = hasDuration
    ? Math.min(100, (currentTime / duration) * 100)
    : 0;

  async function startPlayback() {
    const audio = audioRef.current;

    if (!audio || pendingPlayRef.current) return;

    if (!src) {
      setError("Ce message vocal ne contient aucun fichier audio.");
      return;
    }

    pendingPlayRef.current = true;
    setError("");
    setBuffering(true);

    try {
      // Recharge le fichier si une précédente tentative a échoué.
      if (audio.error) audio.load();
      if (audio.ended) audio.currentTime = 0;

      await audio.play();
    } catch (err) {
      if (!mountedRef.current) return;

      setPlaying(false);
      setBuffering(false);

      if (err.name !== "AbortError") {
        setError(
          err.name === "NotAllowedError"
            ? "Appuie sur lecture pour écouter ce message."
            : "Lecture impossible. Vérifie ta connexion puis réessaie."
        );
      }
    } finally {
      pendingPlayRef.current = false;
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    const audio = audioRef.current;

    return () => {
      mountedRef.current = false;

      if (audio) audio.pause();

      if (activeVoiceAudio === audio) {
        activeVoiceAudio = null;
      }
    };
  }, []);

  function updateDuration() {
    const value = audioRef.current?.duration;

    setDuration(Number.isFinite(value) && value > 0 ? value : 0);
  }

  function handlePlay() {
    const audio = audioRef.current;

    if (activeVoiceAudio && activeVoiceAudio !== audio) {
      activeVoiceAudio.pause();
    }

    activeVoiceAudio = audio;
    setPlaying(true);
    setError("");
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
    } else {
      startPlayback();
    }
  }

  function handleSeek(event) {
    const audio = audioRef.current;
    if (!audio || !hasDuration) return;

    const nextTime = Math.max(
      0,
      Math.min(duration, Number(event.target.value))
    );

    try {
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
    } catch {
      setError("Le déplacement dans ce vocal n’est pas encore disponible.");
    }
  }

  function changeSpeed() {
    const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    const audio = audioRef.current;

    if (audio) {
      audio.playbackRate = nextSpeed;
      audio.preservesPitch = true;
    }

    setSpeed(nextSpeed);
  }

  function handleEnded() {
    setPlaying(false);
    setBuffering(false);

    if (activeVoiceAudio === audioRef.current) {
      activeVoiceAudio = null;
    }
  }

  return (
    <div
      className={`onvm-voice ${isOwn ? "onvm-voice--own" : ""}`}
      role="group"
      aria-label="Message vocal"
    >
      <audio
        ref={audioRef}
        src={src || undefined}
        preload="metadata"
        autoPlay={autoPlay}
        onLoadedMetadata={updateDuration}
        onDurationChange={updateDuration}
        onTimeUpdate={(event) => {
          const time = event.currentTarget.currentTime;
          setCurrentTime(Number.isFinite(time) ? time : 0);
        }}
        onPlay={handlePlay}
        onPlaying={() => setBuffering(false)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPause={() => {
          setPlaying(false);
          setBuffering(false);
        }}
        onEnded={handleEnded}
        onError={() => {
          setPlaying(false);
          setBuffering(false);
          setError("Audio indisponible ou format non pris en charge.");
        }}
      />

      <div className="onvm-voice__row">
        <button
          type="button"
          className="onvm-voice__play"
          onClick={togglePlayback}
          aria-label={
            error
              ? "Réessayer la lecture"
              : playing
                ? "Mettre le vocal en pause"
                : "Écouter le vocal"
          }
        >
          {error ? (
            <FiRotateCw aria-hidden="true" />
          ) : buffering ? (
            <FiLoader className="onvm-voice__spinner" aria-hidden="true" />
          ) : playing ? (
            <FiPause aria-hidden="true" />
          ) : (
            <FiPlay aria-hidden="true" />
          )}
        </button>

        <div className="onvm-voice__content">
          <input
            type="range"
            className="onvm-voice__progress"
            min="0"
            max={hasDuration ? duration : 1}
            step="0.1"
            value={hasDuration ? Math.min(currentTime, duration) : 0}
            disabled={!hasDuration}
            onChange={handleSeek}
            style={{ "--voice-progress": `${progress}%` }}
            aria-label="Position de lecture du message vocal"
            aria-valuetext={
              hasDuration
                ? `${formatTime(currentTime)} sur ${formatTime(duration)}`
                : "Durée indisponible"
            }
          />

          <div className="onvm-voice__details">
            <span className="onvm-voice__time">
              {formatTime(currentTime)}
              <span className="onvm-voice__duration">
                {" / "}
                {hasDuration ? formatTime(duration) : "--:--"}
              </span>
            </span>

            <button
              type="button"
              className="onvm-voice__speed"
              onClick={changeSpeed}
              aria-label={`Vitesse ${speed}. Changer la vitesse de lecture`}
              title="Changer la vitesse"
            >
              {String(speed).replace(".", ",")}×
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="onvm-voice__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}