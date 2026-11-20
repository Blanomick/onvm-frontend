import React, { forwardRef } from "react";

/* Lecteur vidéo ONVM
   Essaie d'abord la version MP4 convertie par Cloudinary (lisible sur tous
   les téléphones), puis le fichier d'origine. Pendant les premières minutes
   après la publication, la conversion peut être en cours : le fichier
   d'origine prend alors le relais. */

function typeFromUrl(url) {
  const path = String(url || "").split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".mp4") || path.endsWith(".m4v")) return "video/mp4";
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".ogv")) return "video/ogg";
  return undefined; // .mov, .3gp… : le navigateur décide
}

const SmartVideo = forwardRef(function SmartVideo(
  { media, onFail, poster, ...videoProps },
  ref
) {
  const sources = [media?.mp4Url, media?.url].filter(
    (value, index, list) => value && list.indexOf(value) === index
  );

  if (!sources.length) return null;

  return (
    <video
      ref={ref}
      poster={poster || media?.thumbnail || undefined}
      playsInline
      {...videoProps}
    >
      {sources.map((src, index) => (
        <source
          key={src}
          src={src}
          type={typeFromUrl(src)}
          onError={index === sources.length - 1 ? onFail : undefined}
        />
      ))}
    </video>
  );
});

export default SmartVideo;
