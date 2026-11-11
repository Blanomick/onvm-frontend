import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiAtSign, FiCheck } from "react-icons/fi";

import ProfileAvatar from "./ProfileAvatar";
import BioText, {
  decodeBio,
  encodeBio,
  adjustMentions,
} from "./BioText";

import "./EditBio.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const EditBio = ({ currentUser }) => {
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const savingRef = useRef(false);

  const [document, setDocument] = useState({ text: "", mentions: [] });
  const [initialBio, setInitialBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [reload, setReload] = useState(0);

  const [query, setQuery] = useState(null);
  const [searchState, setSearchState] = useState({
    key: "",
    results: [],
    loading: false,
    error: "",
  });

  const userId = currentUser?.id;
  const storedBio = encodeBio(document.text, document.mentions);
  const changed = storedBio !== initialBio;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function fetchBio() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`${apiUrl}/api/users/${userId}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Chargement impossible.");

        const data = await response.json();
        const decoded = decodeBio(data.bio || "");

        if (active) {
          setDocument(decoded);
          setInitialBio(encodeBio(decoded.text, decoded.mentions));
          setQuery(null);
        }
      } catch (error) {
        if (active && error.name !== "AbortError") {
          setLoadError("Impossible de charger ta bio.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchBio();

    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, reload]);

  const queryKey = query
    ? `${query.start}:${query.end}:${query.term}`
    : "";

  useEffect(() => {
    if (!query || !userId) return;

    const controller = new AbortController();
    let active = true;
    const term = query.term.trim();

    if (!term) {
      setSearchState({
        key: queryKey,
        results: [],
        loading: false,
        error: "",
      });
      return;
    }

    setSearchState({
      key: queryKey,
      results: [],
      loading: true,
      error: "",
    });

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: term,
          userId: String(userId),
        });

        const response = await fetch(`${apiUrl}/api/search?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Recherche indisponible.");

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Réponse invalide.");

        // L’API actuelle renvoie aussi certains abonnements :
        // on conserve uniquement les noms correspondant à la recherche.
        const results = data.filter(
          (person) =>
            /^\d+$/.test(String(person.id)) &&
            typeof person.username === "string" &&
            person.username.toLocaleLowerCase().includes(
              term.toLocaleLowerCase()
            )
        );

        if (active) {
          setSearchState({
            key: queryKey,
            results: [...new Map(
              results.map((person) => [String(person.id), person])
            ).values()].slice(0, 6),
            loading: false,
            error: "",
          });
        }
      } catch (error) {
        if (active && error.name !== "AbortError") {
          setSearchState({
            key: queryKey,
            results: [],
            loading: false,
            error: "Impossible de rechercher des personnes.",
          });
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, queryKey, userId]);

  function detectMention(text, cursor, mentions) {
    const beforeCursor = text.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([^@\n]{0,40})$/);

    if (!match) {
      setQuery(null);
      return;
    }

    const start = cursor - match[1].length - 1;

    if (mentions.some((item) => start >= item.start && start < item.end)) {
      setQuery(null);
      return;
    }

    const next = { start, end: cursor, term: match[1] };

    setQuery((previous) =>
      previous?.start === next.start &&
      previous?.end === next.end &&
      previous?.term === next.term
        ? previous
        : next
    );
  }

  function handleChange(event) {
    const text = event.target.value;
    const mentions = adjustMentions(
      document.text,
      text,
      document.mentions
    );

    setDocument({ text, mentions });
    setSaveError("");
    detectMention(text, event.target.selectionStart, mentions);
  }

  function choosePerson(person) {
    if (!query || savingRef.current) return;

    const label = `@${person.username}`;
    const text =
      document.text.slice(0, query.start) +
      label +
      " " +
      document.text.slice(query.end);

    const shift = label.length + 1 - (query.end - query.start);

    const mentions = document.mentions.flatMap((mention) => {
      if (mention.end <= query.start) return [mention];

      if (mention.start >= query.end) {
        return [{
          ...mention,
          start: mention.start + shift,
          end: mention.end + shift,
        }];
      }

      return [];
    });

    mentions.push({
      id: String(person.id),
      username: person.username,
      start: query.start,
      end: query.start + label.length,
    });

    const cursor = query.start + label.length + 1;

    setDocument({ text, mentions });
    setQuery(null);
    setSaveError("");

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSave(event) {
    event.preventDefault();

    if (savingRef.current || !changed) return;

    // La route actuelle du backend refuse une bio vide.
    if (!document.text.trim()) {
      setSaveError("Ajoute quelques mots avant d’enregistrer.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    setQuery(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${apiUrl}/api/users/${userId}/bio`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ bio: storedBio }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Impossible d’enregistrer la bio.");
      }

      navigate(`/profile/${userId}`, { replace: true });
    } catch (error) {
      setSaveError(error.message || "Vérifie ta connexion et réessaie.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const searchIsCurrent = searchState.key === queryKey;
  const results = searchIsCurrent ? searchState.results : [];

  if (!userId) {
    return (
      <main className="onvm-bio">
        <h1>Modifier ma bio</h1>
        <p>Connecte-toi pour modifier ta biographie.</p>
        <button type="button" onClick={() => navigate("/auth")}>
          Se connecter
        </button>
      </main>
    );
  }

  return (
    <main className="onvm-bio">
      <header className="onvm-bio__header">
        <button
          type="button"
          className="onvm-bio__back"
          onClick={() => navigate(`/profile/${userId}`)}
          disabled={saving}
          aria-label="Retour au profil"
        >
          <FiArrowLeft />
        </button>
        <h1>Modifier ma bio</h1>
      </header>

      {loading ? (
        <p className="onvm-bio__status" role="status">
          Chargement de ta bio…
        </p>
      ) : loadError ? (
        <div className="onvm-bio__status">
          <p role="alert">{loadError}</p>
          <button type="button" onClick={() => setReload((value) => value + 1)}>
            Réessayer
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="onvm-bio__identity">
            <ProfileAvatar
              src={currentUser.profilePicture}
              name={currentUser.username || "Mon profil"}
              size={56}
            />
            <div>
              <strong>{currentUser.username || "Mon profil"}</strong>
              <p>Quelques mots qui te ressemblent.</p>
            </div>
          </div>

          <label htmlFor="onvm-bio-input" className="onvm-bio__label">
            Ta biographie
          </label>

          <textarea
            ref={textareaRef}
            id="onvm-bio-input"
            value={document.text}
            disabled={saving}
            onChange={handleChange}
            onSelect={(event) => {
              if (event.currentTarget.selectionStart !== event.currentTarget.selectionEnd) {
                setQuery(null);
                return;
              }

              detectMention(
                event.currentTarget.value,
                event.currentTarget.selectionStart,
                document.mentions
              );
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery(null);
            }}
            placeholder="Tes passions, ton univers, les personnes qui comptent…"
            aria-describedby="onvm-bio-help"
          />

          <div className="onvm-bio__meta">
            <span id="onvm-bio-help">
              <FiAtSign aria-hidden="true" />
              Tape @ puis choisis une personne.
            </span>
            <span>{document.text.length} caractères</span>
          </div>

          {query && !saving && (
            <section className="onvm-bio__suggestions" aria-label="Personnes à mentionner">
              {!query.term.trim() ? (
                <p>Écris le début du nom après @.</p>
              ) : !searchIsCurrent || searchState.loading ? (
                <p role="status">Recherche…</p>
              ) : searchState.error ? (
                <p role="alert">{searchState.error}</p>
              ) : results.length === 0 ? (
                <p>Aucune personne trouvée.</p>
              ) : (
                results.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => choosePerson(person)}
                  >
                    <ProfileAvatar
                      src={person.profilePicture || person.profilepicture}
                      name={person.username}
                      size={36}
                    />
                    <span>{person.username}</span>
                    <FiAtSign aria-hidden="true" />
                  </button>
                ))
              )}
            </section>
          )}

          <section className="onvm-bio__preview" aria-label="Aperçu de la bio">
            <h2>Aperçu sur ton profil</h2>
            {document.text ? (
              <BioText value={storedBio} />
            ) : (
              <p>Ta biographie apparaîtra ici.</p>
            )}
          </section>

          {saveError && (
            <p className="onvm-bio__error" role="alert">{saveError}</p>
          )}

          <button
            type="submit"
            className="onvm-bio__save"
            disabled={saving || !changed || !document.text.trim()}
          >
            <FiCheck aria-hidden="true" />
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </form>
      )}
    </main>
  );
};

export default EditBio;