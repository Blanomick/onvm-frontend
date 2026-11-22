import io from "socket.io-client";

const SERVER_URL = (
  process.env.REACT_APP_WEBSOCKET_URL ||
  process.env.REACT_APP_API_URL ||
  ""
).replace(/\/+$/, "");

// Connexion au serveur des lives (même sécurité que les appels)
export function connectLives() {
  return io(`${SERVER_URL}/lives`, {
    transports: ["websocket", "polling"],
    auth: (callback) => callback({ token: localStorage.getItem("token") }),
  });
}

export function request(socket, event, payload = {}, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Le serveur ne répond pas.")), timeout);
    socket.emit(event, payload, (result) => {
      clearTimeout(timer);
      if (result?.ok) resolve(result);
      else reject(new Error(result?.error || "Action impossible."));
    });
  });
}

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
export function avatarUrl(url) {
  if (!url || /default-profile/i.test(url)) return "/default-profile.svg";
  return /^https?:\/\//.test(url) ? url : `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
