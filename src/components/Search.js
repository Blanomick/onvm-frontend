import React, { useState } from 'react';
import { FaHome, FaSearch, FaBell, FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Search.css';
import axios from 'axios';



const apiUrl = process.env.REACT_APP_API_URL;

// puis plus bas
fetch(`${apiUrl}/api/admin/stats`)



const Search = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

 
  let debounceTimeout;

  const handleLiveSearch = (value) => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
  
    debounceTimeout = setTimeout(async () => {
      if (!user || !user.id || !value.trim()) return;
  
      try {
        const response = await axios.get(`${apiUrl}/api/search?q=${value}&userId=${user.id}`);
        setResults(response.data);
      } catch (err) {
        console.error('[ERREUR] Erreur lors de la recherche en direct :', err);
      }
    }, 300); // Délai de 300ms
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
      

      {/* Formulaire de recherche */}
      <h2>Recherche d'utilisateurs</h2>
      <form className="search-form">
  <input
    type="text"
    placeholder="Rechercher un utilisateur..."
    value={searchTerm}
    
    onChange={(e) => {
      setSearchTerm(e.target.value);
      handleLiveSearch(e.target.value);
    }}
  />
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
                
                {results.length > 0 ? (
  results.map((result) => {
    const imageUrl = result.profilePicture
      ? `${apiUrl}${result.profilePicture}`
      : '/default-profile.png';

    return (
      <div
        key={result.id}
        className="search-result"
        onClick={() => handleViewProfile(result.id)}
        style={{ cursor: 'pointer' }}
      >
        <img
          src={imageUrl}
          alt={result.username}
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
    );
  })
) : (
  <p>Aucun utilisateur trouvé.</p>
)}



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
