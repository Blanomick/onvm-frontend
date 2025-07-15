// components/LanguageSettings.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import i18n from 'i18next';

const LanguageSettings = ({ setLanguage }) => {
  const navigate = useNavigate();

  const handleLanguageChange = (lang) => {
    localStorage.setItem('language', lang);
    setLanguage(lang); // tu dois gérer ce state dans App.js si besoin
    alert("Langue changée avec succès !");
    navigate('/settings');
  };

  return (
    <div className="settings-container">
      <h2>🌐 Choisir la langue</h2>
      <button onClick={() => handleLanguageChange('fr')}>🇫🇷 Français</button>
      <button onClick={() => handleLanguageChange('en')}>🇬🇧 English</button>
      <button onClick={() => handleLanguageChange('es')}>🇪🇸 Español</button>
      <button onClick={() => handleLanguageChange('de')}>🇩🇪 Deutsch</button>
      <button onClick={() => handleLanguageChange('ar')}>🇸🇦 عربي</button>
    </div>
  );
};

export default LanguageSettings;
