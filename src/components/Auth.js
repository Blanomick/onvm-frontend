import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css'; // Assuming you have the design in this CSS file

const apiUrl = process.env.REACT_APP_API_URL;



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

    if (!isLogin && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    


    const url = isLogin
      ? `${apiUrl}/api/auth/login`
      : `${apiUrl}/api/auth/register`;
    
    // Préparer les données pour la requête
    const data = {
      email: email.trim(), // Supprimer les espaces inutiles
      password: password.trim(),
      ...(isLogin ? {} : { username: username.trim() }), // Inclure le nom d'utilisateur uniquement pour l'inscription
    };
    
    // Validation des champs
    if (!email.trim() || !password.trim() || (!isLogin && !username.trim())) {
      setError('Tous les champs doivent être correctement remplis.');
      return;
    }
    
    console.log('[LOG] Type de requête :', isLogin ? 'Connexion' : 'Inscription');
    console.log('[LOG] URL utilisée :', url);
    console.log('[LOG] Données envoyées au backend :', data);
    
    try {
      // Effectuer la requête vers le backend
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    
      const result = await response.json();
      console.log('[LOG] Réponse du serveur :', result);
    
      if (response.ok) {
        alert(result.message);
        if (result.user) {
          console.log('[LOG] Utilisateur connecté avec succès :', result.user);
          onLogin(result.user);
    
          // Redirection vers la page de publication après connexion réussie
          navigate('/publication', {
            state: {
              username: result.user.username,
              profilePicture: result.user.profilePicture,
            },
          });
        }
      } else {
        setError(`Erreur : ${result.message || 'Une erreur est survenue.'}`);
        console.error('[ERREUR] Réponse non OK :', result.message);
      }
    } catch (error) {
      console.error('[ERREUR] Erreur lors de la requête :', error);
      setError(
        'Erreur lors de la connexion au serveur. Vérifiez votre connexion et réessayez.'
      );
    }
  };
    

  return (
    <div className="auth-container">
      <div className="site-name">ONVM</div>
      <div className="auth-toggle">
        <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
          {isLogin ? 'Connexion' : 'Inscription'}
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
          {isLogin ? 'Se connecter' : "S'inscrire"}
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
