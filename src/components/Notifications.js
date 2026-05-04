import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";




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

function targetFrom(n) {
  if (['like_publication','retweet_publication','comment_publication'].includes(n.type) && n.entity_id) {
    return `/publication/${n.entity_id}`;
  }
  if (['like_story','comment_story'].includes(n.type)) {
    // adapte si tu as une page détail de story: `/stories/${n.entity_id}`
    return `/stories`;
  }
  if (n.type === 'message') return `/messages`;
  return null;
}


const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));
 

  const navigate = useNavigate();

useEffect(() => {
  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/api/notifications`, {
        params: { userId: user.id, limit: 100 }
      });
      // on s’assure que actor_username soit dispo (selon backend)
      const normalized = data.map(n => ({
        ...n,
        actor_username: n.actor_username || n?.metadata?.actor_username || null
      }));
      setNotifications(normalized);
    } catch (err) {
      console.error("Erreur de chargement :", err);
    }
  };

  if (user?.id) fetchNotifications();
}, [user?.id]);


 const handleClick = async (notif) => {
  try {
    // Marquer comme lue (nouvelle route mark-read; on passe l’id)
    await axios.post(`${apiUrl}/api/notifications/mark-read`, {
      userId: user.id,
      ids: [notif.id]   // côté backend: si `ids` absent et `all: true`, tout marquer
    });

    // Rediriger selon la cible (entity_type/entity_id ou type)
    const to = targetFrom(notif);
    if (to) navigate(to);

    // Mise à jour immédiate de l'état (nouveau champ: is_read)
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
    );
  } catch (err) {
    console.error("Erreur lors du clic sur notification :", err);
  }
};


  return (
    <div style={{ padding: "20px" }}>
      <h2>Mes Notifications</h2>
      {notifications.length === 0 ? (
        <p>Aucune notification</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
        {notifications.map((notif) => (
  <li
    key={notif.id}
    onClick={() => handleClick(notif)}
    style={{
      backgroundColor: notif.is_read ? "#fff" : "#eef6ff",
      padding: "12px",
      marginBottom: "8px",
      borderRadius: "8px",
      cursor: "pointer",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    }}
  >
    <strong>{textFor(notif)}</strong>
    <br />
    <small>Reçu le {new Date(notif.created_at).toLocaleString()}</small>
  </li>
))}

        </ul>
      )}
    </div>
  );
};

export default Notifications;
