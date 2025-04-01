import React from 'react';
import { FaHome, FaSearch, FaBell, FaUserCircle, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';

const Notifications = ({ user }) => {
  const navigate = useNavigate();

  // Vérifie si l'utilisateur est connecté
  if (!user) {
    console.error('Utilisateur non connecté.');
    return <p>Veuillez vous connecter pour accéder à vos notifications.</p>;
  }

  return (
    <div className="notifications-page">
      {/* Header with navigation icons */}
      <div className="header">
        <div className="logo">Logo</div>
        <div className="header-icons">
          <FaSearch onClick={() => navigate('/search')} title="Recherche" />
          <FaBell onClick={() => navigate('/notifications')} title="Notifications" />
          <FaUserCircle onClick={() => navigate(`/profile/${user.id}`)} title="Profil" />
        </div>
      </div>

      {/* Notifications content */}
      <h2>Notifications</h2>
      <p>Aucune notification pour le moment.</p>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <FaHome onClick={() => navigate('/publication')} title="Accueil" /> {/* Home button now goes to publication page */}
        <FaSearch onClick={() => navigate('/search')} title="Recherche" /> {/* Search page */}
        <FaPlus onClick={() => navigate('/publication')} title="Créer une publication" /> {/* Plus button directs to publication */}
        <FaBell onClick={() => navigate('/notifications')} title="Notifications" /> {/* Notification page */}
        <FaUserCircle onClick={() => navigate(`/profile/${user.id}`)} title="Profil" /> {/* Profile button */}
      </div>
    </div>
  );
};

export default Notifications;
