import React, { useEffect } from 'react';

const AdMultiplex = () => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("Erreur lors du chargement de la pub AdSense :", e);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <ins className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-8927568614500090"
        data-ad-slot="1234567890"  
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
    </div>
  );
};

export default AdMultiplex;
