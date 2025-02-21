import React, { useState } from 'react';
import { FaHome, FaSearch, FaBell, FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Search.css';
import axios from 'axios';



const apiUrl = process.env.REACT_APP_API_URL;

console.log("API URL utilisée :", apiUrl);



const Search = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!user || !user.id) {
      console.error('Utilisateur non connecté ou ID non défini.');
      return;
    }

    try {
      const response = await axios.get(`${apiUrl}/api/search?q=${searchTerm}&userId=${user.id}`);
      setResults(response.data);
    } catch (err) {
      console.error('[ERREUR] Erreur lors de la recherche des utilisateurs:', err);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await axios.post(`${apiUrl}/api/users/follow`, {
        followerId: user.id,
        followingId: userId,
      });
      alert('Vous suivez maintenant cet utilisateur.');
    } catch (err) {
      console.error("Erreur lors du suivi de l'utilisateur:", err);
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="search-page">
      {/* En-tête */}
      <div className="header">
        <div className="logo">Logo</div>
        <div className="header-icons">
          <FaSearch onClick={() => navigate('/search')} title="Rechercher" />
          <FaBell onClick={() => navigate('/notifications')} title="Notifications" />
          <FaUserCircle onClick={() => navigate('/profile')} title="Profil" />
        </div>
      </div>

      {/* Formulaire de recherche */}
      <h2>Recherche d'utilisateurs</h2>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">Rechercher</button>
      </form>

      {/* Résultats de recherche */}
      <div className="search-results">
        {results.length > 0 ? (
          results.map((result) => (
            <div
              key={result.id}
              className="search-result"
              onClick={() => handleViewProfile(result.id)}
              style={{ cursor: 'pointer' }}
            >
              <img
                src={
                  result.profilePicture
                    ? `${apiUrl}${result.profilePicture}`
                    : '/default-profile.png'
                }
                alt={`${result.username || 'Profil utilisateur'}`}
                className="profile-picture"
              />
              <div className="user-info">
                <p>{result.username}</p>
                <button
                  className="follow-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(result.id);
                  }}
                >
                  Suivre
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>Aucun utilisateur trouvé.</p>
        )}
      </div>

      {/* Navigation inférieure */}
      <div className="bottom-nav">
        <FaHome onClick={() => navigate('/publication')} title="Accueil" />
        <FaSearch onClick={() => navigate('/search')} title="Rechercher" />
        <FaBell onClick={() => navigate('/notifications')} title="Notifications" />
        <FaUserCircle onClick={() => navigate(`/profile/${user?.id}`)} />

      </div>
    </div>
  );
};

export default Search;
