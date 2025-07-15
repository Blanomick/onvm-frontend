import React, { useState } from 'react';
import { FaHeart, FaShare, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './StoryViewer.css';

const StoryViewer = ({ stories, currentIndex, onClose }) => {
  const [index, setIndex] = useState(currentIndex);
  const story = stories[index];

  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex(index + 1);
    } else {
      onClose(); // fin des stories
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  return (
    <div className="story-viewer">
      {/* Haut : infos utilisateur */}
      <div className="story-header">
        <span className="story-username">{story.username}</span>
        <span className="story-time">{story.timeAgo}</span>
      </div>

      {/* Media */}
      <div className="story-content">
        {story.type === 'image' && <img src={story.media} alt="story" />}
        {story.type === 'video' && <video src={story.media} controls autoPlay />}
        {story.type === 'audio' && <audio src={story.media} controls autoPlay />}
      </div>

      {/* Navigation */}
      <div className="arrow left" onClick={goPrev}><FaChevronLeft /></div>
      <div className="arrow right" onClick={goNext}><FaChevronRight /></div>

      {/* Bas : message + icônes */}
      <div className="story-footer">
        <input type="text" placeholder="Envoyer un message..." />
        <div className="story-icons">
          <FaHeart />
          <FaShare />
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;
