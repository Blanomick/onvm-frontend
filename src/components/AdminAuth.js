import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminAuth = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Identifiants d'administrateurs corrects
  const adminCredentials = [
    { email: 'mamboisrael3@gmail.com', password: '0897Mambo' }, // Administrateur 1
    { email: 'kingxmambo@gmail.com', password: '0897Mambo' },  // Administrateur 2
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    // Vérifier si les identifiants saisis correspondent à l'un des administrateurs
    const validAdmin = adminCredentials.find(
      (admin) => admin.email === email && admin.password === password
    );

    if (validAdmin) {
      onLogin({ email }, true);  // Met à jour les infos utilisateur et flag admin
      console.log(`[LOG] Connexion réussie pour l'admin: ${email}`);
      navigate('/admin');  // Redirection vers la page d'administration
    } else {
      setError("Email ou mot de passe incorrect");
      console.warn('[ERREUR] Tentative de connexion échouée pour:', email);
    }
  };

  return (
    <div>
      <h2>Connexion Administrateur</h2>
      <form onSubmit={handleSubmit}>
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
        <button type="submit">Se connecter</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}  {/* Affiche une erreur si les identifiants sont incorrects */}
    </div>
  );
};

export default AdminAuth;
