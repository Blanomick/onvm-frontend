// frontend/src/app/Download.js
import React from 'react';

const Download = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Télécharger l'application ONVM</h1>
      <p style={styles.description}>
        Installe l'application officielle ONVM sur ton téléphone Android et reste connecté(e) où que tu sois !
      </p>
      <a
        href="https://expo.dev/accounts/kinvne-kobia1/projects/onvmobile/builds/eff7e537-5e9d-40fa-88b2-c93e5c57f0cd"
        target="_blank"
        rel="noopener noreferrer"
        style={styles.button}
      >
        📲 Télécharger l'application
      </a>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    padding: '2rem',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '1rem',
  },
  description: {
    fontSize: '1.1rem',
    marginBottom: '2rem',
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#00C851',
    color: '#fff',
    padding: '1rem 2rem',
    textDecoration: 'none',
    fontSize: '1.2rem',
    borderRadius: '8px',
  },
};

export default Download;
