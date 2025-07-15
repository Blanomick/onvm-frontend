import React, { useState } from 'react';
import axios from 'axios';

const CreateStory = ({ user }) => {
  const [media, setMedia] = useState(null);
  const [type, setType] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      alert("Utilisateur non connecté.");
      return;
    }

    if (!media) {
      alert("Veuillez sélectionner un média.");
      return;
    }

    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('media', media);
    formData.append('type', type);

    // ✅ LOGS DE DEBUG : voir ce qu'on envoie
    console.log('[DEBUG] userId :', user.id);
    console.log('[DEBUG] type :', type);
    console.log('[DEBUG] media :', media);
    console.log('[DEBUG] URL envoyée :', `${apiUrl}/api/stories`);

    try {
      const response = await axios.post(`${apiUrl}/api/stories`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[DEBUG] Réponse serveur :', response.data);
      alert("Story publiée avec succès !");
      setMedia(null);
    } catch (err) {
      console.error("❌ Erreur lors de la création de la story :", err);
      alert("Erreur serveur.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMedia(file);

    if (file.type.startsWith('video/')) {
      setType('video');
    } else if (file.type.startsWith('audio/')) {
      setType('audio');
    } else if (file.type.startsWith('image/')) {
      setType('image');
    } else {
      alert('Format de fichier non pris en charge.');
    }

    console.log('[DEBUG] Fichier sélectionné :', file);
    console.log('[DEBUG] Type déterminé :', type);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Créer une Story</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*,video/*,audio/*"
          onChange={handleFileChange}
        />
        <button type="submit" style={{ marginTop: '10px' }}>
          Publier
        </button>
      </form>
    </div>
  );
};

export default CreateStory;
