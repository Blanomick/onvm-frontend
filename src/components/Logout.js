// src/pages/Logout.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = ({ onLogout }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supprimer les données utilisateur (localStorage, state, etc.)
    localStorage.removeItem('user'); // si tu stockes l'utilisateur ici
    onLogout(); // fonction pour mettre à jour le state global (ex: currentUser = null)

    // Rediriger vers la page d'accueil ou de connexion
    navigate('/');
  }, [onLogout, navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Déconnexion en cours...</h2>
    </div>
  );
};

export default Logout;
