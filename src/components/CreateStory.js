import React, { useState } from 'react';
import axios from 'axios';

const CreateStory = ({ currentUser }) => {
  const [media, setMedia] = useState(null);
  const [type, setType] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
  console.log("[DEBUG CreateStory] currentUser reçu :", currentUser);

    if (!currentUser?.id) {
      alert("Utilisateur non connecté.");
      return;
    }

    if (!media) {
      alert("Veuillez sélectionner un média.");
      return;
    }

    const formData = new FormData();
    formData.append('userId', currentUser.id);
    formData.append('media', media);
    formData.append('type', type);

    try {
      const response = await axios.post(`${apiUrl}/api/stories`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

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

        {media && (
          <div style={{ marginTop: '15px' }}>
            {type === 'image' && <img src={URL.createObjectURL(media)} alt="preview" style={{ maxWidth: '100%', borderRadius: '10px' }} />}
            {type === 'video' && <video src={URL.createObjectURL(media)} controls style={{ maxWidth: '100%', borderRadius: '10px' }} />}
            {type === 'audio' && <audio src={URL.createObjectURL(media)} controls />}
          </div>
        )}

        <button type="submit" style={{ marginTop: '10px' }}>
          Publier
        </button>
      </form>
    </div>
  );
};

export default CreateStory;
