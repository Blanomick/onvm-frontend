import React, { useRef, useState, useEffect } from "react";
import "./VoiceMessageBubble.css";

export default function VoiceMessageBubble({ src, isOwn, autoPlay = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;

    const handleLoaded = () => {
      setDuration(audio.duration);
      setLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    if (audio) {
      audio.addEventListener("loadedmetadata", handleLoaded);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
    }

    return () => {
      if (audio) {
        audio.removeEventListener("loadedmetadata", handleLoaded);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
      }
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const handleSliderChange = (e) => {
    const audio = audioRef.current;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(t % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className={`voice-bubble ${isOwn ? "own" : "other"}`}>
      <audio ref={audioRef} preload="auto">
        <source src={src} type="audio/webm" />
        Ton navigateur ne supporte pas l'audio HTML5.
      </audio>

      <button onClick={togglePlay} className="voice-play-button">
        {loading ? "⏳" : playing ? "⏸️" : "▶️"}
      </button>

      <div className="voice-content">
        <div className="voice-wave-container">
          <div className="voice-waveform">
            {Array.from({ length: 40 }).map((_, i) => {
              const height = Math.random() * 10 + 2;
              return (
                <div
                  key={i}
                  className="voice-bar"
                  style={{
                    height: `${height}px`,
                    opacity: i < (currentTime / duration) * 40 ? 1 : 0.25,
                  }}
                />
              );
            })}
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step="0.01"
            value={currentTime}
            onChange={handleSliderChange}
            className="voice-slider"
          />
        </div>
        <div className="voice-timer">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
