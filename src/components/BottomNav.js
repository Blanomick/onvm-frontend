import React from 'react';
import { FaHome, FaSearch, FaPlus, FaBell, FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './BottomNav.css'; // Add some basic styling to position the buttons at the bottom

const BottomNav = () => {
  const navigate = useNavigate();

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
      <button onClick={() => navigate('/publication/new')} aria-label="Nouvelle publication">
        <FaPlus />
      </button>

      {/* Bouton pour les notifications */}
      <button onClick={() => navigate('/notifications')} aria-label="Notifications">
        <FaBell />
      </button>

      {/* Bouton pour le profil de l'utilisateur */}
      <button onClick={() => navigate('/profile')} aria-label="Profil">
        <FaUserCircle />
      </button>
    </div>
  );
};

export default BottomNav;
