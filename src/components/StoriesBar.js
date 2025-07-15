/* frontend/components/StoriesBar.js
 import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import StoryViewer from './StoryViewer';
import './StoriesBar.css';

const StoriesBar = ({ user }) => {
  const [stories, setStories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  const navigate = useNavigate();

  // 🧠 Récupère les stories des gens que je suis
  useEffect(() => {
    if (!user?.id) return;

    const fetchStories = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/stories/following`, {
          params: { userId: user.id },
        });
        setStories(res.data);
      } catch (err) {
        console.error('[ERREUR] Impossible de charger les stories :', err);
      }
    };

    fetchStories();
  }, [user?.id]);

  // 👉 Ouvre la story sélectionnée
  const openStory = (index) => {
    setCurrentIndex(index);
    setShowViewer(true);
  };

  const closeStory = () => {
    setShowViewer(false);
  };

  return (
    <>
      <div className="stories-bar">
        {/* Ta propre story (bouton "+") *}
        <div className="story-item" onClick={() => navigate('/create-story')}>
          <div className="your-story">
            <img
              src={user?.profilePicture || '/default-profile.png'}
              alt="Votre story"
              className="story-image"
            />
            <div className="plus-icon">+</div>
          </div>
          <span className="story-username">Votre story</span>
        </div>

        {/* Stories des abonnements *}
        {stories.map((story, i) => (
          <div key={story.id} className="story-item" onClick={() => openStory(i)}>
            <img
              src={story.profilePicture || '/default-profile.png'}
              alt={story.username}
              className="story-image"
            />
            <span className="story-username">{story.username}</span>
          </div>
        ))}
      </div>

      {/* Visionneuse *}
      {showViewer && (
        <StoryViewer
          stories={stories}
          currentIndex={currentIndex}
          onClose={closeStory}
        />
      )}
    </>
  );
};

export default StoriesBar; */
