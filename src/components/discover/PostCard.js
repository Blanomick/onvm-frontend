import React from "react";
import { useNavigate } from "react-router-dom";
import { FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import RichText from "./RichText";
import "./Discover.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

export function mediaUrl(url) {
  if (!url) return "";
  return /^https?:\/\//.test(url) ? url : `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function isVideo(item) {
  return /video/i.test(item.kind || item.type || "") || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(item.url || "");
}

// Carte de publication simple (pages hashtag, Près de moi…)
export default function PostCard({ post, onShare }) {
  const navigate = useNavigate();
  return (
    <article className="onvm-tagpost">
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
        {onShare && (
          <button type="button" onClick={() => onShare(post)}>
            <FiShare2 /> Partager
          </button>
        )}
      </footer>
    </article>
  );
}
