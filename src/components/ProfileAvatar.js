import React, { useState } from "react";
import "./ProfileAvatar.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

function resolvePhoto(value) {
  if (!value || typeof value !== "string") return null;

  // Les anciennes images par défaut sont remplacées par notre avatar.
  if (/default-profile\.(png|svg)(?:[?#]|$)/i.test(value)) {
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
      {/* Icône par défaut quand la personne n'a pas (encore) de photo */}
      <img
        className="onvm-avatar-default"
        src="/default-profile.svg"
        alt=""
        aria-hidden="true"
        draggable="false"
      />

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