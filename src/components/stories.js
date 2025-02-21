import React, { useState, useEffect } from 'react';

const Stories = ({ user }) => {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [stories, setStories] = useState([]);

  // Récupérer les stories depuis le backend
  useEffect(() => {
    fetch(`/api/stories/${user.username}`)
      .then((res) => res.json())
      .then((data) => {
        setStories(data);
      })
      .catch((err) => console.error('Erreur lors du chargement des stories:', err));
  }, [user.username]);

  // Soumettre une nouvelle story
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('username', user.username);
    formData.append('content', content);
    if (file) {
      formData.append('media', file);
    }

    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        alert('Story ajoutée avec succès!');
        setStories([...stories, result]); // Ajouter la nouvelle story à la liste
        setContent('');
        setFile(null);
      } else {
        alert('Erreur lors de l\'ajout de la story.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la story:', error);
    }
  };

  return (
    <div>
      <h2>Ajouter une story</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Écrire une story ou taguer quelqu'un (@)"
          rows="3"
          style={{ width: '100%' }}
        />
        <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit" style={{ marginTop: '10px' }}>Publier la story</button>
      </form>

      <h3>Stories récentes</h3>
      {stories.length > 0 ? (
        stories.map((story) => (
          <div key={story.id}>
            <h4>{story.username}</h4>
            <p>{story.content}</p>
            {story.media && (
              story.media.endsWith('.mp4') || story.media.endsWith('.mov') ? (
                <video src={story.media} controls style={{ width: '100%' }} />
              ) : (
                <img src={story.media} alt="Story" style={{ width: '100%' }} />
              )
            )}
            {story.mentions && <p>Mentionné: {story.mentions}</p>}
          </div>
        ))
      ) : (
        <p>Aucune story disponible.</p>
      )}
    </div>
  );
};

export default Stories;
