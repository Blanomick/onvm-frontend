import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import './Settings.css';
import EditBio from './EditBio';

const apiUrl = process.env.REACT_APP_API_URL;

const Settings = ({ currentUser }) => {
  const [activeSection, setActiveSection] = useState(null);
  const [balance, setBalance] = useState(0);
  const navigate = useNavigate();


  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/wallet/${currentUser.id}/balance`);
        const data = await res.json();
        setBalance(data.balance || 0);
      } catch (err) {
        console.error("[ERREUR] Impossible de charger le portefeuille :", err);
      }
    };

    if (currentUser) {
      fetchBalance();
    }
  }, [currentUser]);

  const renderContent = () => {
    switch (activeSection) {
      case 'bio':
        return <EditBio currentUser={currentUser} />;
      default:
        return (
          <div className="settings-menu">
            <h2 className="settings-title">Paramètres de mon compte</h2>

            <button
              className="edit-profile-button"
              onClick={() => setActiveSection('bio')}
            >
              ✏️ Modifier ma bio
            </button>

            <div className="settings-option" onClick={() => navigate('/settings/language')}>
  🌐 Changer la langue
</div>


             <div className="settings-option" onClick={() => navigate('/settings/invitation')}>
      🎁 Inviter des amis
    </div>

            <div className="wallet-box">
              <h3>💼 Mon portefeuille</h3>
              <p>Solde actuel : <strong>{balance} €</strong></p>
              <button
                className="withdraw-button"
                onClick={() => alert("🚫 Fonction de retrait non disponible pour l'instant.")}
              >
                Retirer
              </button>
            </div>
               
               <button onClick={() => navigate('/logout')}>
  Se déconnecter
</button>

            <div className="settings-section">
              <h3>À venir :</h3>
              <ul>
                <li>Changer le mot de passe</li>
                <li>Notifications</li>
                <li>Langue</li>
                <li>Confidentialité</li>
              </ul>
            </div>
          </div>
        );
    }
  };

  if (!currentUser) return <p>Chargement...</p>;

  return <div className="settings-container">{renderContent()}</div>;
};

export default Settings;
