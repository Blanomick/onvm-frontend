// Liens de partage uniques ONVM + envoi vers les autres réseaux sociaux
const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const cache = new Map();

// Lien unique : type "p" (publication) ou "u" (profil)
export async function getShareLink(type, id) {
  const key = `${type}:${id}`;
  if (cache.has(key)) return cache.get(key);

  const promise = fetch(`${apiUrl}/api/share/link/${type}/${id}`)
    .then((response) => {
      if (!response.ok) throw new Error("Lien indisponible");
      return response.json();
    })
    .then((data) => data.url)
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, promise);
  return promise;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Ancienne méthode (WebView, HTTP…)
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export function canNativeShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function nativeShare({ title, text, url, files }) {
  const data = { title, text, url };
  if (files?.length && navigator.canShare?.({ files })) data.files = files;
  await navigator.share(data);
}

// Adresses de partage des autres réseaux
export const NETWORKS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    color: "#25D366",
    href: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`.trim())}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    color: "#1877F2",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "messenger",
    label: "Messenger",
    color: "#0084FF",
    href: (url) => `fb-messenger://share/?link=${encodeURIComponent(url)}`,
    mobileOnly: true,
  },
  {
    id: "x",
    label: "X",
    color: "#000000",
    href: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    color: "#229ED9",
    href: (url, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "sms",
    label: "SMS",
    color: "#34C759",
    href: (url, text) => `sms:?&body=${encodeURIComponent(`${text} ${url}`.trim())}`,
    mobileOnly: true,
  },
  {
    id: "email",
    label: "E-mail",
    color: "#6B7280",
    href: (url, text) =>
      `mailto:?subject=${encodeURIComponent(text || "ONVM")}&body=${encodeURIComponent(`${text}\n${url}`)}`,
  },
];

export function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

export function openNetwork(network, url, text) {
  const href = network.href(url, text || "");
  if (/^https?:/.test(href)) {
    window.open(href, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = href;
  }
}

// Envoie le lien dans une discussion privée ONVM
export async function sendToOnvmFriend({ fromId, toId, url, text }) {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const convoResponse = await fetch(`${apiUrl}/api/conversations/create`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ sender_id: fromId, receiver_id: toId }),
  });
  const convo = await convoResponse.json().catch(() => null);
  if (!convoResponse.ok || !convo?.id) {
    throw new Error(convo?.error || "Discussion impossible à ouvrir.");
  }

  const form = new FormData();
  form.append("conversation_id", convo.id);
  form.append("sender_id", fromId);
  form.append("content", `${text ? `${text}\n` : ""}${url}`);

  const response = await fetch(`${apiUrl}/api/messages/send`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Envoi impossible.");
  return data;
}
