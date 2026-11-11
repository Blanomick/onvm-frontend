import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiEdit3, FiSearch, FiPlus, FiX } from "react-icons/fi";
import "./Conversations.css";
import BottomNav from "./BottomNav";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const tabs = [
  { id: "principal", label: "Principal" },
  { id: "demandes", label: "Demandes" },
  { id: "groupes", label: "Groupes" },
];

function resolveMediaUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value, `${apiUrl}/`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function ConversationAvatar({ name, source }) {
  const [failedSource, setFailedSource] = useState(null);
  const url = resolveMediaUrl(source);

  return (
    <span className="onvm-inbox-avatar">
      <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>

      {url && failedSource !== url && (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setFailedSource(url)}
        />
      )}
    </span>
  );
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Hier";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== today.getFullYear()
      ? { year: "numeric" }
      : {}),
  });
}

function previewText(value) {
  if (!value) return "Commencez la conversation.";

  const text = String(value);

  if (/<(img|video|audio)\b/i.test(text)) {
    return "Média partagé";
  }

  return text;
}

const Conversations = ({ currentUser }) => {
  const navigate = useNavigate();
  const userId = currentUser?.id;

  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState("principal");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setConversations([]);
    setError("");

    if (!userId) {
      setLoading(false);
      return;
    }

    let active = true;
    let fetching = false;
    const controller = new AbortController();

    setLoading(true);

    const fetchConversations = async () => {
      if (fetching || document.hidden) return;
      fetching = true;

      try {
        const { data } = await axios.get(
          `${apiUrl}/api/conversations/${userId}`,
          {
            signal: controller.signal,
            timeout: 15000,
          }
        );

        if (!Array.isArray(data)) {
          throw new Error("Réponse de conversations invalide.");
        }

        if (active) {
          setConversations(data);
          setError("");
        }
      } catch (err) {
        if (active && !axios.isCancel(err)) {
          console.error("[CONVERSATIONS]", err);
          setError("Impossible d’actualiser les conversations.");
        }
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    };

    fetchConversations();

    const interval = window.setInterval(fetchConversations, 5000);

    window.addEventListener("focus", fetchConversations);
    document.addEventListener("visibilitychange", fetchConversations);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", fetchConversations);
      document.removeEventListener("visibilitychange", fetchConversations);
    };
  }, [userId, retry]);

  const search = query.trim().toLocaleLowerCase("fr");

  const filteredConversations = conversations
    .filter((conversation) => {
      const matchesTab =
        activeTab === "principal"
          ? !conversation.is_request && !conversation.is_group
          : activeTab === "demandes"
            ? conversation.is_request && !conversation.is_group
            : conversation.is_group;

      const searchableText = [
        conversation.groupName,
        conversation.username,
        previewText(conversation.last_message),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");

      return matchesTab && (!search || searchableText.includes(search));
    })
    .sort((a, b) => {
      const timeA = Date.parse(a.last_message_time) || 0;
      const timeB = Date.parse(b.last_message_time) || 0;
      return timeB - timeA;
    });

  return (
    <main className="onvm-inbox">
      <div className="onvm-inbox-content">
        <header className="onvm-inbox-header">
          <h1>Messages</h1>

          <button
            type="button"
            className="onvm-inbox-compose"
            onClick={() => navigate("/search")}
            aria-label="Rechercher une personne pour lui écrire"
          >
            <FiEdit3 aria-hidden="true" />
          </button>
        </header>

        <div className="onvm-inbox-search">
          <FiSearch aria-hidden="true" />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une conversation"
            aria-label="Rechercher une conversation"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
            >
              <FiX aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          className="onvm-inbox-filters"
          role="group"
          aria-label="Filtrer les conversations"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "is-active" : ""}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "groupes" && userId && (
          <button
            type="button"
            className="onvm-inbox-create-group"
            onClick={() => navigate("/groups/create")}
          >
            <FiPlus aria-hidden="true" />
            Créer un groupe
          </button>
        )}

        {error && (
          <div className="onvm-inbox-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setRetry((value) => value + 1)}>
              Réessayer
            </button>
          </div>
        )}

        {!userId ? (
          <div className="onvm-inbox-empty">
            <h2>Retrouve tes conversations</h2>
            <p>Connecte-toi pour accéder à tes messages.</p>
            <button type="button" onClick={() => navigate("/auth")}>
              Se connecter
            </button>
          </div>
        ) : loading ? (
          <p className="onvm-inbox-status" role="status">
            Chargement des conversations…
          </p>
        ) : filteredConversations.length > 0 ? (
          <ul className="onvm-inbox-list">
            {filteredConversations.map((conversation) => {
              const name =
                conversation.groupName ||
                conversation.username ||
                "Compte indisponible";

              return (
                <li
                  key={`${conversation.is_group ? "group" : "chat"}-${conversation.id}`}
                >
                  <button
                    type="button"
                    className={`onvm-inbox-row ${
                      conversation.is_unread ? "is-unread" : ""
                    }`}
                    onClick={() =>
                      navigate(
                        conversation.is_group
                          ? `/chat/group/${conversation.id}`
                          : `/chat/${conversation.id}`
                      )
                    }
                  >
                    <ConversationAvatar
                      name={name}
                      source={
                        conversation.profilePicture ||
                        conversation.groupPicture
                      }
                    />

                    <span className="onvm-inbox-message">
                      <span className="onvm-inbox-name">{name}</span>
                      <span className="onvm-inbox-preview">
                        {previewText(conversation.last_message)}
                      </span>
                    </span>

                    <span className="onvm-inbox-meta">
                      <span className="onvm-inbox-time">
                        {formatTime(conversation.last_message_time)}
                      </span>

                      {conversation.is_unread && (
                        <span className="onvm-inbox-unread">
                          <span className="onvm-inbox-sr-only">
                            Messages non lus
                          </span>
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : !error ? (
          <div className="onvm-inbox-empty">
            <h2>
              {search
                ? "Aucun résultat"
                : activeTab === "groupes"
                  ? "Tes groupes apparaîtront ici"
                  : activeTab === "demandes"
                    ? "Aucune demande"
                    : "Une conversation commence par un message"}
            </h2>
            <p>
              {search
                ? "Essaie un autre nom ou un autre mot."
                : activeTab === "principal"
                  ? "Retrouve une personne et commence la discussion."
                  : "Tu retrouveras ici les nouvelles conversations."}
            </p>

            {!search && activeTab === "principal" && (
              <button type="button" onClick={() => navigate("/search")}>
                Rechercher une personne
              </button>
            )}
          </div>
        ) : null}
      </div>

      <BottomNav />
    </main>
  );
};

export default Conversations;