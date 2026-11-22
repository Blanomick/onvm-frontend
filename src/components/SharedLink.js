import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiHeart, FiMessageCircle, FiShare2, FiUser } from "react-icons/fi";
import ShareSheet from "./ShareSheet";
import RichText from "./discover/RichText";
import { DEFAULT_AVATAR, isDefaultAvatar } from "../utils/avatarFallback";
import "./SharedLink.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
export const AFTER_LOGIN_KEY = "onvm_after_login";

function rememberForLogin(path) {
  try {
    sessionStorage.setItem(AFTER_LOGIN_KEY, path);
    localStorage.setItem(AFTER_LOGIN_KEY, path);
  } catch {
    // ignore
  }
}

function Avatar({ src, size = 44 }) {
  return (
    <img
      className="onvm-shared__avatar"
      src={isDefaultAvatar(src) ? DEFAULT_AVATAR : src}
      data-avatar="true"
      alt=""
      width={size}
      height={size}
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(DEFAULT_AVATAR)) {
          event.currentTarget.src = DEFAULT_AVATAR;
        }
      }}
    />
  );
}

/**
 * Page ouverte par un lien de partage :
 *  /p/:code → publication     /u/:code → profil
 */
export default function SharedLink({ kind, user }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const path = `/${kind}/${code}`;

  useEffect(() => {
    let stopped = false;
    setData(null);
    setError("");
    fetch(`${apiUrl}/api/share/${kind}/${code}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Lien introuvable");
        return body;
      })
      .then((body) => {
        if (stopped) return;
        // Profil + utilisateur connecté : on ouvre directement le vrai profil
        if (kind === "u" && user) {
          navigate(`/profile/${body.id}`, { replace: true });
          return;
        }
        setData(body);
      })
      .catch((fetchError) => !stopped && setError(fetchError.message));
    return () => {
      stopped = true;
    };
  }, [kind, code, user, navigate]);

  const join = () => {
    rememberForLogin(path);
    navigate("/auth");
  };

  const openInApp = () => {
    if (!user) return join();
    if (kind === "p") navigate(`/profile/${data.userId}`);
    return undefined;
  };

  if (error) {
    return (
      <main className="onvm-shared">
        <div className="onvm-shared__card onvm-shared__center">
          <img src="/icons/icon-192.png" alt="ONVM" width="64" height="64" />
          <h1>{error}</h1>
          <p>Ce lien n’est plus valable ou le contenu a été retiré.</p>
          <button type="button" className="onvm-shared__cta" onClick={() => navigate(user ? "/publication" : "/auth")}>
            Aller sur ONVM
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="onvm-shared">
        <div className="onvm-shared__center">
          <span className="onvm-shared__spinner" aria-label="Chargement" />
        </div>
      </main>
    );
  }

  return (
    <main className="onvm-shared">
      <header className="onvm-shared__top">
        <button type="button" onClick={() => navigate(user ? "/publication" : "/auth")}>
          <img src="/icons/icon-192.png" alt="" width="30" height="30" />
          <strong>ONVM</strong>
        </button>
        {!user && (
          <button type="button" className="onvm-shared__login" onClick={join}>
            Se connecter
          </button>
        )}
      </header>

      {kind === "u" ? (
        <section className="onvm-shared__card onvm-shared__profile">
          <Avatar src={data.profilePicture} size={104} />
          <h1>{data.username}</h1>
          {data.bio && <p className="onvm-shared__bio">{data.bio}</p>}
          <div className="onvm-shared__stats">
            <span><b>{data.posts}</b> publications</span>
            <span><b>{data.followers}</b> abonnés</span>
          </div>
          <button type="button" className="onvm-shared__cta" onClick={join}>
            Suivre {data.username} sur ONVM
          </button>
          <button type="button" className="onvm-shared__ghost" onClick={() => setSharing(true)}>
            <FiShare2 /> Partager ce profil
          </button>
        </section>
      ) : (
        <article className="onvm-shared__card onvm-shared__post">
          <button type="button" className="onvm-shared__author" onClick={openInApp}>
            <Avatar src={data.author.profilePicture} />
            <span>
              <strong>{data.author.username}</strong>
              {data.created_at && (
                <small>
                  {new Date(data.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </small>
              )}
            </span>
          </button>

          {data.content && <RichText as="p" className="onvm-shared__text" text={data.content} />}

          {data.media.map((item, index) =>
            item.kind === "video" ? (
              <video
                key={index}
                className="onvm-shared__media"
                src={item.url}
                poster={item.poster || undefined}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img key={index} className="onvm-shared__media" src={item.url} alt="" loading="lazy" />
            )
          )}

          <footer className="onvm-shared__actions">
            <span><FiHeart /> {data.likes}</span>
            <span><FiMessageCircle /> {data.commentCount}</span>
            <button type="button" onClick={() => setSharing(true)}>
              <FiShare2 /> Partager
            </button>
          </footer>

          <button type="button" className="onvm-shared__cta" onClick={user ? () => navigate("/publication") : join}>
            {user ? "Ouvrir mon fil ONVM" : "Rejoindre ONVM pour aimer et commenter"}
          </button>
          {user && (
            <button type="button" className="onvm-shared__ghost" onClick={openInApp}>
              <FiUser /> Voir le profil de {data.author.username}
            </button>
          )}
        </article>
      )}

      {sharing && (
        <ShareSheet
          type={kind}
          id={kind === "u" ? data.id : data.id}
          title={kind === "u" ? `${data.username} sur ONVM` : `${data.author.username} sur ONVM`}
          text={kind === "u" ? `Suis ${data.username} sur ONVM` : (data.content || "").slice(0, 100)}
          name={kind === "u" ? data.username : ""}
          showQr={kind === "u"}
          currentUser={user}
          onClose={() => setSharing(false)}
        />
      )}
    </main>
  );
}
