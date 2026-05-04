import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './CreateStory.css';

const CreateStory = ({ currentUser }) => {
  const [media, setMedia] = useState(null);
  const [type, setType] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#f0f0f0');
const [cameraReady, setCameraReady] = useState(false);
const [textOnlyMode, setTextOnlyMode] = useState(false);
const [textContent, setTextContent] = useState('');
const [textBackgroundColor, setTextBackgroundColor] = useState('#6366f1');
const [backgroundMedia, setBackgroundMedia] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
  const videoElement = videoRef.current;
  let localStream = null;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      localStream = stream;

      if (videoElement) {
        videoElement.srcObject = stream;
        setCameraReady(true); // ✅ Caméra activée
      }
    } catch (err) {
      console.error("Erreur caméra :", err);
      setCameraReady(false); // ❌ Caméra non disponible
    }
  };

  startCamera();

  return () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
  };
}, []);


  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataURL = canvas.toDataURL('image/png');
      setPhotoData(imageDataURL);
      setType('image');
    
    }
  };
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!currentUser?.id) {
    alert("Utilisateur non connecté.");
    return;
  }

  if (!media && !photoData && textContent.trim() === '') {
    alert("Veuillez écrire un texte, ou choisir un média.");
    return;
  }

  const formData = new FormData();
  formData.append('userId', currentUser.id);

  // 📝 Texte seulement (ou avec arrière-plan)
  if (textOnlyMode && textContent.trim() !== '') {
    formData.append('type', 'text');
    formData.append('text', textContent);

  if (backgroundMedia) {
  formData.append('background', backgroundMedia);
}


    const taggedUsers = textContent.match(/@\w+/g);
    if (taggedUsers) {
      formData.append('tags', JSON.stringify(taggedUsers));
    }

    try {
      for (let pair of formData.entries()) {
        console.log(pair[0] + ':', pair[1]);
      }

      await axios.post(`${apiUrl}/api/stories`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert("Story texte publiée !");
      setTextOnlyMode(false);
      setTextContent('');
      setBackgroundMedia(null);
      setSelectedTool(null);
    } catch (err) {
      console.error("Erreur envoi texte :", err);
      alert("Erreur lors de la publication.");
    }

    return;
  }

  // 📸 Image prise avec la caméra
  if (photoData) {
    const blob = await (await fetch(photoData)).blob();
    formData.append('media', blob, 'photo.png');
    formData.append('type', 'image');
  }

  // 🎥 Fichier importé
  else if (media) {
    formData.append('media', media);
    formData.append('type', type);
  }

  // 📢 Tags même sur image ou vidéo
  if (textContent.trim() !== '') {
    formData.append('text', textContent);
    const taggedUsers = textContent.match(/@\w+/g);
    if (taggedUsers) {
      formData.append('tags', JSON.stringify(taggedUsers));
    }
  }

  try {
    for (let pair of formData.entries()) {
      console.log(pair[0] + ':', pair[1]);
    }

    await axios.post(`${apiUrl}/api/stories`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    alert("Story publiée avec succès !");
    setMedia(null);
    setPhotoData(null);
    setType('');
    setTextContent('');
    setSelectedTool(null);
    setBackgroundMedia(null);
    setTextOnlyMode(false);
  } catch (err) {
    console.error("Erreur création story :", err);
    alert("Erreur serveur.");
  }
};



const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setMedia(file);
  setPhotoData(null);

  if (file.type.startsWith('video/')) setType('video');
  else if (file.type.startsWith('audio/')) setType('audio');
  else if (file.type.startsWith('image/')) setType('image');
  else alert('Format non pris en charge.');
};


  const backgroundColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#84cc16'];

 
  return (
    <div className="story-container">
      <h2 className="story-title">Créer une Story</h2>

      <div
        className="preview-zone"
        style={{ backgroundColor: backgroundColor }}
      >
        <video ref={videoRef} autoPlay playsInline className="video-preview" />
        <canvas ref={canvasRef} width="300" height="400" style={{ display: 'none' }} />

        {(photoData || media) && (
          <div className="preview">
            {photoData && <img src={photoData} alt="Prévisualisation" className="preview" />}
            {media && type === 'image' && <img src={URL.createObjectURL(media)} alt="preview" className="preview" />}
            {media && type === 'video' && <video src={URL.createObjectURL(media)} controls className="preview" />}
            {media && type === 'audio' && <audio src={URL.createObjectURL(media)} controls />}
          </div>
        )}
      </div>





{textOnlyMode && (
  <div className="text-only-mode">
    <textarea
      value={textContent}
      onChange={(e) => setTextContent(e.target.value)}
      placeholder="Écris ton texte ici..."
      className="text-area"
    />
    <div style={{ marginTop: 10 }}>
      <label>🎨 Couleur de fond :</label>
      <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
        {backgroundColors.map((color) => (
          <button
            key={color}
            style={{
              backgroundColor: color,
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              border: textBackgroundColor === color ? '2px solid black' : '1px solid #ccc',
            }}
            onClick={() => setTextBackgroundColor(color)}
          />
        ))}
      </div>
    </div>

    <div style={{ marginTop: 10 }}>
      <label>🖼️ Image ou vidéo de fond :</label><br />
      <input type="file" accept="image/*,video/*" onChange={(e) => setBackgroundMedia(e.target.files[0])} />
    </div>

    {backgroundMedia && (
      <div style={{ marginTop: 10 }}>
        {backgroundMedia.type.startsWith('image') && (
          <img src={URL.createObjectURL(backgroundMedia)} alt="arrière-plan" className="preview" />
        )}
        {backgroundMedia.type.startsWith('video') && (
          <video src={URL.createObjectURL(backgroundMedia)} controls className="preview" />
        )}
      </div>
    )}
  </div>
)}


     <div className="button-group">
  <button
    onClick={() => {
      if (cameraReady) {
        takePhoto();
      } else {
        alert("Caméra non prête.");
      }
    }}
    className="capture-button"
  >
    📸 Prendre une photo
  </button>
  <input
    type="file"
    accept="image/*,video/*,audio/*"
    onChange={handleFileChange}
    className="file-input"
  />
</div>

      {/* 🎨 Outils créatifs */}
      <div className="creative-tools">
        <h3>🎨 Outils créatifs</h3>
        <div className="tools-list">
          <button className="tool-btn" onClick={() => setSelectedTool('photo')}>📸 Photo</button>
          <button className="tool-btn" onClick={() => fileInputRef.current?.click()}>🖼️ Image</button>
          <button className="tool-btn" onClick={() => {
  setSelectedTool('text');
  setTextOnlyMode(true);
}}>✏️ Texte</button>

          <button className="tool-btn" onClick={() => setSelectedTool('sticker')}>🎉 Sticker</button>
          <button className="tool-btn" onClick={() => setSelectedTool('background')}>🎨 Arrière-plan</button>
        </div>
      </div>

      {/* Arrière-plan */}
      {selectedTool === 'background' && (
        <div className="background-colors">
          <h4>🎨 Choisir une couleur</h4>
          <div className="colors-list">
            {backgroundColors.map((color) => (
              <button
                key={color}
                style={{
                  backgroundColor: color,
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: backgroundColor === color ? '2px solid #000' : '1px solid #ccc',
                  margin: '5px',
                }}
                onClick={() => setBackgroundColor(color)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 🛠 Fonctionnalités */}
      <div className="features-section">
        <h3>🛠 Fonctionnalités</h3>
        <div className="tools-list">
          <button className="tool-btn">🎵 Ajouter de la musique</button>
          <button className="tool-btn">📍 Ajouter un lieu</button>
          <button className="tool-btn">🏷️ Ajouter des hashtags</button>
        </div>
      </div>

      <button onClick={handleSubmit} className="submit-button">✅ Publier</button>
    </div>
  );
};

export default CreateStory;
