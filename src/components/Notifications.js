import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));
 

  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/notifications/${user.id}`
        );
        setNotifications(res.data);
      } catch (err) {
        console.error("Erreur de chargement :", err);
      }
    };

    fetchNotifications();
  }, [user.id]);

  const handleClick = async (notif) => {
    try {
      // Marquer comme lue
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/notifications/${notif.id}/read`
      );

      // Rediriger selon le type
      if (notif.type === "commentaire" || notif.type === "retweet") {
        navigate(`/publication/${notif.content}`); // content = ID publication
      } else if (notif.type === "abonnement") {
        navigate(`/profile/${notif.sender_id}`);
      }

      // Optionnel : mise à jour immédiate de l'état
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id ? { ...n, read: true } : n
        )
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
                backgroundColor: notif.read ? "#fff" : "#eef6ff",
                padding: "12px",
                marginBottom: "8px",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <strong>{notif.type}</strong> – {notif.content}
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
