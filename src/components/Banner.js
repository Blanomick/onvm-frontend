// ./components/Banner.js
import React, { useEffect, useState } from 'react';
import './Banner.css';

const Banner = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Masquer la bannière après 5 secondes (5000 ms)
    const timer = setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => clearTimeout(timer); // Nettoyage du timer
  }, []);

  if (!visible) return null;

  return (
    <div className="banner">
      📢 Téléchargez notre application mobile ! 👉{' '}
      <a href="https://tonlienapk.com" target="_blank" rel="noopener noreferrer">
        Cliquez ici
      </a>
    </div>
  );
};

export default Banner;
