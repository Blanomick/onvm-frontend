// components/MainNavigation.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MainNavigation.css'; // Assurez-vous de créer ce fichier pour styliser

const apiUrl = process.env.REACT_APP_API_URL;

console.log("API URL utilisée :", apiUrl);

const MainNavigation = () => {
  const navigate = useNavigate();

  return (
    <div className="main-navigation">
      {/* Barre latérale */}
      <div className="sidebar">
        <button onClick={() => navigate('/profile')}>Profil</button>
        <button onClick={() => navigate('/publication')}>Publications</button>
        <button onClick={() => navigate('/search')}>Recherche</button>
        <button onClick={() => navigate('/notifications')}>Notifications</button>
        <button onClick={() => navigate('/settings')}>Paramètres</button>
        <button onClick={() => navigate('/admin')}>Administration</button>
      </div>

      {/* Tableau de bord central */}
      <div className="dashboard">
        <h1>Bienvenue sur ONVM</h1>
        <div className="cards">
          <div className="card" onClick={() => navigate('/profile')}>Mon Profil</div>
          <div className="card" onClick={() => navigate('/publication')}>Voir Publications</div>
          <div className="card" onClick={() => navigate('/search')}>Trouver Utilisateurs</div>
          <div className="card" onClick={() => navigate('/notifications')}>Mes Notifications</div>
          <div className="card" onClick={() => navigate('/settings')}>Paramètres</div>
          <div className="card" onClick={() => navigate('/admin')}>Admin Panel</div>
        </div>
      </div>

      {/* Barre de navigation inférieure */}
      <div className="bottom-nav">
        <button onClick={() => navigate('/profile')}>Profil</button>
        <button onClick={() => navigate('/publication')}>Publication</button>
        <button onClick={() => navigate('/search')}>Recherche</button>
        <button onClick={() => navigate('/notifications')}>Notifications</button>
      </div>
    </div>
  );
};

export default MainNavigation;
