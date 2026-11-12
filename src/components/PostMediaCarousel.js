import React, { useEffect, useRef, useState } from "react";
import "./PostMediaCarousel.css";

function MediaItem({ item, index, onOpen, autoPlay }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mediaRef = useRef(null);

  useEffect(() => {
    setFailed(false);
    setAttempt(0);
  }, [item.url]);

  // Arrête les vidéos et audios lorsqu’ils sortent de l’écran.
  useEffect(() => {
    const element = mediaRef.current;

    if (!element || item.kind === "image") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) element.pause();
      },
      { threshold: 0.1 }
    );

    const pauseWhenHidden = () => {
      if (document.hidden) element.pause();
    };

    observer.observe(element);
    document.addEventListener("visibilitychange", pauseWhenHidden);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      element.pause();
    };
  }, [item.url, item.kind, attempt, failed]);

  if (failed) {
    return (
      <div className="onvm-carousel-error" role="status">
        <span>Ce média ne se charge pas.</span>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setAttempt((value) => value + 1);
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (item.kind === "video") {
    return (
      <video
        key={`${item.url}-${attempt}`}
        ref={mediaRef}
        src={item.url}
        controls
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        muted={autoPlay}
        loop={autoPlay}
        onError={() => setFailed(true)}
        aria-label={`Vidéo ${index + 1}`}
      />
    );
  }

  if (item.kind === "audio") {
    return (
      <div className="onvm-carousel-audio">
        <span>{item.name || "Message audio"}</span>
        <audio
          key={`${item.url}-${attempt}`}
          ref={mediaRef}
          src={item.url}
          controls
          preload="metadata"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const image = (
    <img
      key={`${item.url}-${attempt}`}
      src={item.url}
      alt={item.name || `Photo ${index + 1}`}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );

  return onOpen ? (
    <button
      type="button"
      className="onvm-carousel-open"
      onClick={() => onOpen(index)}
      aria-label={`Ouvrir la photo ${index + 1}`}
    >
      {image}
    </button>
  ) : (
    image
  );
}

export default function PostMediaCarousel({
  items,
  onOpen,
  onRemove,
  disabled = false,
  autoPlay = false,
}) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const update = () => {
      const trackLeft = track.getBoundingClientRect().left;
      const slides = Array.from(track.children);

      let nearest = 0;
      let distance = Infinity;

      slides.forEach((slide, index) => {
        const current = Math.abs(
          slide.getBoundingClientRect().left - trackLeft
        );

        if (current < distance) {
          distance = current;
          nearest = index;
        }
      });

      setActive(nearest);
    };

    track.addEventListener("scroll", update, { passive: true });

    const observer = new ResizeObserver(update);
    observer.observe(track);
    update();

    return () => {
      track.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [items.length]);

  function goTo(index) {
    const track = trackRef.current;
    const slide = track?.children[index];

    if (!track || !slide) return;

    const distance =
      slide.getBoundingClientRect().left -
      track.getBoundingClientRect().left;

    track.scrollBy({
      left: distance,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  if (!items.length) return null;

  const current = Math.min(active, items.length - 1);

  return (
    <section
      className="onvm-carousel"
      aria-label="Médias de la publication"
    >
      <div
        ref={trackRef}
        className={`onvm-carousel-track ${
          items.length === 1 ? "is-single" : ""
        }`}
        tabIndex={0}
        onKeyDown={(event) => {
          // Ne pas intercepter les commandes du lecteur vidéo.
          if (event.target !== event.currentTarget) return;

          if (event.key === "ArrowRight") {
            event.preventDefault();
            goTo(Math.min(current + 1, items.length - 1));
          }

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            goTo(Math.max(current - 1, 0));
          }
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.url}
            className="onvm-carousel-slide"
            role="group"
            aria-label={`Média ${index + 1} sur ${items.length}`}
          >
            <MediaItem
              item={item}
              index={index}
              onOpen={onOpen}
              autoPlay={autoPlay}
            />

            {onRemove && (
              <button
                type="button"
                className="onvm-carousel-remove"
                disabled={disabled}
                onClick={() => onRemove(index)}
                aria-label={`Retirer le média ${index + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="onvm-carousel-navigation">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
            aria-label="Média précédent"
          >
            ‹
          </button>

          <span aria-live="polite">
            {current + 1} / {items.length}
          </span>

          <button
            type="button"
            disabled={current === items.length - 1}
            onClick={() => goTo(current + 1)}
            aria-label="Média suivant"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}