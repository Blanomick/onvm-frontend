import React, { useRef, useState } from "react";

const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

function getSessionToken() {
  const directToken = localStorage.getItem("token");

  if (directToken) return directToken;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.token || "";
  } catch {
    return "";
  }
}

export default function SafetyReportForm() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const submitting = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting.current) return;

    setError("");
    setReference("");

    const token = getSessionToken();

    if (!token) {
      setError(
        "Session introuvable. Reconnecte-toi avant d’envoyer le signalement."
      );
      return;
    }

    submitting.current = true;
    setSending(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${API_URL}/api/safety-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target: target.trim(),
          description: description.trim(),
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Envoi impossible. Réessaie.");
      }

      if (!data.reference) {
        throw new Error("La réception du signalement n’a pas pu être confirmée.");
      }

      setReference(String(data.reference));
      setTarget("");
      setDescription("");
    } catch (err) {
      setError(
        err.name === "AbortError"
          ? "La confirmation tarde à arriver. Le signalement a peut-être été reçu ; réessaie plus tard si nécessaire."
          : err.message
      );
    } finally {
      clearTimeout(timeout);
      submitting.current = false;
      setSending(false);
    }
  }

  return (
    <section
      className="onvm-settings__section onvm-safety"
      aria-labelledby="onvm-safety-title"
    >
      <h2 id="onvm-safety-title">Sécurité et signalements</h2>

      <button
        type="button"
        className="onvm-settings__option"
        aria-expanded={open}
        aria-controls="onvm-safety-panel"
        onClick={() => setOpen((value) => !value)}
      >
        Signaler un problème de sécurité
      </button>

      <div id="onvm-safety-panel" hidden={!open}>
        <p>
          Signale notamment tout problème concernant l’exploitation ou
          les abus sexuels sur mineurs.
        </p>

        <p>
          Indique un pseudonyme, un lien ou l’identifiant du contenu.
          Ne joins, ne télécharge et ne renvoie aucun contenu sexuel
          impliquant un mineur.
        </p>

        <form onSubmit={handleSubmit} className="onvm-safety__form">
          <label htmlFor="onvm-safety-target">
            Compte ou contenu concerné
          </label>
          <input
            id="onvm-safety-target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            minLength={2}
            maxLength={500}
            required
            disabled={sending}
          />

          <label htmlFor="onvm-safety-description">
            Description du problème
          </label>
          <textarea
            id="onvm-safety-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            minLength={10}
            maxLength={3000}
            rows={6}
            required
            disabled={sending}
          />

          <p>
            Ton signalement et l’identifiant de ton compte seront transmis
            à l’administration ONVM pour examiner la situation.
          </p>

          {error && <p role="alert">{error}</p>}

          {reference && (
            <p role="status">
              Signalement enregistré. Référence : {reference}.
              Cela ne signifie pas encore que le contenu a été examiné.
            </p>
          )}

          <button type="submit" disabled={sending}>
            {sending ? "Envoi en cours…" : "Envoyer le signalement"}
          </button>
        </form>

        <p>
          Si le formulaire ne fonctionne pas :{" "}
          <a href="mailto:mamboisrael3@gmail.com">
            mamboisrael3@gmail.com
          </a>
        </p>
      </div>

      <p>
        <a
          href="https://onvme.netlify.app/child-safety.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Consulter les normes de sécurité des enfants
        </a>
      </p>
    </section>
  );
}