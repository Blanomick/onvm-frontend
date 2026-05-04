import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  FaHome,
  FaPaperPlane,
  FaPlus,
  FaHeart,
  FaUserCircle,
} from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import './BottomNav.css';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [notificationCount, setNotificationCount] = useState(0);
  const [visible, setVisible] = useState(true);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (!user?.id) return;

      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/notifications/${user.id}`
        );

        setNotificationCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch (err) {
        console.error('Erreur de chargement des notifications :', err);
      }
    };

    fetchNotificationCount();
  }, [user?.id]);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 90) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      lastScrollY = Math.max(currentScrollY, 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`mobile-bottom-nav ${visible ? 'show' : 'hide'}`}>
      <button
        type="button"
        className={`nav-btn ${isActive('/publication') ? 'active' : ''}`}
        onClick={() => navigate('/publication')}
        aria-label="Accueil"
      >
        <FaHome />
      </button>

      <button
        type="button"
      className={`nav-btn ${isActive('/conversations') ? 'active' : ''}`}
        onClick={() => navigate('/conversations')}
        aria-label="Messages"
      >
        <FaPaperPlane />
      </button>

      <button
        type="button"
        className="nav-btn create-btn"
        onClick={() => navigate('/create-publication')}
        aria-label="Créer"
      >
        <FaPlus />
      </button>

      <button
        type="button"
        className={`nav-btn notification-btn ${
          isActive('/notifications') ? 'active' : ''
        }`}
        onClick={() => navigate('/notifications')}
        aria-label="Activité"
      >
        <FaHeart />

        {notificationCount > 0 && (
          <span className="notification-badge">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>

      <button
        type="button"
        className={`nav-btn ${
          location.pathname.startsWith('/profile') ? 'active' : ''
        }`}
        onClick={() => navigate(user?.id ? `/profile/${user.id}` : '/profile')}
        aria-label="Profil"
      >
        <FaUserCircle />
      </button>
    </nav>
  );
};

export default BottomNav;