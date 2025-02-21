import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

// Configuration de l'URL du backend (local ou en ligne)
const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  throw new Error("❌ ERREUR : La variable REACT_APP_API_URL n'est pas définie !");
}

console.log("🔹 API URL utilisée :", API_URL);


const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Vérification des champs avant envoi
    if (!email.trim() || !password.trim() || (!isLogin && !username.trim())) {
      setError('Tous les champs doivent être remplis.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const url = `${API_URL}${endpoint}`;

    const data = {
      email: email.trim(),
      password: password.trim(),
      ...(isLogin ? {} : { username: username.trim() }),
    };

    console.log("🔹 Type de requête :", isLogin ? "Connexion" : "Inscription");
    console.log("🔹 URL utilisée :", url);
    console.log("🔹 Données envoyées :", data);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("🔹 Réponse du serveur :", result);

      if (!response.ok) {
        setError(`Erreur : ${result.message || "Une erreur est survenue."}`);
        console.error("🔴 Erreur API :", result.message);
        return;
      }

      alert(result.message);

      if (result.user) {
        console.log("✅ Utilisateur connecté :", result.user);
        onLogin(result.user);

        // Redirection vers la page de publications après connexion
        navigate('/publication', {
          state: {
            username: result.user.username,
            profilePicture: result.user.profilePicture,
          },
        });
      }
    } catch (error) {
      console.error("🔴 Erreur réseau :", error);
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    }
  };

  return (
    <div className="auth-container">
      <div className="site-name">ONVM</div>
      <div className="auth-toggle">
        <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
          {isLogin ? "Connexion" : "Inscription"}
        </span>
        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-button">
          <span className="toggle-arrow">→</span>
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="input-container">
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        )}
        <div className="input-container">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-container">
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {!isLogin && (
          <div className="input-container">
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}

        <button type="submit" className="submit-button">
          {isLogin ? "Se connecter" : "S'inscrire"}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button className="switch-button" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
        {isLogin ? "Créer un compte" : "J'ai déjà un compte"}
      </button>
    </div>
  );
};

export default Auth;
