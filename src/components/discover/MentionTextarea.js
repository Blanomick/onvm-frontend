import React, { useEffect, useRef, useState } from "react";
import "./Discover.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

function avatar(url) {
  if (!url || /default-profile/i.test(url)) return "/default-profile.svg";
  return /^https?:\/\//.test(url) ? url : `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Zone de texte qui propose des personnes quand on tape @
export default function MentionTextarea({ value, onChange, ...props }) {
  const ref = useRef(null);
  const [query, setQuery] = useState(null);
  const [people, setPeople] = useState([]);

  const detect = (text, caret) => {
    const before = text.slice(0, caret);
    const match = before.match(/(^|\s)@([\p{L}\p{N}_.]{0,30})$/u);
    setQuery(match ? match[2] : null);
  };

  useEffect(() => {
    if (query === null) {
      setPeople([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`${apiUrl}/api/discover/people?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : []))
        .then((list) => setPeople(Array.isArray(list) ? list : []))
        .catch(() => undefined);
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const pick = (person) => {
    const element = ref.current;
    const caret = element ? element.selectionStart : value.length;
    const before = value.slice(0, caret).replace(/@[\p{L}\p{N}_.]*$/u, "");
    const handle = String(person.username || "").replace(/\s+/g, "");
    const after = value.slice(caret);
    const next = `${before}@${handle} ${after.replace(/^\s+/, "")}`;
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      if (!element) return;
      const position = before.length + handle.length + 2;
      element.focus();
      element.setSelectionRange(position, position);
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        {...props}
        ref={ref}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          detect(event.target.value, event.target.selectionStart);
        }}
        onKeyUp={(event) => detect(event.currentTarget.value, event.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {query !== null && people.length > 0 && (
        <ul className="onvm-mention-list" role="listbox">
          {people.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(person)}
              >
                <img src={avatar(person.profilePicture)} alt="" data-avatar="true" />
                <span>
                  <strong>{person.username}</strong>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
