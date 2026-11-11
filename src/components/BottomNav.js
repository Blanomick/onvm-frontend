import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FiHome,
  FiSend,
  FiPlus,
  FiHeart,
  FiUser,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import "./BottomNav.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [notificationCount, setNotificationCount] = useState(0);

  let user = null;

try {
  user = JSON.parse(localStorage.getItem("user") || "null");
} catch {
  user = null;
}

  const userId = user?.id;

  useEffect(() => {
    setNotificationCount(0);

    if (!userId || !apiUrl) return;

    let active = true;
    let fetching = false;
    const controller = new AbortController();

    const refreshCount = async () => {
      if (fetching || document.hidden) return;
      fetching = true;

      try {
        const { data } = await axios.get(
          `${apiUrl}/api/notifications/${userId}`,
          {
            signal: controller.signal,
            timeout: 15000,
          }
        );

        if (!Array.isArray(data)) {
          throw new Error("Réponse de notifications invalide.");
        }

        const unreadCount = data.filter(
          (notification) => notification.is_read === false
        ).length;

        if (active) setNotificationCount(unreadCount);
      } catch (error) {
        if (active && !axios.isCancel(error)) {
          console.error("Actualisation du badge :", error);
        }
      } finally {
        fetching = false;
      }
    };

    refreshCount();

    const interval = window.setInterval(refreshCount, 15000);

    window.addEventListener("focus", refreshCount);
    document.addEventListener("visibilitychange", refreshCount);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCount);
      document.removeEventListener("visibilitychange", refreshCount);
    };
  }, [userId, pathname]);

  const homeActive = pathname === "/publication";
  const messagesActive =
    pathname === "/conversations" || pathname.startsWith("/chat/");
  const createActive = pathname === "/create-publication";
  const activityActive = pathname === "/notifications";
  const profileActive =
    pathname === "/profile" ||
    (userId && pathname === `/profile/${userId}`);

  return (
    <nav className="onvm-bottom-nav" aria-label="Navigation principale">
      <div className="onvm-bottom-nav__inner">
        <button
          type="button"
          className={`onvm-nav-button ${homeActive ? "is-active" : ""}`}
          onClick={() => navigate("/publication")}
          aria-label="Accueil"
          aria-current={homeActive ? "page" : undefined}
        >
          <FiHome className="onvm-nav-home" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`onvm-nav-button ${messagesActive ? "is-active" : ""}`}
          onClick={() => navigate("/conversations")}
          aria-label="Messages"
          aria-current={messagesActive ? "page" : undefined}
        >
          <FiSend aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`onvm-nav-button onvm-nav-create ${
            createActive ? "is-active" : ""
          }`}
          onClick={() => navigate("/create-publication")}
          aria-label="Créer une publication"
          aria-current={createActive ? "page" : undefined}
        >
          <span className="onvm-nav-create__background">
            <FiPlus aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          className={`onvm-nav-button ${activityActive ? "is-active" : ""}`}
          onClick={() => navigate("/notifications")}
          aria-label={
            notificationCount > 0
              ? `Activité, ${notificationCount} notifications non lues`
              : "Activité"
          }
          aria-current={activityActive ? "page" : undefined}
        >
          <span className="onvm-nav-icon">
            <FiHeart className="onvm-nav-heart" aria-hidden="true" />

            {notificationCount > 0 && (
              <span className="onvm-nav-dot" aria-hidden="true" />
            )}
          </span>
        </button>

        <button
          type="button"
          className={`onvm-nav-button ${profileActive ? "is-active" : ""}`}
          onClick={() =>
            navigate(userId ? `/profile/${userId}` : "/auth")
          }
          aria-label="Mon profil"
          aria-current={profileActive ? "page" : undefined}
        >
          <FiUser aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;