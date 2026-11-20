import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SERVER_URL = (
  process.env.REACT_APP_WEBSOCKET_URL ||
  process.env.REACT_APP_API_URL ||
  ""
).replace(/\/+$/, "");

function Live() {
  const [lives, setLives] = useState([]);
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const socketRef = useRef(null);

  const startLive = () => {
    const socket = socketRef.current;
    if (!socket || !user) return;
    const liveData = {
      userId: user.id,
      username: user.username,
      avatar: user.profilePicture,
      startedAt: new Date().toISOString(),
    };
    socket.emit("startLive", liveData);
  };

  useEffect(() => {
    // Connexion seulement quand la page Live est ouverte
    if (!SERVER_URL) return undefined;
    const socket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("liveStarted", (data) => {
      setLives((prev) => [...prev, data]);
    });

    socket.on("liveEnded", (socketId) => {
      setLives((prev) => prev.filter((live) => live.socketId !== socketId));
    });

    return () => {
      socket.off("liveStarted");
      socket.off("liveEnded");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <div>
      <h2>Lives en cours</h2>
      <button onClick={startLive}>Démarrer un live</button>
      <div>
        {lives.map((live, index) => (
          <div key={index} className="live-card">
            <img src={live.avatar} alt="profil" width={50} height={50} />
            <p>{live.username} est en live</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Live;
