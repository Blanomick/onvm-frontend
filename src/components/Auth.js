import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Auth.css';
import { FiEye, FiEyeOff } from "react-icons/fi";
const apiUrl = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submittingRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref');

    if (ref) {
      setReferralCode(ref);
      setIsLogin(false);
    }
  }, [location.search]);

  const changeMode = (loginMode) => {
    if (submittingRef.current) return;

    setIsLogin(loginMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submittingRef.current) return;
    setError('');

    if (!apiUrl) {
      setError("L’adresse du serveur n’est pas configurée.");
      return;
    }

    if (!email.trim() || !password || (!isLogin && !username.trim())) {
      setError('Merci de remplir tous les champs obligatoires.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(
        `${apiUrl}/api/auth/${isLogin ? 'login' : 'register'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            email: email.trim(),
            password,
            ...(!isLogin && {
              username: username.trim(),
              referral_code: referralCode.trim(),
            }),
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message || `Le serveur a rencontré une erreur (${response.status}).`
        );
      }

      if (!result?.user || !result?.token) {
        throw new Error(
          'La réponse du serveur est incomplète. Merci de réessayer.'
        );
      }

      if (typeof onLogin !== 'function') {
        throw new Error("La connexion n’est pas correctement configurée.");
      }

      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('token', result.token);

      onLogin(result.user);
      navigate('/publication', { replace: true });
    } catch (err) {
      if (err.name === 'AbortError') {
        setError(
          'Le serveur met trop de temps à répondre. Réessaie dans un instant.'
        );
      } else if (err instanceof TypeError) {
        setError(
          'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.'
        );
      } else {
        setError(err.message || 'Une erreur est survenue. Réessaie.');
      }
    } finally {
      window.clearTimeout(timeout);
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
  <main className="onvm-auth">
    <div className="onvm-auth__page">
      <header className="onvm-auth__welcome">
        <img
          src="/onvm-logo.png"
          alt=""
          className="onvm-auth__logo"
          width="100"
          height="100"
        />

        <div className="onvm-auth__wordmark">ONVM</div>

        <h1>
          {isLogin ? "Retrouve ton monde." : "Fais partie du monde."}
        </h1>

        <p>
          {isLogin
            ? "Tes proches. Tes échanges. Ton espace."
            : "Crée ton compte et rejoins la conversation."}
        </p>
      </header>

      <section
        className="onvm-auth__content"
        aria-label={isLogin ? "Connexion à ONVM" : "Inscription sur ONVM"}
        aria-busy={isSubmitting}
      >
        <div
          className="onvm-auth__modes"
          aria-label="Choisir un formulaire"
        >
          <button
            type="button"
            className={isLogin ? "is-active" : ""}
            aria-pressed={isLogin}
            disabled={isSubmitting}
            onClick={() => changeMode(true)}
          >
            Connexion
          </button>

          <button
            type="button"
            className={!isLogin ? "is-active" : ""}
            aria-pressed={!isLogin}
            disabled={isSubmitting}
            onClick={() => changeMode(false)}
          >
            Inscription
          </button>
        </div>

        <form className="onvm-auth__form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="onvm-auth__field">
              <label htmlFor="onvm-username">Nom d’utilisateur</label>

              <input
                id="onvm-username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Comment doit-on t’appeler ?"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          )}

          <div className="onvm-auth__field">
            <label htmlFor="onvm-email">Adresse e-mail</label>

            <input
              id="onvm-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="ton@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="onvm-auth__field">
            <label htmlFor="onvm-password">Mot de passe</label>

            <div className="onvm-auth__password">
              <input
                id="onvm-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={
                  isLogin ? "Ton mot de passe" : "Choisis un mot de passe"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />

              <button
                type="button"
                className="onvm-auth__visibility"
                aria-label={
                  showPassword
                    ? "Masquer les mots de passe"
                    : "Afficher les mots de passe"
                }
                aria-pressed={showPassword}
                disabled={isSubmitting}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <FiEyeOff aria-hidden="true" />
                ) : (
                  <FiEye aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="onvm-auth__field">
                <label htmlFor="onvm-confirm-password">
                  Confirmer le mot de passe
                </label>

                <input
                  id="onvm-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Saisis à nouveau ton mot de passe"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="onvm-auth__field">
                <label htmlFor="onvm-referral">
                  Code de parrainage <span>facultatif</span>
                </label>

                <input
                  id="onvm-referral"
                  name="referralCode"
                  type="text"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Le code de la personne qui t’invite"
                  value={referralCode}
                  onChange={(event) => setReferralCode(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {error && (
            <p className="onvm-auth__error" role="alert">
              {error}
            </p>
          )}

          <button
            className="onvm-auth__submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <span className="onvm-auth__spinner" aria-hidden="true" />
            )}

            {isSubmitting
              ? isLogin
                ? "Connexion en cours…"
                : "Création du compte…"
              : isLogin
                ? "Se connecter"
                : "Créer mon compte"}
          </button>

          <p className="onvm-auth__switch">
            {isLogin ? "Pas encore de compte ?" : "Tu as déjà un compte ?"}{" "}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => changeMode(!isLogin)}
            >
              {isLogin ? "Créer un compte" : "Se connecter"}
            </button>
          </p>
        </form>
      </section>

      <footer className="onvm-auth__footer">
        Un espace pour être toi.
      </footer>
    </div>
  </main>
);  
};

export default Auth;