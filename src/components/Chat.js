import React, { useEffect, useState, useRef } from 'react';

import { useParams } from 'react-router-dom';

import './Chat.css';

const apiUrl = process.env.REACT_APP_API_URL;

const Chat = ({ currentUser }) => {
  const { id: conversationId } = useParams();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const messagesEndRef = useRef(null);
  const [chatUser, setChatUser] = useState(null);

  useEffect(() => {
    // Cacher le LogoBar en ajoutant une classe globale
    document.body.classList.add('hide-logo-bar');

    return () => {
      document.body.classList.remove('hide-logo-bar');
    };
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/messages/${conversationId}`);
    
     const data = await res.json();

if (Array.isArray(data.messages)) {
  setMessages(data.messages);
  setChatUser(data.user); // 👈 utilisateur à afficher en haut
} else {
  console.warn('[WARN] Réponse inattendue :', data);
  setMessages([]);
}



        scrollToBottom();
      } catch (err) {
        console.error('[ERREUR] Chargement messages :', err);
        setMessages([]);
      }
    };

    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!currentUser || !currentUser.id) {
  return (
    <div className="chat-page">
      <div className="notification">
        🚫 Vous devez être connecté pour accéder à la messagerie.
      </div>
    </div>
  );
}




  const handleSend = async () => {
    if (!content.trim() && !media) return;

    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    formData.append('sender_id', currentUser.id);
    if (content) formData.append('content', content);
    if (media) formData.append('media', media);

    try {
      await fetch(`${apiUrl}/api/messages/send`, {
        method: 'POST',
        body: formData,
      });

      setContent('');
      setMedia(null);

      const res = await fetch(`${apiUrl}/api/messages/${conversationId}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        console.warn('[WARN] Réponse après envoi inattendue :', data);
      }

      scrollToBottom();
    } catch (err) {
      console.error('[ERREUR] Envoi message :', err);
    }
  };

  return (
    <>
      <div className="chat-page">
     <div className="chat-header">
  <img
    src={chatUser?.profilePicture ? `${apiUrl}${chatUser.profilePicture}` : '/default-profile.png'}
    alt="profil"
    className="chat-user-avatar"
  />
  <span className="chat-username">{chatUser?.username || `Utilisateur #${conversationId}`}</span>
</div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.sender_id === currentUser.id ? 'sent' : 'received'}`}
            >
              <p>{msg.content}</p>
              {msg.media && (
                <>
                  {msg.media.endsWith('.mp4') ? (
                    <video src={apiUrl + msg.media} controls />
                  ) : msg.media.endsWith('.mp3') || msg.media.endsWith('.ogg') ? (
                    <audio src={apiUrl + msg.media} controls />
                  ) : (
                    <img src={apiUrl + msg.media} alt="fichier" />
                  )}
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <textarea
            placeholder="Votre message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            onChange={(e) => setMedia(e.target.files[0])}
          />
          <button onClick={handleSend}>Envoyer</button>
        </div>
      </div>

      
    </>
  );
};

export default Chat;
