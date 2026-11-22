// Mode nouchi : remplace les textes de l'INTERFACE (boutons, onglets,
// titres, champs) par leur version nouchi. Les publications, commentaires
// et messages des gens ne sont jamais modifiés.
//
// Pour ajouter ou corriger un mot : modifie simplement la liste ci-dessous
// ("texte affiché en français": "version nouchi").
export const NOUCHI = {
  // Fil
  "Pour toi": "Pour toi mon vié",
  "Abonnements": "Mes môgôs",
  "Récent": "Ça vient de tomber",
  "# Tendances": "# Ça chauffe",
  "Tendances": "Ça chauffe",
  "📍 Près de moi": "📍 Mon quartier",
  "Près de moi": "Mon quartier",
  "🔴 Lives": "🔴 En direct",
  "Lire la suite": "Lis tout",
  "Réduire": "Diminue",

  // Actions
  "Publier": "Lance ça",
  "Partager": "Fais tourner",
  "Envoyer": "Envoie",
  "Copier": "Copie",
  "Copié": "C’est copié",
  "Suivre": "Suivre le môgô",
  "Abonné": "Je suis dedans",
  "Annuler": "Laisse tomber",
  "Fermer": "Laisse",
  "Changer": "Change",
  "Réessayer": "Essaie encore",
  "Modifier le profil": "Arranger mon profil",
  "Se déconnecter": "Je m’en vais",
  "Message": "Écris-lui",

  // Pages
  "Paramètres": "Mes réglages",
  "Notifications": "Les nouvelles",
  "Vidéos": "Vidéos",
  "Lives": "Les lives",
  "Lancer un live": "Lance ton live",
  "🔴 Passer en direct": "🔴 On est en direct !",
  "Voisins": "Gens du quartier",
  "Publications": "Les posts",
  "Activer le son": "Mets le son",
  "Partager la publication": "Fais tourner le post",
  "Partager le profil": "Fais tourner le profil",
  "Envoyer à un ami ONVM": "Envoie à un môgô d’ONVM",
  "Où es-tu ?": "Tu es dans quel coin ?",
  "Ce live est terminé.": "Le live est fini, on est ensemble.",
  "Personne n’est en direct pour le moment.": "Y a personne en direct pour l’instant.",
  "en train d’écrire…": "est en train de taper…",
  "En ligne": "Est là",
  "Hors ligne": "N’est pas là",

  // Champs (textes d'aide)
  "Message...": "On dit quoi ?",
  "Commenter…": "Dis ton gbê…",
  "Rechercher": "Cherche",
  "Rechercher une conversation": "Cherche une discussion",
  "Chercher un #hashtag": "Cherche un #hashtag",
  "Qu’as-tu envie de partager ? Ajoute des #hashtags et @mentionne tes amis":
    "On dit quoi ? Ajoute des #hashtags et @mentionne tes gars",
};

const STORAGE_KEY = "onvm_langue";
const SKIP =
  "[data-no-nouchi], textarea, [contenteditable], .publication-text, .onvm-post-copy, " +
  ".message-html, .onvm-tagpost__text, .onvm-live__chat, .onvm-shared__text, " +
  ".onvm-comments p, .onvm-reel__caption, .onvm-profile-bio, .onvm-profile-name";
const UI =
  "button, a, label, h1, h2, h3, h4, nav, small, strong, [role='tab'], [role='status'], " +
  ".onvm-presence, .onvm-feed-tabs, option";

export function isNouchi() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "nouchi";
  } catch {
    return false;
  }
}

export function setNouchi(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "nouchi" : "fr");
  } catch {
    // ignore
  }
  // Revenir au français : on recharge pour retrouver les textes d'origine
  if (!enabled) window.location.reload();
  else startNouchi();
}

function translateText(node) {
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP) || !parent.closest(UI)) return;
  const raw = node.nodeValue;
  const trimmed = raw.trim();
  const next = NOUCHI[trimmed];
  if (next && next !== trimmed) node.nodeValue = raw.replace(trimmed, next);
}

function translateElement(element) {
  if (element.closest?.(SKIP)) return;
  if ((element.tagName === "INPUT" || element.tagName === "TEXTAREA") && element.placeholder) {
    const next = NOUCHI[element.placeholder.trim()];
    if (next) element.placeholder = next;
  }
}

function translateTree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateText(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  translateElement(root);
  root.querySelectorAll?.("input[placeholder], textarea[placeholder]").forEach(translateElement);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateText(node);
    node = walker.nextNode();
  }
}

let observer = null;

export function startNouchi() {
  if (typeof document === "undefined" || observer || !isNouchi()) return;
  translateTree(document.body);

  let queued = new Set();
  let scheduled = false;
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") queued.add(mutation.target);
      else if (mutation.type === "attributes") queued.add(mutation.target);
      else mutation.addedNodes.forEach((node) => queued.add(node));
    });
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      const batch = queued;
      queued = new Set();
      scheduled = false;
      batch.forEach((node) => node.isConnected && translateTree(node));
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder"],
  });
}
