import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  FaWhatsapp,
  FaFacebookF,
  FaFacebookMessenger,
  FaTelegramPlane,
  FaLinkedinIn,
  FaSms,
  FaEnvelope,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiCopy, FiCheck, FiShare2, FiDownload, FiX, FiSend, FiSearch } from "react-icons/fi";
import {
  NETWORKS,
  canNativeShare,
  copyText,
  getShareLink,
  isMobile,
  nativeShare,
  openNetwork,
  sendToOnvmFriend,
} from "../utils/share";
import "./ShareSheet.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const ICONS = {
  whatsapp: FaWhatsapp,
  facebook: FaFacebookF,
  messenger: FaFacebookMessenger,
  x: FaXTwitter,
  telegram: FaTelegramPlane,
  linkedin: FaLinkedinIn,
  sms: FaSms,
  email: FaEnvelope,
};

function avatarUrl(picture) {
  if (!picture) return "/icons/icon-192.png";
  if (/^https?:\/\//.test(picture)) return picture;
  return `${apiUrl}${picture.startsWith("/") ? "" : "/"}${picture}`;
}

// Carte PNG : QR code + nom, prête à envoyer ou imprimer
function buildQrCard(qrCanvas, name) {
  const width = 720;
  const height = 900;
  const card = document.createElement("canvas");
  card.width = width;
  card.height = height;
  const ctx = card.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(1, "#1f2937");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  const box = 560;
  const x = (width - box) / 2;
  const y = 120;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - 20, y - 20, box + 40, box + 40, 36);
  else ctx.rect(x - 20, y - 20, box + 40, box + 40);
  ctx.fill();
  ctx.drawImage(qrCanvas, x, y, box, box);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
  ctx.fillText("ONVM", width / 2, 75);
  ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
  ctx.fillText(name.length > 26 ? `${name.slice(0, 25)}…` : name, width / 2, 780);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "28px system-ui, -apple-system, sans-serif";
  ctx.fillText("Scanne pour me retrouver sur ONVM", width / 2, 835);
  return card;
}

/**
 * Feuille de partage ONVM
 * - type "p" : publication, type "u" : profil (affiche le QR code)
 */
export default function ShareSheet({
  type,
  id,
  title = "ONVM",
  text = "",
  name = "",
  currentUser,
  showQr = false,
  onClose,
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState({});
  const qrRef = useRef(null);
  const mobile = useMemo(isMobile, []);

  useEffect(() => {
    let stopped = false;
    setUrl("");
    setError("");
    getShareLink(type, id)
      .then((link) => !stopped && setUrl(link))
      .catch(() => !stopped && setError("Impossible de créer le lien. Vérifie ta connexion."));
    return () => {
      stopped = true;
    };
  }, [type, id]);

  // Amis ONVM pour l'envoi direct
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    let stopped = false;
    fetch(`${apiUrl}/api/users`)
      .then((response) => (response.ok ? response.json() : []))
      .then((list) => {
        if (stopped || !Array.isArray(list)) return;
        setFriends(list.filter((user) => Number(user.id) !== Number(currentUser.id)));
      })
      .catch(() => undefined);
    return () => {
      stopped = true;
    };
  }, [currentUser?.id]);

  // Fermer avec Échap
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const flash = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const copy = async () => {
    if (!url) return;
    if (await copyText(url)) {
      setCopied(true);
      flash("Lien copié");
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      flash("Copie impossible");
    }
  };

  const qrCanvas = () => qrRef.current?.querySelector("canvas");

  const qrFile = async () => {
    const canvas = qrCanvas();
    if (!canvas) return null;
    const card = buildQrCard(canvas, name || title);
    const blob = await new Promise((resolve) => card.toBlob(resolve, "image/png"));
    return blob ? new File([blob], `onvm-${(name || "profil").replace(/\W+/g, "-")}.png`, { type: "image/png" }) : null;
  };

  const shareNative = async () => {
    if (!url) return;
    try {
      const files = showQr ? [await qrFile()].filter(Boolean) : undefined;
      await nativeShare({ title, text, url, files });
    } catch (shareError) {
      if (shareError?.name !== "AbortError") {
        try {
          await nativeShare({ title, text, url });
        } catch {
          copy();
        }
      }
    }
  };

  const downloadQr = async () => {
    const file = await qrFile();
    if (!file) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    flash("QR code enregistré");
  };

  const sendTo = async (friend) => {
    if (!url || sent[friend.id]) return;
    setSent((current) => ({ ...current, [friend.id]: "sending" }));
    try {
      await sendToOnvmFriend({
        fromId: currentUser.id,
        toId: friend.id,
        url,
        text: type === "p" ? "Regarde cette publication 👇" : "Voici mon profil ONVM 👇",
      });
      setSent((current) => ({ ...current, [friend.id]: "done" }));
    } catch (sendError) {
      setSent((current) => {
        const next = { ...current };
        delete next[friend.id];
        return next;
      });
      flash(sendError.message);
    }
  };

  const visibleFriends = friends
    .filter((friend) =>
      !query.trim() ||
      String(friend.username || "").toLowerCase().includes(query.trim().toLowerCase())
    )
    .slice(0, 30);

  return (
    <div
      className="onvm-share__backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div className="onvm-share" role="dialog" aria-label={title}>
        <div className="onvm-share__handle" />
        <header className="onvm-share__head">
          <h3>{type === "u" ? "Partager le profil" : "Partager la publication"}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <FiX />
          </button>
        </header>

        {showQr && (
          <div className="onvm-share__qr">
            <div className="onvm-share__qr-box" ref={qrRef}>
              {url ? (
                <QRCodeCanvas
                  value={url}
                  size={512}
                  level="H"
                  marginSize={2}
                  imageSettings={{
                    src: "/icons/icon-192.png",
                    height: 96,
                    width: 96,
                    excavate: true,
                  }}
                />
              ) : (
                <span className="onvm-share__spinner" />
              )}
            </div>
            {name && <strong>{name}</strong>}
            <span>Fais scanner ce code pour qu’on te retrouve sur ONVM</span>
          </div>
        )}

        <div className="onvm-share__link">
          <input
            readOnly
            value={url || (error ? "" : "Création du lien…")}
            placeholder={error}
            onFocus={(event) => event.target.select()}
            aria-label="Lien de partage"
          />
          <button type="button" onClick={copy} disabled={!url}>
            {copied ? <FiCheck /> : <FiCopy />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
        {error && <p className="onvm-share__error">{error}</p>}

        <div className="onvm-share__grid">
          {canNativeShare() && (
            <button type="button" onClick={shareNative} disabled={!url}>
              <span style={{ background: "#111827" }}><FiShare2 /></span>
              Plus…
            </button>
          )}
          {NETWORKS.filter((network) => mobile || !network.mobileOnly).map((network) => {
            const Icon = ICONS[network.id];
            return (
              <button
                key={network.id}
                type="button"
                disabled={!url}
                onClick={() => openNetwork(network, url, text)}
              >
                <span style={{ background: network.color }}><Icon /></span>
                {network.label}
              </button>
            );
          })}
          {showQr && (
            <button type="button" onClick={downloadQr} disabled={!url}>
              <span style={{ background: "#7C3AED" }}><FiDownload /></span>
              QR code
            </button>
          )}
        </div>

        {currentUser?.id && friends.length > 0 && (
          <section className="onvm-share__friends">
            <h4>Envoyer à un ami ONVM</h4>
            <label className="onvm-share__search">
              <FiSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher"
              />
            </label>
            <ul>
              {visibleFriends.map((friend) => (
                <li key={friend.id}>
                  <img src={avatarUrl(friend.profilePicture)} alt="" />
                  <span>{friend.username}</span>
                  <button
                    type="button"
                    disabled={!url || Boolean(sent[friend.id])}
                    onClick={() => sendTo(friend)}
                    className={sent[friend.id] === "done" ? "is-sent" : ""}
                  >
                    {sent[friend.id] === "done" ? (
                      <>
                        <FiCheck /> Envoyé
                      </>
                    ) : sent[friend.id] === "sending" ? (
                      "…"
                    ) : (
                      <>
                        <FiSend /> Envoyer
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {toast && <div className="onvm-share__toast" role="status">{toast}</div>}
      </div>
    </div>
  );
}
