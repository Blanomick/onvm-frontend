
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
  const [activeTab, setActiveTab] = useState('principal');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/conversations/${currentUser.id}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setConversations(data);
        }
      } catch (err) {
        console.error('[ERREUR] Chargement conversations :', err);
      }
    };

    if (currentUser?.id) fetchConversations();
  }, [currentUser]);

  const filteredConversations = conversations.filter((conv) => {
    if (activeTab === 'principal') return !conv.is_request && !conv.is_group;
    if (activeTab === 'demandes') return conv.is_request;
    if (activeTab === 'groupes') return conv.is_group;
    return true;
  });

  return (
    <div className="conversations-page">
      <div className="conversation-topbar">
        <button className="icon-btn">☰</button>
        <h2>Messages</h2>
        <button className="icon-btn" onClick={() => navigate('/new-message')}>✎</button>
      </div>

      <div className="conversation-search">
        Rechercher ou démarrer une conversation
      </div>

      <div className="conversation-tabs">
        <button
          className={activeTab === 'principal' ? 'active' : ''}
          onClick={() => setActiveTab('principal')}
        >
          Principal
        </button>

        <button
          className={activeTab === 'demandes' ? 'active' : ''}
          onClick={() => setActiveTab('demandes')}
        >
          Demandes
        </button>

        <button
          className={activeTab === 'groupes' ? 'active' : ''}
          onClick={() => setActiveTab('groupes')}
        >
          Groupes
        </button>
      </div>

      {activeTab === 'groupes' && (
        <button
          className="create-group-btn"
          onClick={() => navigate('/groups/create')}
        >
          + Créer un groupe
        </button>
      )}

      {filteredConversations.length > 0 ? (
        <ul className="conversation-list">
          {filteredConversations.map((conv) => (
            <li
              key={conv.id}
              className="conversation-item"
              onClick={() =>
                conv.is_group
                  ? navigate(`/groups/${conv.id}`)
                  : navigate(`/chat/${conv.id}`)
              }
            >
              <img
                src={resolveMediaUrl(conv.profilePicture || conv.groupPicture)}
                alt="profil"
                className="conversation-avatar"
              />

              <div className="conversation-info">
                <div className="conversation-name">
                  {conv.groupName || conv.username || 'Utilisateur inconnu'}
                </div>

                <div className="conversation-preview">
                  {conv.last_message
                    ? conv.last_message.slice(0, 45) +
                      (conv.last_message.length > 45 ? '...' : '')
                    : 'Aucun message'}
                </div>
              </div>

              <div className="conversation-right">
                <span className="conversation-time">
                  {conv.last_message_time
                    ? new Date(conv.last_message_time).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : ''}
                </span>

                {conv.is_unread && <span className="unread-dot"></span>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-conversations">
          {activeTab === 'groupes'
            ? 'Aucun groupe pour le moment.'
            : 'Aucune conversation pour le moment.'}
        </p>
      )}

      <BottomNav />
    </div>
  );
};

export default Conversations;
