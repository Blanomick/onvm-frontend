import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const apiUrl = process.env.REACT_APP_API_URL;

const EditBio = ({ currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBio = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/users/${id}`);
        const data = await res.json();
        setBio(data.bio || '');
        setLoading(false);
      } catch (error) {
        console.error('[ERREUR] Impossible de charger la biographie :', error);
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchBio();
    }
  }, [id, currentUser]);

  const handleSave = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/users/${id}/bio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });

      if (res.ok) {
        alert('Biographie mise à jour avec succès!');
        navigate(`/profile/${id}`);
      } else {
        alert('Erreur lors de la mise à jour de la biographie.');
      }
    } catch (error) {
      console.error('[ERREUR] Problème lors de la sauvegarde :', error);
    }
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Modifier ma bio</h2>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={5}
        style={{ width: '100%', padding: 10, fontSize: 16, borderRadius: 10 }}
      />
      <div style={{ marginTop: 10 }}>
        <button onClick={handleSave} style={{ padding: '10px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: 25 }}>
          Enregistrer
        </button>
        <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', marginLeft: 10, backgroundColor: '#ccc', border: 'none', borderRadius: 25 }}>
          Annuler
        </button>
      </div>
    </div>
  );
};

export default EditBio;
