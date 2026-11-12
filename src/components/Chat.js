import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import {
  FiArrowLeft as FaArrowLeft,
  FiImage as FaImage,
 
  FiSend as FaPaperPlane,
  FiPhone as FaPhone,
  FiVideo as FaVideo,
  FiMoreHorizontal as FaEllipsisH,
  FiX as FaTimes,
} from "react-icons/fi";
import {
  useMessageStatus,
  MessageReceipt,
} from "./MessagingProvider";
import ProfileAvatar from "./ProfileAvatar";
import { useNavigate, useParams } from 'react-router-dom';

import VoiceMessageBubble from './VoiceMessageBubble';
import { VoiceNoteButton, useCalls } from "./calls";
import './Chat.css';

const apiUrl = process.env.REACT_APP_API_URL;
const socketUrl = process.env.REACT_APP_WEBSOCKET_URL || apiUrl;

if (!apiUrl) {
  console.error("❌ REACT_APP_API_URL manquant !");
}

const socket = io(socketUrl, {
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
  const calls = useCalls();
const fileInputRef = useRef(null);
const messagesEndRef = useRef(null);
const messagesViewportRef = useRef(null);
const sendLockRef = useRef(false);

  const { id, groupId } = useParams();

  const isGroup = Boolean(groupId);
  const conversationId = isGroup ? null : id;
  const currentGroupId = isGroup ? groupId : null;
 const activeChatId = isGroup
  ? `group_${currentGroupId}`
  : conversationId;

const activeChatRef = useRef(activeChatId);
activeChatRef.current = activeChatId;

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
 
 const [sending, setSending] = useState(false);
const [sendError, setSendError] = useState("");
const messageStatus = useMessageStatus({
  isGroup,
  chatId: isGroup ? currentGroupId : conversationId,
  currentUserId: currentUser?.id,
  messages,
  viewportRef: messagesViewportRef,
});

  useEffect(() => {
    document.body.classList.add('hide-logo-bar');

    return () => {
      document.body.classList.remove('hide-logo-bar');
    };
  }, []);

  useEffect(() => {
  if (!currentUser?.id || !activeChatId) return;

  const joinChat = () => {
    socket.emit("chat:join", {
      chatId: activeChatId,
      userId: currentUser.id,
    });
  };

  const handleIncomingMessage = (message) => {
    const belongsToChat = isGroup
      ? String(message.group_id) === String(currentGroupId)
      : message.group_id == null &&
        String(message.conversation_id) === String(conversationId);

    if (!belongsToChat) return;

    const msg = normalizeMessage({
      ...message,
      sender_id: message.sender_id ?? message.user_id,
    });

    if (msg.id == null) return;

    setMessages((previous) => {
      const exists = previous.some(
        (item) => String(item.id) === String(msg.id)
      );

      return exists ? previous : [...previous, msg];
    });
  };

  socket.on("connect", joinChat);
  socket.on("chat:message", handleIncomingMessage);

  if (socket.connected) {
    joinChat();
  }

  return () => {
    socket.off("connect", joinChat);
    socket.off("chat:message", handleIncomingMessage);

    socket.emit("chat:leave", {
      chatId: activeChatId,
      userId: currentUser.id,
    });
  };
}, [
  activeChatId,
  currentUser?.id,
  isGroup,
  currentGroupId,
  conversationId,
]);
 
useEffect(() => {
  if (!currentUser?.id || (!conversationId && !currentGroupId)) {
    return;
  }

  let active = true;
  let fetching = false;
  const controller = new AbortController();

  const fetchMessages = async () => {
    if (fetching || document.hidden) return;
    fetching = true;

    try {
      const url = isGroup
        ? `${apiUrl}/api/messages/group/${currentGroupId}`
        : `${apiUrl}/api/messages/${conversationId}?withUser=1&viewerId=${currentUser.id}`;

      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Chargement impossible : ${response.status}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.messages;

      if (!Array.isArray(items)) {
        throw new Error("Réponse de messagerie invalide.");
      }

      if (!active) return;

      setMessages(
        items.map((message) =>
          normalizeMessage({
            ...message,
            sender_id: message.sender_id ?? message.user_id,
          })
        )
      );

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
    } catch (error) {
      if (active && error.name !== "AbortError") {
        console.error("[MESSAGES] Actualisation :", error);
      }

      // Conserver les messages déjà affichés en cas de problème réseau.
    } finally {
      fetching = false;
    }
  };

  fetchMessages();

  const interval = window.setInterval(fetchMessages, 3000);

  window.addEventListener("focus", fetchMessages);
  document.addEventListener("visibilitychange", fetchMessages);

  return () => {
    active = false;
    controller.abort();
    window.clearInterval(interval);
    window.removeEventListener("focus", fetchMessages);
    document.removeEventListener("visibilitychange", fetchMessages);
  };
}, [conversationId, currentGroupId, currentUser?.id, isGroup]);


useEffect(() => {
  setGroupMembers([]);

  if (!isGroup || !currentGroupId || !currentUser?.id) {
    return;
  }

  const controller = new AbortController();
  const token = localStorage.getItem("token");

  async function loadMembers() {
    try {
      const response = await fetch(
        `${apiUrl}/api/groups/${currentGroupId}/members`,
        {
          signal: controller.signal,
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        }
      );

      if (!response.ok) {
        throw new Error("Chargement des membres impossible.");
      }

      const data = await response.json();

      if (
        !controller.signal.aborted &&
        Array.isArray(data)
      ) {
        setGroupMembers(data);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("[GROUPE] Chargement des membres :", error);
      }
    }
  }

  loadMembers();

  return () => controller.abort();
}, [isGroup, currentGroupId, currentUser?.id]);


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
  if (
    sendLockRef.current ||
    !currentUser?.id ||
    (!content.trim() && !media)
  ) {
    return;
  }

  sendLockRef.current = true;
  setSending(true);
  setSendError("");

  const originalContent = content;
  const selectedMedia = media;
  const destination = activeChatId;

  const formData = new FormData();

  if (isGroup) {
    formData.append("group_id", currentGroupId);
  } else {
    formData.append("conversation_id", conversationId);
  }

  formData.append("sender_id", currentUser.id);
  formData.append("content", originalContent.trim());

  if (selectedMedia) {
    formData.append("media", selectedMedia);
  }

  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`${apiUrl}/api/messages/send`, {
      method: "POST",
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error || "Le message n’a pas pu être envoyé."
      );
    }

    if (data?.id == null) {
      throw new Error("Le serveur n’a pas confirmé le message.");
    }

    // L’utilisateur peut avoir changé de discussion pendant l’envoi.
    if (activeChatRef.current !== destination) {
      return;
    }

    const savedMessage = normalizeMessage({
      ...data,
      sender_id: data.sender_id ?? data.user_id,
    });

    // Socket.IO peut avoir déjà transmis ce même message.
    setMessages((previous) => {
      const exists = previous.some(
        (message) => String(message.id) === String(savedMessage.id)
      );

      return exists ? previous : [...previous, savedMessage];
    });

    // Ne pas effacer un nouveau brouillon saisi pendant l’envoi.
    setContent((value) =>
      value === originalContent ? "" : value
    );

    setMedia((value) =>
      value === selectedMedia ? null : value
    );

    scrollToBottom();
  } catch (error) {
    if (activeChatRef.current === destination) {
      setSendError(
        error.message || "Envoi impossible. Réessaie."
      );
    }
  } finally {
    sendLockRef.current = false;
    setSending(false);
  }
};
 

  const handleVoiceSent = (payload) => {
  if (!payload?.id) return;

  const audioMsg = normalizeMessage({
    ...payload,
    type: "voice",
    voice_url: payload.voice_url || payload.playUrl || payload.url,
    sender_id: payload.sender_id ?? payload.user_id ?? currentUser.id,
    conversation_id: payload.conversation_id ?? conversationId,
    group_id: currentGroupId,
    content: "",
    media: null,
  });

  setMessages((previous) => {
    const exists = previous.some(
      (message) => String(message.id) === String(audioMsg.id)
    );

    return exists ? previous : [...previous, audioMsg];
  });

  scrollToBottom();
};
  if (!currentUser?.id) {
    return (
      <div className="chat-page mobile-chat-page onvm-chat-refined">
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
    <div className="chat-page mobile-chat-page onvm-chat-refined">
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
      <ProfileAvatar
        key={member.id}
        src={member.profilePicture}
        name={member.username || "Membre"}
        size={30}
        className="onvm-chat-member-avatar"
      />
    ))
  ) : (
    <ProfileAvatar
      src={chatUser?.profilePicture}
      name={title}
      size={38}
    />
  )}
</div>
         <div className="chat-header-text">
  <strong>{title}</strong>
<small
  className={`onvm-presence ${
    messageStatus.available &&
    messageStatus.onlineUserIds.some(
      (id) => Number(id) !== Number(currentUser.id)
    )
      ? "is-online"
      : ""
  }`}
  role="status"
>
  {!messageStatus.available
    ? "Présence indisponible"
    : isGroup
      ? `${
          messageStatus.onlineUserIds.filter(
            (id) => Number(id) !== Number(currentUser.id)
          ).length
        } autre(s) membre(s) en ligne`
      : messageStatus.onlineUserIds.some(
          (id) => Number(id) !== Number(currentUser.id)
        )
        ? "En ligne"
        : "Hors ligne"}
</small>
  <span>
    {isGroup
  ? groupMembers.length > 0
    ? `${groupMembers.length} membre${groupMembers.length > 1 ? "s" : ""}`
    : "Discussion de groupe"
  : "Conversation"}
  </span>

  <small
    role="status"
    style={{
      display: "block",
      marginTop: 4,
      fontSize: 11,
      color: calls?.ready && !isGroup ? "#198754" : "#c62828",
    }}
  >
    {!calls
      ? "Gestionnaire d’appels absent"
      : isGroup
        ? "Appels de groupe indisponibles"
        : !calls.ready
          ? "Serveur d’appels non connecté"
          : "Appels prêts"}
  </small>
</div>
        </div>

        <div className="chat-header-actions">
        <button
  type="button"
  className="chat-header-icon"
  disabled={!calls?.ready || isGroup}
  onClick={() => calls.startCall(conversationId, "audio")}
  aria-label="Appeler en vocal"
  title={isGroup ? "Appels de groupe non disponibles" : "Appel vocal"}
>
  <FaPhone />
</button>

<button
  type="button"
  className="chat-header-icon"
  disabled={!calls?.ready || isGroup}
  onClick={() => calls.startCall(conversationId, "video")}
  aria-label="Appeler en vidéo"
  title={isGroup ? "Appels de groupe non disponibles" : "Appel vidéo"}
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

      

     <main
  className="mobile-chat-messages"
  ref={messagesViewportRef}
>
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
  className={`mobile-message-row ${isOwn ? "sent" : "received"}`}
  data-receipt-id={msg.id}
  data-receipt-incoming={!isOwn ? "true" : "false"}
>
             <div className="mobile-message-bubble">
  {isGroup && !isOwn && (
    <strong className="group-message-author">
      {groupMembers.find(
        (member) => String(member.id) === String(msg.sender_id)
      )?.username || "Membre"}
    </strong>
  )}

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

                {hasHtmlMedia && (
  <span className="story-message-label">Story</span>
)}

{isOwn &&
  Number.isSafeInteger(Number(msg.id)) &&
  Number(msg.id) > 0 && (
    <MessageReceipt
      messageId={msg.id}
      readers={messageStatus.readers}
      isGroup={isGroup}
    />
  )}
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

      {sendError && (
  <p className="chat-send-error" role="alert">
    {sendError}
  </p>
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

       <VoiceNoteButton
  key={activeChatId}
  chatId={activeChatId}
  currentUser={currentUser}
  onSent={handleVoiceSent}
/>

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