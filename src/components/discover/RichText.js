import React from "react";
import { useNavigate } from "react-router-dom";
import "./Discover.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

// #hashtag, @mention et liens rendus cliquables dans un texte
const TOKEN_RE =
  /(https?:\/\/[^\s<>"']+)|(^|[^\p{L}\p{N}_&/#])#([\p{L}\p{N}_]{2,40})|(^|[^\p{L}\p{N}_@/.])@([\p{L}\p{N}_.'’-]{2,40})/gu;

export function normalizeTag(tag) {
  return String(tag || "")
    .replace(/^#/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const userCache = new Map();

export async function openMention(name, navigate) {
  const key = String(name).toLowerCase();
  try {
    let id = userCache.get(key);
    if (!id) {
      const response = await fetch(`${apiUrl}/api/discover/user/${encodeURIComponent(key)}`);
      if (!response.ok) throw new Error("introuvable");
      id = (await response.json()).id;
      userCache.set(key, id);
    }
    navigate(`/profile/${id}`);
  } catch {
    window.alert(`@${name} n’existe pas sur ONVM.`);
  }
}

export default function RichText({ text, as: Tag = "span", className }) {
  const navigate = useNavigate();
  const value = String(text || "");
  const nodes = [];
  let last = 0;
  let key = 0;

  for (const match of value.matchAll(TOKEN_RE)) {
    const [whole, url, tagPrefix, tag, mentionPrefix, mention] = match;
    const prefix = tagPrefix ?? mentionPrefix ?? "";
    const start = match.index + (url ? 0 : prefix.length);
    if (start > last) nodes.push(value.slice(last, start));

    if (url) {
      const clean = url.replace(/[.,!?;:)]+$/, "");
      nodes.push(
        <a key={key++} href={clean} target="_blank" rel="noopener noreferrer" className="onvm-rich-link">
          {clean}
        </a>
      );
      last = match.index + clean.length;
      continue;
    }

    if (tag && !/^\d+$/.test(tag)) {
      nodes.push(
        <button
          key={key++}
          type="button"
          className="onvm-rich-tag"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/hashtag/${encodeURIComponent(normalizeTag(tag))}`);
          }}
        >
          #{tag}
        </button>
      );
      last = match.index + whole.length;
      continue;
    }

    if (mention) {
      const name = mention.replace(/[.'’-]+$/, "");
      nodes.push(
        <button
          key={key++}
          type="button"
          className="onvm-rich-mention"
          onClick={(event) => {
            event.stopPropagation();
            openMention(name, navigate);
          }}
        >
          @{name}
        </button>
      );
      last = match.index + prefix.length + 1 + name.length;
      continue;
    }

    // #123 : laissé tel quel
    nodes.push(value.slice(start, match.index + whole.length));
    last = match.index + whole.length;
  }
  if (last < value.length) nodes.push(value.slice(last));

  return <Tag className={className}>{nodes}</Tag>;
}
