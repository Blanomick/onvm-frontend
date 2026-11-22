import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import BottomNav from "../BottomNav";
import ShareSheet from "../ShareSheet";
import RichText from "./RichText";
import "./Discover.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

function mediaUrl(url) {
  if (!url) return "";
  return /^https?:\/\//.test(url) ? url : `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function isVideo(item) {
  return /video/i.test(item.kind || item.type || "") || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(item.url || "");
}

// Toutes les publications d'un #hashtag
export default function HashtagFeed({ user }) {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [shareId, setShareId] = useState(null);

  useEffect(() => {
    setPosts(null);
    setError("");
    const params = new URLSearchParams({ tag, limit: "100" });
    if (user?.id) params.set("userId", user.id);
    fetch(`${apiUrl}/api/publications?${params}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setPosts)
      .catch(() => setError("Impossible de charger les publications."));
  }, [tag, user?.id]);

  return (
    <main className="onvm-discover">
      <header className="onvm-discover__top">
        <button type="button" onClick={() => navigate(-1)} aria-label="Retour">
          <FiArrowLeft />
        </button>
        <h1>#{tag}</h1>
        <button type="button" onClick={() => navigate("/tendances")} className="onvm-discover__link">
          Tendances
        </button>
      </header>

      {posts && (
        <p className="onvm-discover__count">
          {posts.length} publication{posts.length > 1 ? "s" : ""}
        </p>
      )}
      {error && <p className="onvm-discover__empty">{error}</p>}
      {!posts && !error && <span className="onvm-discover__spinner" />}
      {posts && posts.length === 0 && (
        <div className="onvm-discover__empty">
          <p>Personne n’a encore utilisé #{tag}.</p>
          <button type="button" onClick={() => navigate("/create-publication")}>
            Sois le premier à publier
          </button>
        </div>
      )}

      <div className="onvm-tagfeed">
        {(posts || []).map((post) => (
          <article key={post.id} className="onvm-tagpost">
            <button
              type="button"
              className="onvm-tagpost__author"
              onClick={() => navigate(`/profile/${post.userId}`)}
            >
              <img src={mediaUrl(post.profilePicture) || "/default-profile.svg"} alt="" data-avatar="true" />
              <span>
                <strong>{post.username || "Membre ONVM"}</strong>
                <small>
                  {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                </small>
              </span>
            </button>

            {post.content && <RichText as="p" className="onvm-tagpost__text" text={post.content} />}

            {(post.media || []).slice(0, 1).map((item, index) =>
              isVideo(item) ? (
                <video key={index} src={mediaUrl(item.url)} controls playsInline preload="metadata" />
              ) : (
                <img key={index} src={mediaUrl(item.url)} alt="" loading="lazy" />
              )
            )}

            <footer>
              <span><FiHeart /> {post.likeCount || 0}</span>
              <span><FiMessageCircle /> {(post.comments || []).length}</span>
              <button type="button" onClick={() => setShareId(post.id)}>
                <FiShare2 /> Partager
              </button>
            </footer>
          </article>
        ))}
      </div>

      {shareId && (
        <ShareSheet
          type="p"
          id={shareId}
          title={`#${tag} sur ONVM`}
          text={`Regarde ça sur ONVM #${tag}`}
          currentUser={user}
          onClose={() => setShareId(null)}
        />
      )}

      <BottomNav />
    </main>
  );
}
