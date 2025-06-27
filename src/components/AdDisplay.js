// src/components/AdDisplay.js
import React, { useEffect } from 'react';

const AdDisplay = () => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('Erreur d’affichage AdSense:', e);
    }
  }, []);

  return (
    <div className="publication ad-publication">
      <h3>Publicité</h3>
      <ins className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-xxxxxxxxxxxxxxxx"
        data-ad-slot="1234567890"
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
    </div>
  );
};

export default AdDisplay;
