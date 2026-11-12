import React, { useEffect, useRef, useState } from "react";
import {
  FiPhone,
  FiPhoneOff,
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiVolume2,
  FiVolumeX,
  FiUser,
} from "react-icons/fi";

function formatDuration(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function Avatar({ src, name }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className="oc-avatar">
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span aria-label={name}>
          {name && name !== "Votre contact" ? (
            name.charAt(0).toUpperCase()
          ) : (
            <FiUser />
          )}
        </span>
      )}
    </div>
  );
}

function Control({ icon: Icon, label, variant = "", ...props }) {
  return (
    <button
      type="button"
      className={`oc-control ${variant}`}
      aria-label={label}
      {...props}
    >
      <span className="oc-control-circle">
        <Icon aria-hidden="true" />
      </span>
      <span className="oc-control-label">{label}</span>
    </button>
  );
}

export default function CallScreen({
  call,
  photoUrl,
  soundEnabled,
  enableSound,
  actions,
  MediaView,
}) {
  const dialogRef = useRef(null);
  const [seconds, setSeconds] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);

  const name = call.peer?.username || "Votre contact";
  const incoming = call.phase === "incoming";
  const video = call.type === "video";
  const videoLayout = video && Boolean(call.local) && !incoming;
  const connected = call.phase === "connected";
  const hasRemoteVideo = Boolean(call.remote?.getVideoTracks().length);

  const labels = {
    incoming: video ? "Appel vidéo entrant" : "Appel vocal entrant",
    preparing: video
      ? "Préparation de la caméra…"
      : "Préparation du microphone…",
    dialing: "Envoi de l’appel…",
    ringing: "En attente de réponse…",
    connecting: "Connexion…",
    connected: "En communication",
    reconnecting: "Reconnexion en cours…",
  };

  useEffect(() => {
    if (!call.connectedAt) {
      setSeconds(0);
      return;
    }

    const tick = () => {
      setSeconds(
        Math.max(0, Math.floor((Date.now() - call.connectedAt) / 1000))
      );
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [call.connectedAt]);

  // Empêche la page de défiler derrière l’appel et garde le clavier
  // dans la fenêtre jusqu’au raccrochage.
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key !== "Tab") return;

      const elements = Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not(:disabled), select:not(:disabled), [tabindex="0"]'
        ) || []
      ).filter((element) => element.getClientRects().length > 0);

      if (!elements.length) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement;

      if (
        event.shiftKey &&
        (current === first || !elements.includes(current))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (current === last || !elements.includes(current))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    const dialog = dialogRef.current;
    dialog?.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      dialog?.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div className="oc-overlay">
      <section
        ref={dialogRef}
        className={`oc-screen ${videoLayout ? "oc-screen-video" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="oc-call-name"
        aria-describedby="oc-call-status"
        tabIndex={-1}
      >
        {videoLayout && hasRemoteVideo && (
          <div className="oc-remote">
            <MediaView
              stream={call.remote}
              video
              muted
              className="oc-remote-video"
            />
          </div>
        )}

        <header className="oc-header">
          <span className="oc-brand">ONVM</span>
          <span className="oc-call-kind">
            {video ? <FiVideo /> : <FiPhone />}
            {video ? "Appel vidéo" : "Appel vocal"}
          </span>
        </header>

        <div className="oc-identity">
          {(!videoLayout || !hasRemoteVideo) && (
            <div
              className={`oc-avatar-wrap ${
                incoming || call.phase === "ringing" ? "oc-ringing" : ""
              }`}
            >
              <Avatar src={photoUrl} name={name} />
            </div>
          )}

          <h2 id="oc-call-name">{name}</h2>

          <p id="oc-call-status" role="status">
            {labels[call.phase] || "Connexion…"}
          </p>

          {call.connectedAt && (
            <span className="oc-duration" aria-label="Durée de l’appel">
              {formatDuration(seconds)}
            </span>
          )}

          {call.local && !call.microphone && (
            <span className="oc-muted-label">
              <FiMicOff /> Ton micro est coupé
            </span>
          )}
        </div>

        {videoLayout && (
          <div className="oc-local">
            {call.camera ? (
              <MediaView
                stream={call.local}
                video
                muted
                className="oc-local-video"
              />
            ) : (
              <div className="oc-local-off">
                <FiVideoOff />
                <span>Caméra coupée</span>
              </div>
            )}
            <span className="oc-local-caption">Toi</span>
          </div>
        )}

        {/* Une seule sortie audio distante, même pendant un appel vidéo. */}
        {call.remote && (
          <div className="oc-audio">
            <MediaView stream={call.remote} muted={soundMuted} />
          </div>
        )}

        <footer className="oc-footer">
          {incoming && !soundEnabled && (
            <button
              type="button"
              className="oc-enable-sound"
              onClick={enableSound}
            >
              <FiVolume2 /> Activer la sonnerie
            </button>
          )}

          {videoLayout && (
            <label className="oc-quality">
              <span>Qualité souhaitée</span>
              <select
                value={call.requestedQuality || "1080"}
                disabled={call.changingQuality}
                onChange={(event) =>
                  actions.current.quality?.(event.target.value)
                }
              >
                <option value="720">HD · 720p</option>
                <option value="1080">Full HD · 1080p</option>
                <option value="2160">4K si disponible</option>
              </select>
            </label>
          )}

          {incoming ? (
            <div className="oc-incoming-controls">
              <Control
                icon={FiPhoneOff}
                label="Refuser"
                variant="oc-danger"
                onClick={() => actions.current.decline?.()}
              />
              <Control
                icon={video ? FiVideo : FiPhone}
                label="Accepter"
                variant="oc-answer"
                onClick={() => {
                  enableSound();
                  actions.current.accept?.();
                }}
              />
            </div>
          ) : (
            <>
              <div className="oc-controls">
                {call.local && (
                  <>
                    <Control
                      icon={call.microphone ? FiMic : FiMicOff}
                      label={call.microphone ? "Micro" : "Micro coupé"}
                      variant={!call.microphone ? "oc-selected" : ""}
                      aria-pressed={!call.microphone}
                      onClick={() => actions.current.microphone?.()}
                    />

                    <Control
                      icon={soundMuted ? FiVolumeX : FiVolume2}
                      label={soundMuted ? "Son coupé" : "Son"}
                      variant={soundMuted ? "oc-selected" : ""}
                      aria-pressed={soundMuted}
                      onClick={() => setSoundMuted((value) => !value)}
                    />

                    {video && (
                      <Control
                        icon={call.camera ? FiVideo : FiVideoOff}
                        label={call.camera ? "Caméra" : "Caméra coupée"}
                        variant={!call.camera ? "oc-selected" : ""}
                        aria-pressed={!call.camera}
                        onClick={() => actions.current.camera?.()}
                      />
                    )}
                  </>
                )}

                {videoLayout && (
                  <Control
                    icon={FiPhoneOff}
                    label="Raccrocher"
                    variant="oc-danger"
                    onClick={() => actions.current.end?.()}
                  />
                )}
              </div>

              {!videoLayout && (
                <div className="oc-hangup">
                  <Control
                    icon={FiPhoneOff}
                    label={connected || call.connectedAt ? "Raccrocher" : "Annuler"}
                    variant="oc-danger"
                    onClick={() => actions.current.end?.()}
                  />
                </div>
              )}
            </>
          )}
        </footer>
      </section>
    </div>
  );
}