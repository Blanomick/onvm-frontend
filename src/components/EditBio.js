import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EditBio.css';

const apiUrl = process.env.REACT_APP_API_URL;

const EditBio = ({ currentUser }) => {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBio = async () => {
      if (!currentUser) return;

      try {
        const res = await fetch(`${apiUrl}/api/users/${currentUser.id}`);
        const data = await res.json();
        setBio(data.bio || '');
        setLoading(false);
      } catch (error) {
        console.error('[ERREUR] Chargement bio échoué :', error);
        setLoading(false);
      }
    };

    fetchBio();
  }, [currentUser]);

  const handleSave = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/users/${currentUser.id}/bio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio })
      });

      if (response.ok) {
        alert('✅ Bio enregistrée !');
        navigate('/profile/' + currentUser.id);
      } else {
        alert('❌ Erreur lors de la mise à jour.');
      }
    } catch (error) {
      console.error('[ERREUR] Sauvegarde échouée :', error);
    }
  };

  return (
    <div className="bio-edit-wrapper">
      <div className="bio-edit-box">
        <h2>Modifier ma biographie</h2>
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <>
            <textarea
              className="bio-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parle un peu de toi..."
            />
            <div className="button-row">
              <button className="save-button" onClick={handleSave}>💾 Enregistrer</button>
              <button className="exit-button" onClick={() => navigate(-1)}>❌ Sortie</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditBio;
