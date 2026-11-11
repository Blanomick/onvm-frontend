import React, { useState } from "react";
import "./ProfileAvatar.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

function resolvePhoto(value) {
  if (!value || typeof value !== "string") return null;

  // Les anciennes images par défaut sont remplacées par notre avatar.
  if (/\/default-profile\.png(?:[?#]|$)/i.test(value)) {
    return null;
  }

  try {
    const url = new URL(value, `${apiUrl}/`);

    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export default function ProfileAvatar({
  src,
  name = "Utilisateur",
  size = 40,
  className = "",
}) {
  const [failedUrl, setFailedUrl] = useState(null);
  const photo = resolvePhoto(src);
  const showPhoto = photo && failedUrl !== photo;

  return (
    <span
      className={`onvm-profile-avatar ${className}`}
      style={{ "--avatar-size": `${size}px` }}
      role="img"
      aria-label={`Avatar de ${name}`}
    >
      <span className="onvm-avatar-sculpture" aria-hidden="true">
        <span className="onvm-avatar-shoulders" />
        <span className="onvm-avatar-head" />
      </span>

      {showPhoto && (
        <img
          src={photo}
          alt=""
          onError={() => setFailedUrl(photo)}
        />
      )}
    </span>
  );
}