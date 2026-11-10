import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";



const apiUrl = process.env.REACT_APP_API_URL;

function textFor(n) {
  const actor = n.actor_username || n?.metadata?.actor_username || 'Quelqu’un';
  switch (n.type) {
    case 'like_publication':   return `${actor} a aimé votre publication`;
    case 'retweet_publication':return `${actor} a repartagé votre publication`;
    case 'comment_publication':return `${actor} a commenté votre publication`;
    case 'like_story':         return `${actor} a aimé votre story`;
    case 'comment_story':      return `${actor} a commenté votre story`;
    case 'message':            return `${actor} vous a envoyé un message`;
    default:                   return `${actor} a interagi avec votre contenu`;
  }
}

function targetFrom(notification) {
  return notification.target || null;
}


function avatarUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value, `${apiUrl.replace(/\/+$/, "")}/`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

const Notifications = () => {
 const [notifications, setNotifications] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const [user] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
});

const userId = user?.id;

  const navigate = useNavigate();

 useEffect(() => {
  if (!userId) {
    setLoading(false);
    setError("Connecte-toi pour consulter tes notifications.");
    return;
  }

  let active = true;
  let fetching = false;
  const controller = new AbortController();



  function avatarUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value, `${apiUrl.replace(/\/+$/, "")}/`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
  const fetchNotifications = async () => {
    if (fetching || document.hidden) return;
    fetching = true;

    try {
      const { data } = await axios.get(
        `${apiUrl}/api/notifications/${userId}`,
        {
          signal: controller.signal,
          timeout: 20000,
        }
      );

      if (!Array.isArray(data)) {
        throw new Error("Réponse inattendue du serveur.");
      }

      if (active) {
        setNotifications(data);
        setError("");
      }
    } catch (err) {
      if (active && !axios.isCancel(err)) {
        console.error("Chargement des notifications :", err);
        setError("Impossible d’actualiser les notifications.");
      }
    } finally {
      fetching = false;
      if (active) setLoading(false);
    }
  };

  fetchNotifications();

  // Actualisation lorsque cette page est ouverte et visible.
  const interval = window.setInterval(fetchNotifications, 15000);

  document.addEventListener("visibilitychange", fetchNotifications);
  window.addEventListener("focus", fetchNotifications);

  return () => {
    active = false;
    controller.abort();
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", fetchNotifications);
    window.removeEventListener("focus", fetchNotifications);
  };
}, [userId]);

const handleClick = async (notif) => {
  setError("");

  try {
    if (!notif.is_read) {
      await axios.put(
        `${apiUrl}/api/notifications/${notif.id}/read`,
        {},
        { timeout: 10000 }
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notif.id
            ? { ...item, is_read: true }
            : item
        )
      );
    }
  } catch (err) {
    console.error(
      "Lecture de la notification :",
      err.response?.status,
      err.response?.data || err.message
    );

    setError("La notification n’a pas pu être marquée comme lue.");
  }

  // Une erreur de marquage ne bloque plus l’accès au contenu.
  const destination = targetFrom(notif);

  if (destination) {
    navigate(destination);
  }
};

  return (
    <div
  style={{
    padding: "20px",
    paddingBottom: "calc(110px + env(safe-area-inset-bottom))",
  }}
>
      <h2>Mes Notifications</h2>
     {error && (
  <p role="alert" style={{ color: "#b42318" }}>
    {error}
  </p>
)}

{loading ? (
  <p role="status">Chargement des notifications…</p>
) : notifications.length === 0 ? (
  !error && <p>Aucune notification pour le moment.</p>
) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
  {notifications.map((notif) => {
  const name =
    notif.actor_username ||
    notif.metadata?.actor_username ||
    "Compte indisponible";

  const photo = avatarUrl(notif.actor_photo);

  return (
    <li key={notif.id} style={{ marginBottom: 10 }}>
      <button
        type="button"
        onClick={() => handleClick(notif)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: 14,
          border: "1px solid #ececf0",
          borderRadius: 16,
          background: notif.is_read ? "#fff" : "#fff1f7",
          color: "#17171b",
          textAlign: "left",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        <span
          style={{
            position: "relative",
            display: "grid",
            placeItems: "center",
            width: 46,
            height: 46,
            flexShrink: 0,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#eeeef3",
            fontWeight: 700,
          }}
        >
          {name.charAt(0).toUpperCase()}

          {photo && (
            <img
              src={photo}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", lineHeight: 1.4 }}>
            {textFor({ ...notif, actor_username: name })}
          </strong>

          <small style={{ display: "block", marginTop: 5, color: "#71717a" }}>
            {new Date(notif.created_at).toLocaleString("fr-FR")}
          </small>
        </span>

        {!notif.is_read && (
          <span
            aria-label="Non lue"
            style={{
              width: 8,
              height: 8,
              flexShrink: 0,
              borderRadius: "50%",
              background: "#ff006e",
            }}
          />
        )}
      </button>
    </li>
  );
})}
        </ul>
      )}

      <BottomNav />
    </div>
  );
};

export default Notifications;
