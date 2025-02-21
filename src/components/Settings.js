import React, { useState } from 'react';
import './Settings.css';


const apiUrl = process.env.REACT_APP_API_URL;

console.log("API URL utilisée :", apiUrl);

const Settings = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (response.ok) {
        alert('Mot de passe modifié avec succès.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert('Erreur lors de la modification du mot de passe.');
      }
    } catch (error) {
      console.error('Erreur lors de la modification du mot de passe:', error);
    }
  };

  return (
    <div className="settings-container">
      <h2>Paramètres</h2>

      {/* Section de modification de mot de passe */}
      <div className="password-section">
        <h3>Changer le mot de passe</h3>
        <form onSubmit={handlePasswordChange}>
          <div>
            <label>Mot de passe actuel :</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Nouveau mot de passe :</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Confirmer le nouveau mot de passe :</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Modifier le mot de passe</button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
