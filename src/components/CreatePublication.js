import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FiX,
  FiImage,
  FiUserPlus,
  
  FiEye,
  FiEdit3,
} from "react-icons/fi";

import ProfileAvatar from "./ProfileAvatar";
import PostMediaCarousel from "./PostMediaCarousel";
import "./CreatePublication.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const MAX_COUNT = 5;
const MAX_SIZE = 200 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/opus",
  "audio/aac",
  "audio/x-m4a",
  "audio/m4a",
];

function kindOf(file) {
  return file.type.split("/")[0];
}

export default function CreatePublication({ currentUser }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const uploadLockRef = useRef(false);
  const urlsRef = useRef(new Set());
  const mountedRef = useRef(false);

  const [attachments, setAttachments] = useState([]);
 
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState(false);

  const [showPeople, setShowPeople] = useState(false);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState({
    term: "",
    results: [],
    loading: false,
    error: "",
  });

  const [fileError, setFileError] = useState("");
  const [publishError, setPublishError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(null);

  const userId = currentUser?.id;
  const searchTerm = query.replace(/^@/, "").trim();

  const mentions = people.map((person) => `@${person.username}`).join(" ");
  const publicationText = [caption.trim(), mentions].filter(Boolean).join("\n\n");

  const canPublish =
    Boolean(userId) &&
    !publishing &&
    (Boolean(caption.trim()) || attachments.length > 0);

  useEffect(() => {
    mountedRef.current = true;
    const urls = urlsRef.current;

    return () => {
      mountedRef.current = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (!showPeople || !searchTerm || !userId) return;

    let activeRequest = true;
    const controller = new AbortController();

    setSearch({
      term: searchTerm,
      results: [],
      loading: true,
      error: "",
    });

    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/search`, {
          params: { q: searchTerm, userId },
          signal: controller.signal,
          timeout: 15000,
        });

        if (!Array.isArray(response.data)) {
          throw new Error("Réponse invalide.");
        }

        const matching = response.data.filter(
          (person) =>
            person.id != null &&
            typeof person.username === "string" &&
            person.username
              .toLocaleLowerCase()
              .includes(searchTerm.toLocaleLowerCase())
        );

        const results = [
          ...new Map(
            matching.map((person) => [String(person.id), person])
          ).values(),
        ];

        if (activeRequest) {
          setSearch({
            term: searchTerm,
            results,
            loading: false,
            error: "",
          });
        }
      } catch (error) {
        if (activeRequest && !axios.isCancel(error)) {
          setSearch({
            term: searchTerm,
            results: [],
            loading: false,
            error: "La recherche est indisponible. Réessaie.",
          });
        }
      }
    }, 300);

    return () => {
      activeRequest = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, showPeople, userId]);

  function addFiles(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";

    if (uploadLockRef.current) return;

    const added = [];
    const errors = [];
    const signatures = new Set(
      attachments.map(
        ({ file }) => `${file.name}:${file.size}:${file.lastModified}`
      )
    );

    for (const file of selected) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        errors.push(`${file.name} : format non pris en charge.`);
        continue;
      }

      if (!file.size || file.size > MAX_SIZE) {
        errors.push(`${file.name} : fichier vide ou supérieur à 200 Mo.`);
        continue;
      }

      const signature = `${file.name}:${file.size}:${file.lastModified}`;
      if (signatures.has(signature)) continue;

      if (attachments.length + added.length >= MAX_COUNT) {
        errors.push("Tu peux ajouter au maximum 5 médias.");
        break;
      }

      signatures.add(signature);

      const url = URL.createObjectURL(file);
      urlsRef.current.add(url);

      added.push({
        file,
        url,
        kind: kindOf(file),
      });
    }

 if (added.length) {
  setAttachments((previous) => [...previous, ...added]);
}

    setFileError([...new Set(errors)].join(" "));
    setPublishError("");
  }

  function removeFile(index) {
    if (uploadLockRef.current) return;

    const removed = attachments[index];
    if (!removed) return;

    URL.revokeObjectURL(removed.url);
    urlsRef.current.delete(removed.url);

    setAttachments((previous) =>
      previous.filter((_, position) => position !== index)
    );

   
    setFileError("");
  }

  function selectPerson(person) {
    setPeople((previous) =>
      previous.some((item) => String(item.id) === String(person.id))
        ? previous
        : [...previous, person]
    );

    setQuery("");
    setShowPeople(false);
  }

 

  async function publish() {
    if (uploadLockRef.current || !canPublish) return;

    if (!apiUrl) {
      setPublishError("L’adresse du serveur n’est pas configurée.");
      return;
    }

    uploadLockRef.current = true;
    setPublishing(true);
    setPublishError("");
    setProgress(null);

    const formData = new FormData();
    formData.append("userId", String(userId));
    formData.append("content", publicationText);

    attachments.forEach(({ file }) => {
      formData.append("media", file);
    });

    try {
      const token = localStorage.getItem("token");

      await axios.post(`${apiUrl}/api/publications`, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        onUploadProgress: (event) => {
          if (!mountedRef.current || !event.total) return;

          setProgress(
            Math.min(100, Math.round((event.loaded / event.total) * 100))
          );
        },
      });

      if (mountedRef.current) {
        navigate("/publication", { replace: true });
      }
    } catch (error) {
      if (!mountedRef.current) return;

      const message = error.response?.data?.message;

      setPublishError(
        typeof message === "string"
          ? message
          : error.response
            ? "La publication a échoué. Ton contenu est conservé ici."
            : "La réponse du serveur n’est pas arrivée. Vérifie le fil avant de réessayer pour éviter un doublon."
      );
    } finally {
      uploadLockRef.current = false;

      if (mountedRef.current) {
        setPublishing(false);
        setProgress(null);
      }
    }
  }

  if (!userId) {
    return (
      <main className="onvm-compose">
        <h1>Nouvelle publication</h1>
        <p>Connecte-toi pour publier.</p>
        <button type="button" onClick={() => navigate("/auth")}>
          Se connecter
        </button>
      </main>
    );
  }

  const suggestions =
    search.term === searchTerm
      ? search.results.filter(
          (person) =>
            !people.some((item) => String(item.id) === String(person.id))
        )
      : [];

  return (
    <main className="onvm-compose">
      <header className="onvm-compose__header">
        <button
          type="button"
          className="onvm-compose__close"
          onClick={() => navigate("/publication")}
          disabled={publishing}
          aria-label="Fermer l’éditeur"
        >
          <FiX aria-hidden="true" />
        </button>

        <h1>{preview ? "Aperçu" : "Nouvelle publication"}</h1>

        <img
          src="/onvm-logo.png"
          alt="ONVM"
          className="onvm-compose__logo"
          width="38"
          height="38"
        />
      </header>

      <section className="onvm-compose__editor" aria-busy={publishing}>
        <div className="onvm-compose__author">
          <ProfileAvatar
            src={currentUser.profilePicture}
            name={currentUser.username || "Mon profil"}
            size={44}
          />

          <div>
            <strong>{currentUser.username || "Mon profil"}</strong>
            <span>{preview ? "Aperçu de ta publication" : "À toi de partager."}</span>
          </div>
        </div>

        {preview ? (
          <p className="onvm-compose__text-preview">
            {publicationText || "Publication sans légende"}
          </p>
        ) : (
          <textarea
            className="onvm-compose__text"
            aria-label="Texte de la publication"
            placeholder="Qu’as-tu envie de partager ?"
            value={caption}
            onChange={(event) => {
              setCaption(event.target.value);
              setPublishError("");
            }}
            disabled={publishing}
          />
        )}

       {attachments.length > 0 && (
  <div className="onvm-compose__media-block">
    <PostMediaCarousel
      items={attachments.map((attachment) => ({
        url: attachment.url,
        kind: attachment.kind,
        name: attachment.file.name,
      }))}
      onRemove={preview ? undefined : removeFile}
      disabled={publishing}
    />
  </div>
)}

        {!preview && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              multiple
              hidden
              onChange={addFiles}
              disabled={publishing}
            />

            <div className="onvm-compose__tools">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={publishing || attachments.length >= MAX_COUNT}
              >
                <FiImage aria-hidden="true" />
                Médias
              </button>

              <button
                type="button"
                onClick={() => setShowPeople((value) => !value)}
                disabled={publishing}
                aria-expanded={showPeople}
                aria-controls="onvm-compose-people"
              >
                <FiUserPlus aria-hidden="true" />
                Identifier
              </button>

              <span>{attachments.length} / {MAX_COUNT}</span>
            </div>

            <p className="onvm-compose__hint">
              Photos, vidéos ou audio · 200 Mo maximum par fichier
            </p>

            {fileError && (
              <p className="onvm-compose__error" role="alert">
                {fileError}
              </p>
            )}

            {people.length > 0 && (
              <div className="onvm-compose__people">
                {people.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    disabled={publishing}
                    onClick={() =>
                      setPeople((previous) =>
                        previous.filter(
                          (item) => String(item.id) !== String(person.id)
                        )
                      )
                    }
                    aria-label={`Retirer la mention de ${person.username}`}
                  >
                    @{person.username}
                    <FiX aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}

            {showPeople && (
              <section
                id="onvm-compose-people"
                className="onvm-compose__search"
                aria-label="Identifier des personnes"
              >
                <label htmlFor="onvm-compose-query">
                  Rechercher une personne
                </label>

                <input
                  id="onvm-compose-query"
                  type="search"
                  placeholder="Nom d’utilisateur…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  disabled={publishing}
                  autoComplete="off"
                />

                {searchTerm && (
                  <div aria-live="polite">
                    {search.term !== searchTerm || search.loading ? (
                      <p>Recherche…</p>
                    ) : search.error ? (
                      <p>{search.error}</p>
                    ) : suggestions.length === 0 ? (
                      <p>Aucune personne à ajouter.</p>
                    ) : (
                      suggestions.slice(0, 6).map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          className="onvm-compose__suggestion"
                          onClick={() => selectPerson(person)}
                          disabled={publishing}
                        >
                          <ProfileAvatar
                            src={person.profilePicture || person.profilepicture}
                            name={person.username}
                            size={34}
                          />
                          <span>{person.username}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {publishError && (
          <p className="onvm-compose__error" role="alert">
            {publishError}
          </p>
        )}

        {publishing && (
          <div className="onvm-compose__progress" role="status">
            {progress === null
              ? "Envoi en cours…"
              : progress < 100
                ? `Envoi des fichiers : ${progress} %`
                : "Envoi terminé, traitement de la publication…"}
          </div>
        )}
      </section>

      <footer className="onvm-compose__footer">
        <button
          type="button"
          className="onvm-compose__preview-button"
          onClick={() => {
            setPreview((value) => !value);
            setShowPeople(false);
          }}
          disabled={publishing || (!caption.trim() && !attachments.length)}
        >
          {preview ? <FiEdit3 /> : <FiEye />}
          {preview ? "Modifier" : "Aperçu"}
        </button>

        <button
          type="button"
          className="onvm-compose__publish"
          disabled={!canPublish}
          onClick={publish}
        >
          {publishing ? "Publication…" : "Publier"}
        </button>
      </footer>
    </main>
  );
}