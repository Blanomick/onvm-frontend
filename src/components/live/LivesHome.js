import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiEye, FiRadio } from "react-icons/fi";
import BottomNav from "../BottomNav";
import { avatarUrl, connectLives, request } from "./liveSocket";
import "./Live.css";

function since(startedAt) {
  const minutes = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
  return minutes < 1 ? "à l’instant" : `depuis ${minutes} min`;
}

// Liste des lives en cours
export default function LivesHome() {
  const navigate = useNavigate();
  const [lives, setLives] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = connectLives();
    socket.on("connect", () => {
      request(socket, "live:list")
        .then((result) => setLives(result.lives))
        .catch((listError) => setError(listError.message));
    });
    socket.on("connect_error", (connectError) => setError(connectError.message));
    socket.on("live:list", setLives);
    return () => socket.disconnect();
  }, []);

  return (
    <main className="onvm-lives">
      <header className="onvm-lives__top">
        <button type="button" onClick={() => navigate(-1)} aria-label="Retour">
          <FiArrowLeft />
        </button>
        <h1>Lives</h1>
        <span />
      </header>

      <button type="button" className="onvm-lives__go" onClick={() => navigate("/lives/new")}>
        <FiRadio /> Lancer un live
      </button>

      {error && <p className="onvm-lives__empty">{error}</p>}
      {!lives && !error && <span className="onvm-lives__spinner" />}
      {lives && lives.length === 0 && (
        <div className="onvm-lives__empty">
          <FiRadio size={34} />
          <p>Personne n’est en direct pour le moment.</p>
          <p>Lance le premier live : tes abonnés seront prévenus !</p>
        </div>
      )}

      <div className="onvm-lives__grid">
        {(lives || []).map((live) => (
          <button
            key={live.id}
            type="button"
            className="onvm-lives__card"
            onClick={() => navigate(`/lives/${live.id}`)}
          >
            <span className="onvm-live-badge">EN DIRECT</span>
            <img src={avatarUrl(live.host.profilePicture)} alt="" data-avatar="true" />
            <strong>{live.host.username}</strong>
            <span className="onvm-lives__title">{live.title}</span>
            <small>
              <FiEye /> {live.viewers} · {since(live.startedAt)}
              {live.full ? " · complet" : ""}
            </small>
          </button>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
