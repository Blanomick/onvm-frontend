import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { installAvatarFallback } from './utils/avatarFallback';
import { startNouchi } from './utils/nouchi';
import reportWebVitals from './reportWebVitals';
import AppUpdates, { registerServiceWorker } from './components/AppUpdates';

installAvatarFallback();
// Mode nouchi (si activé dans les paramètres)
window.addEventListener('load', () => startNouchi());
setTimeout(() => startNouchi(), 300);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <AppUpdates />
  </React.StrictMode>
);

// Appli installable + fonctionnement hors connexion (site web)
registerServiceWorker();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
