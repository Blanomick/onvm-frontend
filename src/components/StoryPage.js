import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const apiUrl = process.env.REACT_APP_API_URL;

const resolveMediaUrl = (url) =>
  url?.startsWith('http') ? url : `${apiUrl}/uploads/${url?.replace(/\\/g, '/')}`;

const StoryPage = () => {
  const { id } = useParams(); // storyId
  const [story, setStory] = useState(null);
  const [views, setViews] = useState([]);
  const [likes, setLikes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/stories`);
        const allStories = await res.json();
        const found = allStories.find((s) => String(s.id) === String(id));
        setStory(found);

        const viewsRes = await fetch(`${apiUrl}/api/stories/${id}/views`);
        const viewsData = await viewsRes.json();
        setViews(Array.isArray(viewsData) ? viewsData : []);


        const likesRes = await fetch(`${apiUrl}/api/stories/${id}/likes`);
        const likesData = await likesRes.json();
        setLikes(Array.isArray(likesData) ? likesData : []);

      } catch (err) {
        console.error('Erreur chargement:', err);
      }
    };

    fetchData();
  }, [id]);

  if (!story) {
    return <div style={{ padding: '20px' }}>Chargement de la story...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Story de {story.username}</h2>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <img
          src={resolveMediaUrl(story.profilePicture)}
          alt="profil"
          style={{ width: 50, height: 50, borderRadius: '50%', marginRight: 10 }}
        />
        <div>
          <p style={{ margin: 0 }}><strong>@{story.username}</strong></p>
          <p style={{ margin: 0, fontSize: 12 }}>
            Publiée : {new Date(story.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        {story.type === 'image' && (
          <img
            src={resolveMediaUrl(story.media)}
            alt="story"
            style={{ maxWidth: '100%', borderRadius: 8 }}
          />
        )}
        {story.type === 'video' && (
          <video
            src={resolveMediaUrl(story.media)}
            controls
            style={{ maxWidth: '100%', borderRadius: 8 }}
          />
        )}
        {story.type === 'audio' && (
          <audio
            src={resolveMediaUrl(story.media)}
            controls
            style={{ width: '100%' }}
          />
        )}
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <p><strong>👁 Vues :</strong> {views.length}</p>
        <p><strong>❤️ Likes :</strong> {likes.length}</p>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>👤 Utilisateurs qui ont vu</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {views.map((v) => (
            <li key={v.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <img
                src={resolveMediaUrl(v.profilePicture)}
                alt="profil"
                style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 10 }}
              />
              {v.username}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>❤️ Utilisateurs qui ont liké</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {likes.map((l) => (
            <li key={l.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <img
                src={resolveMediaUrl(l.profilePicture)}
                alt="profil"
                style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 10 }}
              />
              {l.username}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default StoryPage;
