import React, { useState } from 'react';
import './Auth.css';
import { useNavigate, useLocation } from 'react-router-dom';

const apiUrl = process.env.REACT_APP_API_URL;

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) setReferralCode(ref);
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogin && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const url = isLogin
      ? `${apiUrl}/api/auth/login`
      : `${apiUrl}/api/auth/register`;

    const data = {
      email: email.trim(),
      password: password.trim(),
      ...(isLogin
        ? {}
        : {
            username: username.trim(),
            referral_code: referralCode.trim(),
          }),
    };

    if (!email.trim() || !password.trim() || (!isLogin && !username.trim())) {
      setError('Tous les champs doivent être correctement remplis.');
      return;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log('[LOG] Réponse du serveur :', result);

      if (!response.ok) {
        setError(result.message || 'Erreur serveur');
        return;
      }

      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));

        if (result.token) {
          localStorage.setItem('token', result.token);
        }

        onLogin(result.user);

        navigate('/publication', { replace: true });
      }

    } catch (error) {
      console.error('[ERREUR]', error);
      setError('Erreur serveur. Réessaie.');
    }
  };

  return (
    <div className="auth-container">
      <div className="site-name">ONVM</div>

      <div className="auth-toggle">
        <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
          {isLogin ? 'Connexion' : 'Inscription'}
        </span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}

        {!isLogin && (
          <input
            type="text"
            placeholder="Code de parrainage"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {!isLogin && (
          <input
            type="password"
            placeholder="Confirmer mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        )}

        <button type="submit">
          {isLogin ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default Auth;