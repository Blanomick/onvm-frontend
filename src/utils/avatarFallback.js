// Remplace automatiquement toute photo de profil qui ne se charge pas
// (photo jamais ajoutée, ancien fichier supprimé du serveur…) par
// l'icône de profil par défaut ONVM.
export const DEFAULT_AVATAR = "/default-profile.svg";

const AVATAR_HINT = /(avatar|profile|profil|story-profile|author|user-pic|\bpp\b)/i;

function looksLikeAvatar(img) {
  if (img.dataset.avatar === "true") return true;
  const hints = [
    img.className && String(img.className.baseVal ?? img.className),
    img.getAttribute("alt"),
    img.getAttribute("src"),
    img.parentElement?.className && String(img.parentElement.className),
  ].filter(Boolean).join(" ");
  return AVATAR_HINT.test(hints);
}

export function isDefaultAvatar(value) {
  return !value || /default-profile\.(png|svg)(?:[?#]|$)/i.test(String(value));
}

export function installAvatarFallback() {
  if (typeof document === "undefined" || window.__onvmAvatarFallback) return;
  window.__onvmAvatarFallback = true;

  document.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.dataset.avatarFallback === "done") return;
      if (!looksLikeAvatar(img)) return;
      img.dataset.avatarFallback = "done";
      img.removeAttribute("srcset");
      img.src = DEFAULT_AVATAR;
    },
    true
  );
}
