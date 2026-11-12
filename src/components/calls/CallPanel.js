import React from "react";
import { FiPhone, FiVideo } from "react-icons/fi";
import { useCalls } from "./CallProvider";
import "./Calls.css";

export default function CallPanel({ chatId }) {
  const calls = useCalls();

  const unavailable =
    !calls?.ready || Boolean(calls?.inCall) || !chatId;

  const reason = !calls?.ready
    ? "Connexion au serveur d’appels en cours"
    : calls?.inCall
      ? "Un appel est déjà en cours"
      : !chatId
        ? "Conversation indisponible"
        : "";

  return (
    <div className="oc-launchers" aria-label="Appeler ce contact">
      <button
        type="button"
        disabled={unavailable}
        title={reason || "Appel vocal"}
        aria-label="Démarrer un appel vocal"
        onClick={() => calls.startCall(chatId, "audio")}
      >
        <FiPhone aria-hidden="true" />
      </button>

      <button
        type="button"
        disabled={unavailable}
        title={reason || "Appel vidéo"}
        aria-label="Démarrer un appel vidéo"
        onClick={() => calls.startCall(chatId, "video")}
      >
        <FiVideo aria-hidden="true" />
      </button>
    </div>
  );
}