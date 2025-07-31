import React, { useState, useEffect, useRef } from 'react';

import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CreatePublication.css';

const apiUrl = process.env.REACT_APP_API_URL;

const CreatePublication = ({ currentUser }) => {
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [cropper, setCropper] = useState(null);
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [tags, setTags] = useState('');
  const [suggestions, setSuggestions] = useState([]);
const [showPreview, setShowPreview] = useState(false);
const suggestionBoxRef = useRef();

const navigate = useNavigate();

useEffect(() => {
  const lastWord = tags.split(' ').pop();
  if (lastWord.startsWith('@')) {
    const query = lastWord.slice(1);
    if (query.length > 0) {
      axios.get(`${apiUrl}/api/users/search?q=${query}`)
        .then(res => setSuggestions(res.data))
        .catch(err => console.error("Erreur de suggestion :", err));
    }
  } else {
    setSuggestions([]);
  }
}, [tags]);

const handleSelectSuggestion = (username) => {
  const words = tags.split(' ');
  words[words.length - 1] = `@${username}`;
  setTags(words.join(' ') + ' ');
  setSuggestions([]);
};


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = file.type.split('/')[0]; // image, video, audio
    setMedia(file);
    setMediaType(type);
    setPreview(URL.createObjectURL(file));
  };

  const handleRemoveMedia = () => {
    setMedia(null);
    setPreview(null);
    setMediaType('');
    setCropper(null);
  };

  const handlePublish = async () => {
    if (!media && !caption) {
      alert("Ajoutez un média ou une description.");
      return;
    }

    const formData = new FormData();
    formData.append('userId', currentUser.id);
    formData.append('content', caption);
    formData.append('tags', tags);

    if (mediaType === 'image' && cropper) {
      cropper.getCroppedCanvas().toBlob((blob) => {
        formData.append('media', blob, 'image.png');
        upload(formData);
      });
    } else {
      formData.append('media', media);
      upload(formData);
    }
  };

  const upload = async (formData) => {
    try {
      await axios.post(`${apiUrl}/api/publications`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("✅ Publication créée !");
      navigate('/');
    } catch (err) {
      console.error('Erreur de publication :', err);
      alert("Erreur lors de la publication.");
    }
  };

  const handlePreview = () => {
  if (!media && !caption) {
    alert("Ajoutez un média ou une description.");
    return;
  }
  setShowPreview(true);
};

const handlePublishFinal = () => {
  setShowPreview(false);
  handlePublish();
};


  return (
    <div className="create-publication-container">
      <h2>Créer une publication</h2>

      <input
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={handleFileChange}
      />

      {preview && (
        <div className="preview-section">
          {mediaType === 'image' && (
            <Cropper
              src={preview}
              style={{ height: 300, width: '100%', marginTop: '10px' }}
              aspectRatio={1}
              guides={true}
              viewMode={1}
              responsive={true}
              autoCropArea={1}
              onInitialized={(instance) => setCropper(instance)}
            />
          )}

          {mediaType === 'video' && (
            <video src={preview} controls className="media-preview" />
          )}

          {mediaType === 'audio' && (
            <audio src={preview} controls className="media-preview" />
          )}

          <button className="remove-button" onClick={handleRemoveMedia}>
            Supprimer le média
          </button>
        </div>
      )}

      <textarea
        placeholder="Ajouter une légende..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />

      <input
        type="text"
        placeholder="Taguer des personnes (ex: @user1, @user2)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="tag-input"
      />
      {suggestions.length > 0 && (
  <ul className="suggestion-box" ref={suggestionBoxRef}>
    {suggestions.map(user => (
      <li key={user.id} onClick={() => handleSelectSuggestion(user.username)}>
        @{user.username}
      </li>
    ))}
  </ul>
)}


     <button className="publish-button" onClick={handlePreview}>
  Prévisualiser
</button>


{showPreview && (
  <div className="preview-modal">
    <div className="preview-content">
      <h3>Aperçu</h3>
      {mediaType === 'image' && <img src={preview} alt="aperçu" />}
      {mediaType === 'video' && <video src={preview} controls />}
      {mediaType === 'audio' && <audio src={preview} controls />}
      <p>{caption}</p>
      <p><strong>Tags:</strong> {tags}</p>
      <div className="preview-actions">
        <button onClick={() => setShowPreview(false)}>Modifier</button>
        <button onClick={handlePublishFinal}>Publier</button>
      </div>
    </div>
  </div>
)}


    </div>
  );
};

export default CreatePublication;
