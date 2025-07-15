import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Conversations.css';
import BottomNav from './BottomNav';

const apiUrl = process.env.REACT_APP_API_URL;

const resolveMediaUrl = (url) => {
  if (!url) return '/default-profile.png';
  return url.startsWith('http') ? url : `${apiUrl}${url}`;
};

const Conversations = ({ currentUser }) => {
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/conversations/${currentUser.id}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setConversations(data);
        } else {
          console.warn('[WARN] Format inattendu des conversations :', data);
        }
      } catch (err) {
        console.error('[ERREUR] Chargement conversations :', err);
      }
    };

    if (currentUser?.id) {
      fetchConversations();
    }
  }, [currentUser]);

  return (
    <div className="conversations-page">
      <h2>Mes Conversations</h2>
      {conversations.length > 0 ? (
        <ul className="conversation-list">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className="conversation-item"
              onClick={() => navigate(`/chat/${conv.id}`)}
            >
              <img
                src={resolveMediaUrl(conv.profilePicture)}
                alt="profil"
                className="conversation-avatar"
              />
              <div className="conversation-info">
                <div className="conversation-header">
                  <span className="conversation-name">
                    {conv.username || `Utilisateur inconnu`}
                  </span>
                  <span className="conversation-time">
                    {conv.last_message_time
                      ? new Date(conv.last_message_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>
                <div className="conversation-preview">
                  {conv.last_message
                    ? conv.last_message.slice(0, 50) +
                      (conv.last_message.length > 50 ? '...' : '')
                    : <i>Aucun message</i>}
                </div>
              </div>
              {conv.is_unread && <div className="unread-dot" title="Nouveau message"></div>}
            </li>
          ))}
        </ul>
      ) : (
        <p>Aucune conversation encore.</p>
      )}
      <BottomNav />
    </div>
  );
};

export default Conversations;
