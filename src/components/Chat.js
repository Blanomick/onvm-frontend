import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import {
  FaArrowLeft,
  FaImage,
  FaMicrophone,
  FaPaperPlane,
  FaPhone,
  FaVideo,
  FaEllipsisH,
  FaTimes,
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';

import VoiceMessageBubble from './VoiceMessageBubble';
import { CallPanel, VoiceNoteButton } from './calls';
import './Chat.css';

const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  console.error("❌ REACT_APP_API_URL manquant !");
}

const socket = io(API_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
});
const toAbs = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

function normalizeMessage(m) {
  const msg = { ...m };

  if (msg.type === 'audio' && msg.url && !msg.voice_url) {
    msg.type = 'voice';
    msg.voice_url = msg.url;
    delete msg.url;
  }

  if (msg.media) msg.media = toAbs(msg.media);
  if (msg.voice_url) msg.voice_url = toAbs(msg.voice_url);

  return msg;
}

const Chat = ({ currentUser }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const { id, groupId } = useParams();

  const isGroup = Boolean(groupId);
  const conversationId = isGroup ? null : id;
  const currentGroupId = isGroup ? groupId : null;
  const activeChatId = isGroup ? `group_${currentGroupId}` : conversationId;

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showCallPanel, setShowCallPanel] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.body.classList.add('hide-logo-bar');

    return () => {
      document.body.classList.remove('hide-logo-bar');
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id || !activeChatId) return;

    socket.emit('chat:join', {
      chatId: activeChatId,
      userId: currentUser.id,
    });

    const handleIncomingMessage = (message) => {
      const msg = normalizeMessage(message);
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    };

    socket.on('chat:message', handleIncomingMessage);

    return () => {
      socket.emit('chat:leave', {
        chatId: activeChatId,
        userId: currentUser.id,
      });

      socket.off('chat:message', handleIncomingMessage);
    };
  }, [activeChatId, currentUser?.id]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const url = isGroup
          ? `${apiUrl}/api/messages/group/${currentGroupId}`
          : `${apiUrl}/api/messages/${conversationId}?withUser=1&viewerId=${currentUser?.id}`;

        const res = await fetch(url);
        const data = await res.json();

        if (Array.isArray(data)) {
          setMessages(data.map(normalizeMessage));
        } else if (Array.isArray(data.messages)) {
          setMessages(data.messages.map(normalizeMessage));

          if (data.user) {
            setChatUser(data.user);
          }

          if (data.group) {
            setChatUser({
              id: data.group.id,
              username: data.group.name,
              profilePicture: data.group.profile_photo,
            });
          }
        } else {
          setMessages([]);
        }

        scrollToBottom();
      } catch (err) {
        console.error('[ERREUR] Chargement messages :', err);
        setMessages([]);
      }
    };

    if ((conversationId || currentGroupId) && currentUser?.id) {
      fetchMessages();
    }
  }, [conversationId, currentGroupId, currentUser?.id, isGroup]);

  useEffect(() => {
    if (!isGroup || !currentGroupId) return;

    const fetchMembers = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/groups/${currentGroupId}/members`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setGroupMembers(data);
        }
      } catch (err) {
        console.error('[ERREUR] Chargement membres groupe :', err);
      }
    };

    fetchMembers();
  }, [currentGroupId, isGroup]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePickMedia = () => {
    fileInputRef.current?.click();
  };

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setMedia(file);
  };

  const handleSend = async () => {
    if ((!content.trim() && !media) || sending) return;

    const textToSend = content.trim();

    const formData = new FormData();

    if (isGroup) {
      formData.append('group_id', currentGroupId);
    } else {
      formData.append('conversation_id', conversationId);
    }

    formData.append('sender_id', currentUser.id);

    if (textToSend) formData.append('content', textToSend);
    if (media) formData.append('media', media);

    try {
      setSending(true);

      const optimisticMsg = normalizeMessage({
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        group_id: currentGroupId,
        sender_id: currentUser.id,
        type: 'text',
        content: textToSend,
        media: media ? URL.createObjectURL(media) : null,
        created_at: new Date().toISOString(),
      });

      setMessages((prev) => [...prev, optimisticMsg]);

      socket.emit('chat:message', {
        chatId: activeChatId,
        message: optimisticMsg,
      });

      setContent('');
      setMedia(null);

      await fetch(`${apiUrl}/api/messages/send`, {
        method: 'POST',
        body: formData,
      });

      scrollToBottom();
    } catch (err) {
      console.error('[ERREUR] Envoi message :', err);
    } finally {
      setSending(false);
    }
  };

  const handleVoiceSent = async (payload) => {
    const audioMsg = normalizeMessage({
      id: payload?.id || `temp-${Date.now()}`,
      type: 'voice',
      voice_url: payload.voice_url || payload.playUrl || payload.url,
      sender_id: currentUser.id,
      conversation_id: conversationId,
      group_id: currentGroupId,
      created_at: payload?.created_at || new Date().toISOString(),
      content: '',
      media: null,
    });

    setMessages((prev) => [...prev, audioMsg]);

    socket.emit('chat:message', {
      chatId: activeChatId,
      message: audioMsg,
    });

    try {
      const formData = new FormData();

      if (isGroup) {
        formData.append('group_id', currentGroupId);
      } else {
        formData.append('conversation_id', conversationId);
      }

      formData.append('sender_id', currentUser.id);
      formData.append('type', 'voice');
      formData.append('voice_url', audioMsg.voice_url);
      formData.append('content', '');

      await fetch(`${apiUrl}/api/messages/send`, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.error('[ERREUR] Enregistrement vocal :', err);
    }
  };

  if (!currentUser?.id) {
    return (
      <div className="chat-page mobile-chat-page">
        <div className="chat-empty-state">
          Vous devez être connecté pour accéder à la messagerie.
        </div>
      </div>
    );
  }

  const title = isGroup
    ? chatUser?.username || `Groupe #${currentGroupId}`
    : chatUser?.username || `Utilisateur #${conversationId}`;

  return (
    <div className="chat-page mobile-chat-page">
      <header className="mobile-chat-header">
        <button
          type="button"
          className="chat-header-icon"
          onClick={() => navigate(-1)}
          aria-label="Retour"
        >
          <FaArrowLeft />
        </button>

        <div className="chat-header-profile">
          <div className="chat-avatar-stack">
            {isGroup && groupMembers.length > 0 ? (
              groupMembers.slice(0, 3).map((member) => (
                <img
                  key={member.id}
                  src={toAbs(member.profilePicture) || '/default-profile.png'}
                  alt=""
                  className="chat-avatar small"
                />
              ))
            ) : (
              <img
                src={toAbs(chatUser?.profilePicture) || '/default-profile.png'}
                alt=""
                className="chat-avatar"
              />
            )}
          </div>

          <div className="chat-header-text">
            <strong>{title}</strong>
            <span>
              {isGroup
                ? `${groupMembers.length || 1} membre${groupMembers.length > 1 ? 's' : ''}`
                : 'Conversation'}
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            type="button"
            className="chat-header-icon"
            onClick={() => setShowCallPanel((prev) => !prev)}
            aria-label="Appel audio"
          >
            <FaPhone />
          </button>

          <button
            type="button"
            className="chat-header-icon"
            onClick={() => setShowCallPanel((prev) => !prev)}
            aria-label="Appel vidéo"
          >
            <FaVideo />
          </button>

          <button
            type="button"
            className="chat-header-icon"
            aria-label="Options"
          >
            <FaEllipsisH />
          </button>
        </div>
      </header>

      {showCallPanel && (
        <div className="mobile-call-panel">
          <CallPanel chatId={activeChatId} currentUser={currentUser} />
        </div>
      )}

      <main className="mobile-chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            Aucun message pour le moment.
            <span>Commence la discussion.</span>
          </div>
        )}

        {messages.map((msg, index) => {
          const isOwn = Number(msg.sender_id) === Number(currentUser.id);
          const hasHtmlMedia =
            msg.content?.includes('<img') ||
            msg.content?.includes('<video') ||
            msg.content?.includes('<audio');

          return (
            <div
              key={`${msg.id}-${index}`}
              className={`mobile-message-row ${isOwn ? 'sent' : 'received'}`}
            >
              <div className="mobile-message-bubble">
                {msg.content && (
                  <div
                    className="message-html"
                    dangerouslySetInnerHTML={{ __html: msg.content }}
                  />
                )}

                {msg.type === 'voice' && msg.voice_url && (
                  <VoiceMessageBubble src={msg.voice_url} isOwn={isOwn} />
                )}

                {msg.media && (
                  <div className="message-media-preview">
                    {msg.media.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={toAbs(msg.media)} controls playsInline />
                    ) : msg.media.match(/\.(mp3|ogg|webm|m4a)$/i) ? (
                      <audio src={toAbs(msg.media)} controls />
                    ) : (
                      <img src={toAbs(msg.media)} alt="media" />
                    )}
                  </div>
                )}

                {hasHtmlMedia && <span className="story-message-label">Story</span>}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </main>

      {media && (
        <div className="selected-media-pill">
          <span>{media.name}</span>
          <button type="button" onClick={() => setMedia(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      <footer className="mobile-chat-input-bar">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          hidden
          onChange={handleMediaChange}
        />

        <button
          type="button"
          className="chat-tool-btn"
          onClick={handlePickMedia}
          aria-label="Ajouter un média"
        >
          <FaImage />
        </button>

        <div className="voice-tool-btn">
          <FaMicrophone className="voice-fake-icon" />
          <VoiceNoteButton
            chatId={activeChatId}
            currentUser={currentUser}
            onSent={handleVoiceSent}
          />
        </div>

        <input
          className="mobile-chat-text-input"
          type="text"
          placeholder="Message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />

        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSend}
          disabled={sending || (!content.trim() && !media)}
          aria-label="Envoyer"
        >
          <FaPaperPlane />
        </button>
      </footer>
    </div>
  );
};

export default Chat;