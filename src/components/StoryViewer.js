 import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FaHeart, FaShare, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';
import './StoryViewer.css';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const resolveMediaUrl = (url) => {
  return url?.startsWith('http')
    ? url
    : `${apiUrl}/uploads/${url?.replace(/\\/g, '/')}`;
};

const StoryViewer = ({ stories = [], currentIndex, onClose }) => {
 
 const [groupIndex, setGroupIndex] = useState(currentIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [visible, setVisible] = useState(true);
const [newComment, setNewComment] = useState('');
  const currentGroup = stories[groupIndex];
  const currentUser = JSON.parse(localStorage.getItem('user'));
const [views, setViews] = useState([]);

const handleSendPrivateMessage = async () => {
  if (!newComment.trim()) return;

  try {
    const sender_id = currentUser.id;
    const receiver_id = currentGroup.userId;
    const storyMedia = story.media;
    const storyType = story.type;

    // Crée ou récupère la conversation
    const convoRes = await axios.post(`${apiUrl}/api/conversations/create`, {
      sender_id,
      receiver_id
    });

    const conversation_id = convoRes.data.id;

    // Miniature cliquable
    const preview = storyType === 'image'
      ? `<a href="/story/${story.id}" target="_blank">
           <img src="${resolveMediaUrl(storyMedia)}" alt="story" style="width: 100%; max-width: 300px; border-radius: 8px;" />
         </a>`
      : storyType === 'video'
        ? `<a href="/story/${story.id}" target="_blank">
             <video src="${resolveMediaUrl(storyMedia)}" controls style="width: 100%; max-width: 300px;" />
           </a>`
        : `<a href="/story/${story.id}" target="_blank">
             <audio src="${resolveMediaUrl(storyMedia)}" controls style="width: 100%;" />
           </a>`;

    const finalMessage = `
      ${newComment}<br/>
      ${preview}
    `;

    // Envoie du message
    const formData = new FormData();
    formData.append('conversation_id', conversation_id);
    formData.append('sender_id', sender_id);
    formData.append('content', finalMessage);

    await axios.post(`${apiUrl}/api/messages/send`, formData);

    setNewComment('');
    alert("💌 Message avec aperçu cliquable de la story envoyé !");
  } catch (err) {
    console.error("Erreur lors de l'envoi du message avec story", err);
  }
};




 
  const story = currentGroup?.stories[storyIndex];

  const handleNext = useCallback(() => {
    if (storyIndex < currentGroup?.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
    } else if (groupIndex < stories.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [storyIndex, groupIndex, currentGroup?.stories.length, stories.length, onClose]);

  const handlePrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
    } else if (groupIndex > 0) {
      const prevGroup = stories[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  };



  useEffect(() => {
    if (!story) return;
   setVisible(false);
const fadeTimer = setTimeout(() => setVisible(true), 50); // plus rapide

    const duration = story.type === 'image' ? 5000 : 10000;

    const autoNextTimer = setTimeout(() => {
      handleNext();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(autoNextTimer);
    };
  }, [story, handleNext]);




  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!story) return null;

  return (
    <div className="story-viewer-overlay">
      <div className={`story-viewer ${visible ? 'fade-in' : 'fade-out'}`}>
        <div className="story-close" onClick={onClose}><FaTimes /></div>

        <div className="story-header">
          <img
            src={resolveMediaUrl(currentGroup.profilePicture) || '/default-profile.png'}
            alt="profile"
            className="story-header-avatar"
          />
          <div className="story-header-info">
            <span className="story-username">{currentGroup.username}</span>
            <span className="story-time">{formatTimeAgo(story.created_at)}</span>
          </div>
        </div>



     <div className="progress-bar">
  <div
    className="progress"
    style={{
      width: visible ? '100%' : '0%',
      transition: story.type === 'image' ? '5s linear' : '10s linear'
    }}
  ></div>
</div>




       <div className="story-content">
  {story.type === 'image' && (
    <img
      src={resolveMediaUrl(story.media)}
      alt={`Story de ${currentGroup.username}`}
      className="story-media-image"
    />
  )}
  {story.type === 'video' && (
    <video
      src={resolveMediaUrl(story.media)}
      controls
      autoPlay
      className="story-media-video"
    />
  )}
  {story.type === 'audio' && (
    <audio
      src={resolveMediaUrl(story.media)}
      controls
      autoPlay
      className="story-media-audio"
    />
  )}
</div>

<div className="arrow left" onClick={handlePrev} role="button" aria-label="Précédent">
  <FaChevronLeft />
</div>
<div className="arrow right" onClick={handleNext} role="button" aria-label="Suivant">
  <FaChevronRight />
</div>

{currentUser?.id !== currentGroup?.userId && (
  <div className="story-footer">
    <input
      type="text"
      className="comment-input"
      placeholder="💬 Répondre à cette story..."
      value={newComment}
      onChange={(e) => setNewComment(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSendPrivateMessage();  // ✅ CORRECTION : "Enter" sans espace
      }}
    />
    <button className="send-button" onClick={handleSendPrivateMessage}>
      Envoyer
    </button>
  </div>
)}



      </div>

      {currentUser?.id === currentGroup?.userId && views.length > 0 && (
  <div className="story-views-section">
    <strong>👀 {views.length} vue(s)</strong>
    <ul>
      {views.map(viewer => (
        <li key={viewer.id} style={{ marginTop: '5px' }}>
          <img
            src={resolveMediaUrl(viewer.profilePicture) || '/default-profile.png'}
            alt={viewer.username}
            style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '8px' }}
          />
          {viewer.username}
        </li>
      ))}
    </ul>
  </div>
)}

    </div>
  );
};

const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `il y a ${diffMins} min`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `il y a ${diffHrs} h`;
  return "Expirée";
};

export default StoryViewer;
