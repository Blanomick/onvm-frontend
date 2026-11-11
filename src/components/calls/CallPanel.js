import React from "react";
import { useCalls } from "./CallProvider";

export default function CallPanel({ chatId }) {
  const calls = useCalls();

  return (
    <div style={{ display: "flex", gap: 12, padding: 12 }}>
      <button
        type="button"
        disabled={!calls?.ready}
        onClick={() => calls.startCall(chatId, "audio")}
      >
        Appel vocal
      </button>

      <button
        type="button"
        disabled={!calls?.ready}
        onClick={() => calls.startCall(chatId, "video")}
      >
        Appel vidéo
      </button>
    </div>
  );
}