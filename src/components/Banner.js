import React, { useEffect, useState } from 'react';
import './Banner.css';

const Banner = () => {
  const [visible, setVisible] = useState(true);
  const [isInApp, setIsInApp] = useState(false);

   useEffect(() => {
    // Détecte si on est dans une WebView (application mobile)
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroidWebView = /android.*wv/.test(userAgent.toLowerCase()) || /Version\/[\d.]+.*Chrome/.test(userAgent);
    const isiOSWebView = /\(i[^;]+;( U;)? CPU.+Mac OS X/.test(userAgent) && !userAgent.includes('Safari');
    const isCustomApp = userAgent.includes('ONVMApp'); // ← facultatif si tu personnalises WebView

    const detectedInApp = isAndroidWebView || isiOSWebView || isCustomApp;

    setIsInApp(detectedInApp);

    // Masque la bannière après 5s seulement si on est sur navigateur
    if (!detectedInApp) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);


  if (!visible || isInApp) return null;

  return (
    <div className="banner">
      📢 Téléchargez notre application mobile ! 👉{' '}
      <a href="https://expo.dev/accounts/kinvne-kobia1/projects/onvmobile/builds/eff7e537-5e9d-40fa-88b2-c93e5c57f0cd" target="_blank" rel="noopener noreferrer">
        Cliquez ici
      </a>
    </div>
  );
};

export default Banner;
