import React, { useState, useEffect, useRef } from 'react';



import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CreatePublication.css';

const apiUrl = process.env.REACT_APP_API_URL;

const CreatePublication = ({ currentUser }) => {

const [files, setFiles] = useState([]);       // File[]
const [previews, setPreviews] = useState([]); // {url, kind, name, size}[]
const [active, setActive] = useState(0);      // index du slide actif
const [caption, setCaption] = useState('');
const [tags, setTags] = useState('');
const [suggestions, setSuggestions] = useState([]);
const [showPreview, setShowPreview] = useState(false);
const suggestionBoxRef = useRef(null);

const navigate = useNavigate();

const MAX_COUNT = 5;
const MAX_SIZE = 200 * 1024 * 1024; // 200 Mo
const ACCEPTED = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/aac"],
};
const acceptAttr = [
  "image/jpeg","image/png","image/webp","image/gif",
  "video/mp4","video/webm","video/ogg","video/quicktime",
  "audio/mpeg","audio/mp3","audio/wav","audio/ogg","audio/webm","audio/aac",
].join(",");

// refs pour le swipe
const startXRef = useRef(0);
const deltaXRef = useRef(0);


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
useEffect(() => {
  return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
}, [previews]);

const kindOf = (file) => {
  if (ACCEPTED.image.includes(file.type)) return "image";
  if (ACCEPTED.video.includes(file.type)) return "video";
  if (ACCEPTED.audio.includes(file.type)) return "audio";
  return "other";
};

const handleFilesChange = (e) => {
  const list = Array.from(e.target.files || []);
  if (!list.length) return;

  // limite à 5
  let combined = [...files, ...list];
  if (combined.length > MAX_COUNT) {
    combined = combined.slice(0, MAX_COUNT);
    alert(`Max ${MAX_COUNT} fichiers. Les fichiers au-delà ont été ignorés.`);
  }

  // filtre type + taille
  const filtered = combined.filter((f) => {
    const okType =
      ACCEPTED.image.includes(f.type) ||
      ACCEPTED.video.includes(f.type) ||
      ACCEPTED.audio.includes(f.type);
    const okSize = f.size <= MAX_SIZE;
    return okType && okSize;
  });

  // previews
  const newPreviews = filtered.map((f) => ({
    url: URL.createObjectURL(f),
    kind: kindOf(f),
    name: f.name,
    size: f.size,
  }));

  setFiles(filtered);
  setPreviews(newPreviews);
  setActive(0);
  e.target.value = ""; // reset input
};


  const removeAt = (idx) => {
  setFiles((prev) => prev.filter((_, i) => i !== idx));
  setPreviews((prev) => {
    const copy = [...prev];
    const [removed] = copy.splice(idx, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    return copy;
  });
  setActive((a) => (idx === a ? Math.max(0, a - 1) : a > idx ? a - 1 : a));
};

const go = (dir) => {
  setActive((a) => {
    const n = previews.length;
    if (!n) return 0;
    return (a + (dir === "next" ? 1 : -1) + n) % n;
  });
};

const onTouchStart = (e) => { startXRef.current = e.touches[0].clientX; deltaXRef.current = 0; };
const onTouchMove  = (e) => { deltaXRef.current = e.touches[0].clientX - startXRef.current; };
const onTouchEnd   = () => {
  const dx = deltaXRef.current;
  if (dx > 50) go("prev");
  else if (dx < -50) go("next");
  deltaXRef.current = 0;
};


 const handlePublish = async () => {
  if (files.length === 0 && !caption) {
    alert("Ajoutez au moins un média ou une description.");
    return;
  }

  const formData = new FormData();
  formData.append('userId', currentUser.id);
  formData.append('content', caption);
  formData.append('tags', tags);
  files.forEach((f) => formData.append('media', f)); // multi-fichiers

  await upload(formData);
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
  if (files.length === 0 && !caption) {
    alert("Ajoutez au moins un média ou une description.");
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
  accept={acceptAttr}
  multiple
  onChange={handleFilesChange}
/>
<div className="hint">
  Jusqu’à 5 médias • Images/Vidéos/Audios • ≤ 200 Mo/fichier
</div>


     {previews.length > 0 && (
  <div className="preview-section ig">
    <button type="button" className="nav left" onClick={() => go('prev')} aria-label="Précédent">‹</button>

    <div
      className="frame"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {previews.map((p, i) => (
        <div
          key={p.url}
          className={`slide ${i === active ? 'is-active' : ''}`}
          style={{ transform: `translateX(${(i - active) * 100}%)` }}
        >
          {p.kind === 'image' && <img className="media" src={p.url} alt={p.name} />}
          {p.kind === 'video' && <video className="media" src={p.url} controls playsInline />}
          {p.kind === 'audio' && (
            <div className="audioWrap">
              <audio src={p.url} controls />
            </div>
          )}
          <button type="button" className="remove" onClick={() => removeAt(i)} aria-label="Retirer ce média">×</button>
        </div>
      ))}
    </div>

    <button type="button" className="nav right" onClick={() => go('next')} aria-label="Suivant">›</button>

    <div className="dots">
      {previews.map((_, i) => (
        <button
          key={i}
          type="button"
          className={`dot ${i === active ? 'is-on' : ''}`}
          onClick={() => setActive(i)}
          aria-label={`Aller au média ${i + 1}`}
        />
      ))}
    </div>
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

      {previews.length > 0 ? (
        <>
          <div className="preview-section ig">
            <button type="button" className="nav left" onClick={() => go('prev')} aria-label="Précédent">‹</button>
            <div className="frame">
              {previews.map((p, i) => (
                <div
                  key={p.url}
                  className={`slide ${i === active ? 'is-active' : ''}`}
                  style={{ transform: `translateX(${(i - active) * 100}%)` }}
                >
                  {p.kind === 'image' && <img className="media" src={p.url} alt={p.name} />}
                  {p.kind === 'video' && <video className="media" src={p.url} controls playsInline />}
                  {p.kind === 'audio' && (
                    <div className="audioWrap">
                      <audio src={p.url} controls />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="nav right" onClick={() => go('next')} aria-label="Suivant">›</button>
            <div className="dots">
              {previews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`dot ${i === active ? 'is-on' : ''}`}
                  onClick={() => setActive(i)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <p>(Pas de média, légende seule)</p>
      )}

      <p style={{whiteSpace:'pre-wrap', marginTop:8}}>{caption}</p>
      {tags && <p><strong>Tags :</strong> {tags}</p>}

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