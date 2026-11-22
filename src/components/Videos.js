import React, { useCallback, useEffect, useRef, useState } from "react";
import ShareSheet from "./ShareSheet";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiVolume2,
  FiVolumeX,
  FiPlus,
  FiPlay,
} from "react-icons/fi";

import ProfileAvatar from "./ProfileAvatar";
import CommentsSection from "./CommentsSection";
import BottomNav from "./BottomNav";
import SmartVideo from "./SmartVideo";
import "./Videos.css";
import RichText from "./discover/RichText";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
const PAGE_SIZE = 6;

function formatCount(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")} k`;
  return String(n);
}

function VideoSlide({
  item,
  active,
  near,
  muted,
  onToggleMute,
  onLike,
  onOpenComments,
  onShare,
  onOpenProfile,
}) {
  const videoRef = useRef(null);
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Lecture automatique de la vidéo visible uniquement
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (active) {
      video.muted = muted;
      const attempt = video.play();
      if (attempt?.catch) {
        attempt.catch(() => {
          // Le navigateur bloque le son : on relance en muet
          video.muted = true;
          video.play().catch(() => setPaused(true));
        });
      }
      setPaused(false);
    } else {
      video.pause();
      if (!near) video.currentTime = 0;
    }
  }, [active, near, muted]);

  useEffect(() => () => clearTimeout(tapTimerRef.current), []);

  const handleTap = () => {
    const now = Date.now();

    if (now - lastTapRef.current < 280) {
      // Double tap : j’aime
      clearTimeout(tapTimerRef.current);
      lastTapRef.current = 0;
      setBurst((value) => value + 1);
      if (!item.userHasLiked) onLike(item);
      return;
    }

    lastTapRef.current = now;
    tapTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
        video.play().catch(() => {});
        setPaused(false);
      } else {
        video.pause();
        setPaused(true);
      }
    }, 280);
  };

  const caption = (item.content || "").trim();

  return (
    <section className="onvm-reel" aria-label={`Vidéo de ${item.username || "ONVM"}`}>
      <div className="onvm-reel__stage" onClick={handleTap}>
        {failed ? (
          <div className="onvm-reel__failed">Cette vidéo ne peut pas être lue.</div>
        ) : (
          near || active ? (
            <SmartVideo
              ref={videoRef}
              className="onvm-reel__video"
              media={item.video}
              loop
              muted={muted}
              preload={active ? "auto" : "metadata"}
              onTimeUpdate={(event) => {
                const v = event.currentTarget;
                if (v.duration) setProgress((v.currentTime / v.duration) * 100);
              }}
              onFail={() => setFailed(true)}
            />
          ) : (
            <div
              className="onvm-reel__video onvm-reel__poster"
              style={item.video.thumbnail ? { backgroundImage: `url(${item.video.thumbnail})` } : undefined}
            />
          )
        )}

        {paused && !failed && (
          <span className="onvm-reel__paused" aria-hidden="true">
            <FiPlay />
          </span>
        )}

        {burst > 0 && (
          <span key={burst} className="onvm-reel__burst" aria-hidden="true">
            <FiHeart />
          </span>
        )}
      </div>

      <aside className="onvm-reel__actions">
        <button
          type="button"
          className="onvm-reel__avatar"
          onClick={() => onOpenProfile(item)}
          aria-label={`Profil de ${item.username || "l’auteur"}`}
        >
          <ProfileAvatar src={item.profilePicture} name={item.username} size={46} />
        </button>

        <button
          type="button"
          className={`onvm-reel__action ${item.userHasLiked ? "is-liked" : ""}`}
          onClick={() => onLike(item)}
          aria-pressed={item.userHasLiked}
          aria-label="J’aime"
        >
          <FiHeart />
          <span>{formatCount(item.likeCount)}</span>
        </button>

        <button
          type="button"
          className="onvm-reel__action"
          onClick={() => onOpenComments(item)}
          aria-label="Commentaires"
        >
          <FiMessageCircle />
          <span>{formatCount(item.commentCount)}</span>
        </button>

        <button
          type="button"
          className="onvm-reel__action"
          onClick={() => onShare(item)}
          aria-label="Partager"
        >
          <FiShare2 />
          <span>Partager</span>
        </button>

        <button
          type="button"
          className="onvm-reel__action"
          onClick={onToggleMute}
          aria-label={muted ? "Activer le son" : "Couper le son"}
        >
          {muted ? <FiVolumeX /> : <FiVolume2 />}
        </button>
      </aside>

      <footer className="onvm-reel__info">
        <button
          type="button"
          className="onvm-reel__author"
          onClick={() => onOpenProfile(item)}
        >
          @{item.username || "onvm"}
        </button>

        {caption && (
          <p
            className={`onvm-reel__caption ${expanded ? "is-expanded" : ""}`}
            onClick={() => setExpanded((value) => !value)}
          >
            <RichText text={caption} />
          </p>
        )}
      </footer>

      <div className="onvm-reel__progress" aria-hidden="true">
        <span style={{ width: `${active ? progress : 0}%` }} />
      </div>
    </section>
  );
}

export default function Videos({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const feedRef = useRef(null);
  const loadingRef = useRef(false);

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(undefined);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState(null);
  const [toast, setToast] = useState("");
  const [shareFor, setShareFor] = useState(null);

  const userId = user?.id;
  const startId = Number(new URLSearchParams(location.search).get("v")) || null;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || done || !apiUrl) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const before = cursor === undefined ? (startId ? startId + 1 : undefined) : cursor;
      const { data } = await axios.get(`${apiUrl}/api/publications/videos`, {
        params: { userId, limit: PAGE_SIZE, before },
        timeout: 20000,
      });

      const incoming = Array.isArray(data?.items) ? data.items : [];
      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.id));
        return [...previous, ...incoming.filter((item) => !seen.has(item.id))];
      });
      setCursor(data?.nextCursor ?? null);
      if (!data?.nextCursor) setDone(true);
    } catch {
      setError("Impossible de charger les vidéos. Vérifie ta connexion.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor, done, startId, userId]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Détecte la vidéo visible
  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(Number(entry.target.dataset.index));
          }
        });
      },
      { root, threshold: 0.65 }
    );

    root.querySelectorAll("[data-index]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items.length]);

  // Charge la suite avant d’arriver au bout
  useEffect(() => {
    if (items.length && activeIndex >= items.length - 2) loadMore();
  }, [activeIndex, items.length, loadMore]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateItem = (id, patch) =>
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

  const handleLike = async (item) => {
    if (!userId) {
      navigate("/auth");
      return;
    }

    const liked = !item.userHasLiked;
    updateItem(item.id, {
      userHasLiked: liked,
      likeCount: Math.max(0, item.likeCount + (liked ? 1 : -1)),
    });

    try {
      if (liked) {
        await axios.post(`${apiUrl}/api/publications/${item.id}/like`, { userId });
      } else {
        await axios.delete(`${apiUrl}/api/publications/${item.id}/like`, {
          data: { userId },
        });
      }
    } catch (likeError) {
      // "déjà liké" n’est pas une vraie erreur
      if (liked && likeError.response?.status === 400) return;
      updateItem(item.id, {
        userHasLiked: item.userHasLiked,
        likeCount: item.likeCount,
      });
      setToast("Action impossible pour le moment.");
    }
  };

  // Lien unique de la vidéo + WhatsApp, Facebook, amis ONVM…
  const handleShare = (item) => setShareFor(item);

  const openComments = async (item) => {
    setCommentsFor({ ...item, comments: item.comments || [] });
    try {
      const { data } = await axios.get(`${apiUrl}/api/publications/${item.id}/comments`);
      if (Array.isArray(data)) {
        setCommentsFor((current) =>
          current?.id === item.id ? { ...current, comments: data } : current
        );
        updateItem(item.id, { commentCount: data.length, comments: data });
      }
    } catch {
      // la section affiche ce qu’elle a
    }
  };

  return (
    <main className="onvm-videos">
      <header className="onvm-videos__top">
        <button type="button" onClick={() => navigate(-1)} aria-label="Retour">
          <FiArrowLeft />
        </button>
        <h1>Vidéos</h1>
        <button
          type="button"
          onClick={() => navigate("/create-publication")}
          aria-label="Publier une vidéo"
        >
          <FiPlus />
        </button>
      </header>

      <div className="onvm-videos__feed" ref={feedRef}>
        {items.map((item, index) => (
          <div key={item.id} data-index={index} className="onvm-videos__slot">
            <VideoSlide
              item={item}
              active={index === activeIndex && !commentsFor && !shareFor}
              near={Math.abs(index - activeIndex) <= 1}
              muted={muted}
              onToggleMute={() => setMuted((value) => !value)}
              onLike={handleLike}
              onOpenComments={openComments}
              onShare={handleShare}
              onOpenProfile={(target) => navigate(`/profile/${target.userId}`)}
            />
          </div>
        ))}

        {!items.length && !loading && !error && (
          <div className="onvm-videos__empty">
            <p>Aucune vidéo pour l’instant.</p>
            <button type="button" onClick={() => navigate("/create-publication")}>
              Publier la première vidéo
            </button>
          </div>
        )}

        {loading && !items.length && (
          <div className="onvm-videos__empty">
            <span className="onvm-videos__spinner" aria-label="Chargement" />
          </div>
        )}

        {error && (
          <div className="onvm-videos__empty">
            <p>{error}</p>
            <button type="button" onClick={loadMore}>
              Réessayer
            </button>
          </div>
        )}
      </div>

      {commentsFor && (
        <div
          className="onvm-videos__sheet-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCommentsFor(null);
          }}
        >
          <div className="onvm-videos__sheet" role="dialog" aria-label="Commentaires">
            <CommentsSection
              key={commentsFor.id}
              publication={commentsFor}
              user={user}
              onClose={() => setCommentsFor(null)}
              onUpdated={(comments) => {
                setCommentsFor((current) => (current ? { ...current, comments } : current));
                updateItem(commentsFor.id, {
                  comments,
                  commentCount: comments.length,
                });
              }}
            />
          </div>
        </div>
      )}

      {shareFor && (
        <ShareSheet
          type="p"
          id={shareFor.id}
          title={`Vidéo de @${shareFor.username || "ONVM"}`}
          text={(shareFor.content || "Regarde cette vidéo sur ONVM").slice(0, 100)}
          currentUser={user}
          onClose={() => setShareFor(null)}
        />
      )}

      {toast && (
        <div className="onvm-videos__toast" role="status">
          {toast}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
