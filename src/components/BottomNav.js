import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { FaHome, FaSearch, FaPlus, FaBell, FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './BottomNav.css'; // Add some basic styling to position the buttons at the bottom

const BottomNav = () => {
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
const user = JSON.parse(localStorage.getItem("user"));

useEffect(() => {
  const fetchNotificationCount = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/notifications/${user.id}`);
      setNotificationCount(res.data.length); // ← nombre total (tu peux filtrer par read si tu veux)
    } catch (err) {
      console.error("Erreur de chargement des notifications :", err);
    }
  };

  if (user?.id) {
    fetchNotificationCount();
  }
}, [user?.id]);





  return (
    <div className="bottom-nav">
      {/* Bouton pour la page des publications */}
      <button onClick={() => navigate('/publication')} aria-label="Publications">
        <FaHome />
      </button>

      {/* Bouton pour la page de recherche */}
      <button onClick={() => navigate('/search')} aria-label="Recherche">
        <FaSearch />
      </button>

      {/* Bouton pour ajouter une nouvelle publication */}
      <button onClick={() => navigate('/publication')} aria-label="Nouvelle publication">

        <FaPlus />
      </button>

{/* Bouton pour les notifications avec compteur */}
<div style={{ position: 'relative' }}>
  <button onClick={() => navigate('/notifications')} aria-label="Notifications">
    <FaBell />
  </button>
  {notificationCount > 0 && (
    <span
      style={{
        position: 'absolute',
        top: '-4px',
        right: '-4px',
        backgroundColor: 'red',
        color: 'white',
        borderRadius: '50%',
        fontSize: '10px',
        padding: '2px 6px',
        fontWeight: 'bold'
      }}
    >
      {notificationCount}
    </span>
  )}
</div>


      {/* Bouton pour le profil de l'utilisateur */}
      <button onClick={() => navigate('/profile')} aria-label="Profil">
        <FaUserCircle />
      </button>
    </div>
  );
};

export default BottomNav;
