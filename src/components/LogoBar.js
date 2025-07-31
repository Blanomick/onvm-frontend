import React, { useEffect, useState } from 'react';
import axios from 'axios';
import StoryViewer from './StoryViewer';
import './LogoBar.css';

const LogoBar = () => {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
const [visible, setVisible] = useState(true);
const [prevScrollPos, setPrevScrollPos] = useState(0);

  

  useEffect(() => {
  const fetchStories = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/stories');

      const now = new Date();

     const filtered = res.data.filter(story => {
  const created = new Date(story.created_at);
  const hours = (now - created) / (1000 * 60 * 60);
  return story.media && hours <= 24;
});

// Grouper toutes les stories par userId
const grouped = filtered.reduce((acc, curr) => {
  const userGroup = acc.find(group => group.userId === curr.userId);
  if (userGroup) {
    userGroup.stories.push(curr);
  } else {
    acc.push({
      userId: curr.userId,
      username: curr.username,
      profilePicture: curr.profilePicture,
      stories: [curr]
    });
  }
  return acc;
}, []);

setStories(grouped);

      
    } catch (err) {
      console.error('Erreur lors du chargement des stories', err);
    }
  };

  fetchStories();
}, []);

useEffect(() => {
  const handleScroll = () => {
    const currentScrollPos = window.scrollY;
    setVisible(prevScrollPos > currentScrollPos || currentScrollPos < 10);
    setPrevScrollPos(currentScrollPos);
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [prevScrollPos]);

const handleStoryClick = (group) => {
  setSelectedStory(group); // 👉 groupe de stories
};

  return (
    <div
  className="story-bar"
  style={{
    position: 'fixed',
    top: visible ? '0' : '-100px',
    transition: 'top 0.3s',
    width: '100%',
    zIndex: 1000,
    backgroundColor: 'white',
  }}
>

      {stories.length === 0 ? (
        <p>Aucune story disponible</p>
      ) : (
       stories.map((group, index) => (
  <div key={index} className="story-circle" onClick={() => handleStoryClick(group)}>
    <img src={group.profilePicture || '/uploads/default-profile.png'} alt="pp" className="story-profile" />
    <span className="story-username">{group.username}</span>
  </div>
))

      )}

      {/* ✅ Affichage en plein écran */}
      {selectedStory && (
       <StoryViewer
  stories={stories}
  currentIndex={stories.findIndex(s => s.userId === selectedStory.userId)}
  onClose={() => setSelectedStory(null)}
/>

      )}
    </div>
  );
};

export default LogoBar;
