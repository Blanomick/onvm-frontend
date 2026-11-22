import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import BottomNav from "../BottomNav";
import ShareSheet from "../ShareSheet";
import PostCard from "./PostCard";
import "./Discover.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

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
          <PostCard key={post.id} post={post} onShare={(item) => setShareId(item.id)} />
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
