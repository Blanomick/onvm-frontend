import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";

const MessagingContext = createContext(null);

const SERVER_URL = (
  process.env.REACT_APP_WEBSOCKET_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

export function MessagingProvider({ currentUser, children }) {
  const [connection, setConnection] = useState({
    socket: null,
    connected: false,
  });

  useEffect(() => {
    if (!currentUser?.id) {
      setConnection({ socket: null, connected: false });
      return;
    }

    const socket = io(`${SERVER_URL}/messaging`, {
      transports: ["websocket", "polling"],
      auth: (callback) => {
        callback({ token: localStorage.getItem("token") });
      },
    });

    setConnection({ socket, connected: false });

    socket.on("connect", () => {
      setConnection({ socket, connected: true });
    });

    const disconnected = () => {
      setConnection({ socket, connected: false });
    };

    socket.on("disconnect", disconnected);
    socket.on("connect_error", disconnected);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [currentUser?.id]);

  return (
    <MessagingContext.Provider value={connection}>
      {children}
    </MessagingContext.Provider>
  );
}

function request(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit(event, payload, (error, response) => {
      if (error || !response?.ok) {
        reject(
          new Error(response?.error || "Statut temporairement indisponible.")
        );
        return;
      }

      resolve(response);
    });
  });
}

export function useMessageStatus({
  isGroup,
  chatId,
  currentUserId,
  messages,
  viewportRef,
}) {
  const connection = useContext(MessagingContext);
  const socket = connection?.socket;
  const connected = Boolean(connection?.connected);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const [status, setStatus] = useState({
    readers: {},
    onlineUserIds: [],
    available: false,
  });

  useEffect(() => {
    let active = true;
    let busy = false;

    const confirmedReads = new Set();
    const visibleSince = new Map();

    setStatus({
      readers: {},
      onlineUserIds: [],
      available: false,
    });

    if (!connected || !socket || !chatId || !currentUserId) {
      return;
    }

    const target = {
      type: isGroup ? "group" : "private",
      id: Number(chatId),
    };

    async function refresh() {
      if (!active || busy || document.hidden) return;

      busy = true;

      try {
        const visibleIds = [];
        const viewport = viewportRef.current;

        // Une page en arrière-plan ne marque pas ses messages comme lus.
        if (viewport && document.hasFocus()) {
          const bounds = viewport.getBoundingClientRect();
          const now = Date.now();
          const currentlyVisible = new Set();

          viewport
            .querySelectorAll('[data-receipt-incoming="true"]')
            .forEach((element) => {
              const id = Number(element.dataset.receiptId);

              if (!Number.isSafeInteger(id) || id <= 0) return;

              const rect = element.getBoundingClientRect();

              const top = Math.max(rect.top, bounds.top, 0);
              const bottom = Math.min(
                rect.bottom,
                bounds.bottom,
                window.innerHeight
              );

              const minimumVisible =
                Math.min(rect.height, bounds.height) * 0.5;

              const visible =
                minimumVisible > 0 &&
                bottom - top >= minimumVisible &&
                rect.right > Math.max(bounds.left, 0) &&
                rect.left < Math.min(bounds.right, window.innerWidth);

              if (!visible) return;

              currentlyVisible.add(id);

              if (!visibleSince.has(id)) visibleSince.set(id, now);

              if (
                !confirmedReads.has(id) &&
                now - visibleSince.get(id) >= 600
              ) {
                visibleIds.push(id);
              }
            });

          for (const id of visibleSince.keys()) {
            if (!currentlyVisible.has(id)) visibleSince.delete(id);
          }
        } else {
          visibleSince.clear();
        }

        for (let offset = 0; offset < visibleIds.length; offset += 200) {
          const response = await request(socket, "chat:read", {
            ...target,
            messageIds: visibleIds.slice(offset, offset + 200),
          });

          if (!active) return;

          response.messageIds.forEach((id) =>
            confirmedReads.add(Number(id))
          );
        }

        const ids = [...new Set(
          messagesRef.current
            .map((message) => Number(message.id))
            .filter((id) => Number.isSafeInteger(id) && id > 0)
        )];

        const readers = {};
        let onlineUserIds = [];

        // Une requête même sans message permet de connaître la présence.
        for (
          let offset = 0;
          offset < Math.max(ids.length, 1);
          offset += 200
        ) {
          const response = await request(socket, "chat:status", {
            ...target,
            messageIds: ids.slice(offset, offset + 200),
          });

          if (!active) return;

          Object.assign(readers, response.readers);
          onlineUserIds = response.onlineUserIds;
        }

        setStatus({
          readers,
          onlineUserIds,
          available: true,
        });
      } catch {
        if (active) {
          setStatus((previous) => ({
            ...previous,
            onlineUserIds: [],
            available: false,
          }));
        }
      } finally {
        busy = false;
      }
    }

    function visibilityChanged() {
      visibleSince.clear();
      refresh();
    }

    refresh();

    const timer = window.setInterval(refresh, 2500);

    window.addEventListener("focus", visibilityChanged);
    document.addEventListener("visibilitychange", visibilityChanged);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", visibilityChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [
    socket,
    connected,
    isGroup,
    chatId,
    currentUserId,
    viewportRef,
  ]);

  return status;
}

export function MessageReceipt({ messageId, readers, isGroup }) {
  const [expanded, setExpanded] = useState(false);

  const people = readers[String(messageId)] || [];

  if (!people.length) {
    return <span className="onvm-message-receipt">Envoyé</span>;
  }

  if (!isGroup) {
    return (
      <span className="onvm-message-receipt is-read">
        Vu
      </span>
    );
  }

  return (
    <div className="onvm-message-receipt is-read">
      <button
        type="button"
        className="onvm-readers-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        Vu par {people.length}
      </button>

      {expanded && (
        <span className="onvm-readers-names">
          {people
            .map((person) => person.username || "Membre")
            .join(", ")}
        </span>
      )}
    </div>
  );
}