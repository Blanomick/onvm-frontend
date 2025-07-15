import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000"); // mettre ton API render en prod

function Live() {
  const [lives, setLives] = useState([]);
  const [user] = useState(JSON.parse(localStorage.getItem("user")));

  const startLive = () => {
    const liveData = {
      userId: user.id,
      username: user.username,
      avatar: user.profilePicture,
      startedAt: new Date().toISOString(),
    };
    socket.emit("startLive", liveData);
  };

  useEffect(() => {
    socket.on("liveStarted", (data) => {
      setLives((prev) => [...prev, data]);
    });

    socket.on("liveEnded", (socketId) => {
      setLives((prev) => prev.filter((live) => live.socketId !== socketId));
    });

    return () => {
      socket.off("liveStarted");
      socket.off("liveEnded");
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
