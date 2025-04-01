import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const apiUrl = process.env.REACT_APP_API_URL;
const socketUrl = process.env.REACT_APP_WEBSOCKET_URL;

const socket = io(socketUrl, {
  transports: ['websocket'],
});

const Live = ({ user }) => {
  const [liveStarted, setLiveStarted] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [liveInfo, setLiveInfo] = useState(null);

  useEffect(() => {
    socket.on('new-message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on('new-reaction', (data) => {
      setReactions((prev) => [...prev, data]);
    });

    socket.on('notify-live', (data) => {
      setLiveInfo(data);
    });

    socket.on('end-live', (data) => {
      if (data.userId === user.id) {
        setLiveStarted(false);
        setLiveInfo(null);
        setMessages([]);
        setReactions([]);
      }
    });

    return () => {
      socket.off('new-message');
      socket.off('new-reaction');
      socket.off('notify-live');
      socket.off('end-live');
    };
  }, [user.id]);

  const handleStartLive = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/live/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          profilePicture: user.profilePicture,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLiveStarted(true);
        setLiveInfo(data);
        socket.emit('start-live', {
          username: user.username,
          userId: user.id,
          profilePicture: user.profilePicture,
        });
      }
    } catch (error) {
      console.error('Erreur lors du démarrage du live :', error);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() !== '') {
      socket.emit('live-message', {
        liveId: user.id,
        message,
        username: user.username,
      });
      setMessage('');
    }
  };

  const handleReact = (reaction) => {
    socket.emit('reaction', {
      userId: user.id,
      username: user.username,
      reaction,
    });
  };

  return (
    <div className="p-4">
      {!liveStarted ? (
        <button onClick={handleStartLive} className="bg-blue-500 text-white px-4 py-2 rounded">
          Démarrer le live
        </button>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-2">Direct en cours</h2>

          {liveInfo && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong>{liveInfo.username}</strong> est en direct
              </p>
            </div>
          )}

          {/* Réactions */}
          <div className="mb-4">
            <h3 className="font-medium">Réactions :</h3>
            <div className="flex gap-2 flex-wrap">
              {reactions.map((r, index) => (
                <span key={index} className="bg-gray-200 px-2 py-1 rounded text-sm">
                  {r.username} : {r.reaction}
                </span>
              ))}
            </div>
          </div>

          {reactions.length > 0 && (
  <div className="mt-2 text-sm text-gray-700">
    <strong>Total de réactions : {reactions.length}</strong>
  </div>
)}




          {/* Messages */}
          <div className="mb-4">
            <h3 className="font-medium">Messages :</h3>
            <ul className="bg-gray-100 p-2 rounded max-h-60 overflow-y-auto">
              {messages.map((msg, index) => (
                <li key={index} className="mb-1">
                  <strong>{msg.username}</strong>: {msg.message}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message"
              className="border rounded px-2 py-1 flex-1"
            />
            <button onClick={handleSendMessage} className="bg-green-500 text-white px-4 py-1 rounded">
              Envoyer
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => handleReact('👍')} className="text-lg">👍</button>
            <button onClick={() => handleReact('❤️')} className="text-lg">❤️</button>
            <button onClick={() => handleReact('🔥')} className="text-lg">🔥</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Live;
