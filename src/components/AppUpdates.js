import React, { useEffect, useRef, useState } from "react";
import "./AppUpdates.css";

/* ONVM — installation et mises à jour
   1. Web : bouton « Installer ONVM » (Android/Chrome) ou mode d'emploi (iPhone).
   2. Web : détecte une nouvelle version publiée et propose de recharger.
   3. Appli Android (Capacitor) : confirme le bon démarrage d'une mise à jour
      OTA ; sinon le plugin revient automatiquement à la version précédente. */

const DISMISS_KEY = "onvm_install_dismissed_at";
const DISMISS_DAYS = 7;
const CHECK_EVERY_MS = 10 * 60 * 1000;

function nativeApp() {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function standalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function iosSafari() {
  const ua = window.navigator.userAgent || "";
  const ios =
    /iphone|ipad|ipod/i.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios && !/crios|fxios|edgios/i.test(ua);
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at && Date.now() - at < DISMISS_DAYS * 24 * 3600 * 1000;
  } catch {
    return false;
  }
}

function currentMainScript() {
  const script = Array.from(document.scripts).find((item) =>
    /\/static\/js\/main\.[a-z0-9]+\.js/i.test(item.src || "")
  );
  return script ? script.src.split("/").pop() : null;
}

/* ---------- 3. OTA Android ---------- */
let otaConfirmed = false;

function useOtaReady() {
  useEffect(() => {
    if (!nativeApp() || otaConfirmed) return undefined;

    const updater = window.Capacitor?.Plugins?.CapacitorUpdater;
    if (!updater?.notifyAppReady) return undefined;

    let second;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        if (otaConfirmed) return;
        updater
          .notifyAppReady()
          .then(() => {
            otaConfirmed = true;
          })
          .catch((error) => console.error("Confirmation OTA :", error));
      });
    });

    return () => {
      window.cancelAnimationFrame(first);
      if (second !== undefined) window.cancelAnimationFrame(second);
    };
  }, []);
}

/* ---------- 2. Nouvelle version web ---------- */
function useWebUpdate() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (nativeApp() || process.env.NODE_ENV !== "production") return undefined;

    const running = currentMainScript();
    if (!running) return undefined;

    let stopped = false;

    const check = async () => {
      if (stopped || document.hidden) return;
      try {
        const response = await fetch(`/asset-manifest.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        const latest = String(data?.files?.["main.js"] || "").split("/").pop();
        if (latest && latest !== running) setAvailable(true);
      } catch {
        // hors connexion : on réessaiera plus tard
      }
    };

    const timer = window.setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const firstCheck = window.setTimeout(check, 15000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.clearTimeout(firstCheck);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const apply = async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      await registration?.update?.();
      registration?.waiting?.postMessage("SKIP_WAITING");
    } catch {
      // le rechargement suffit
    }
    window.location.reload();
  };

  return { available, apply };
}

/* ---------- 1. Installation ---------- */
function useInstall() {
  const promptRef = useRef(null);
  const [mode, setMode] = useState(null); // "prompt" | "ios" | null

  useEffect(() => {
    if (nativeApp() || standalone() || recentlyDismissed()) return undefined;

    const onPrompt = (event) => {
      event.preventDefault();
      promptRef.current = event;
      setMode("prompt");
    };
    const onInstalled = () => {
      promptRef.current = null;
      setMode(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let iosTimer;
    if (iosSafari()) {
      iosTimer = window.setTimeout(() => setMode("ios"), 4000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(iosTimer);
    };
  }, []);

  const install = async () => {
    const event = promptRef.current;
    if (!event) return;
    event.prompt();
    try {
      await event.userChoice;
    } finally {
      promptRef.current = null;
      setMode(null);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setMode(null);
  };

  return { mode, install, dismiss };
}

export default function AppUpdates() {
  useOtaReady();
  const update = useWebUpdate();
  const installer = useInstall();

  if (update.available) {
    return (
      <div className="onvm-app-banner" role="status">
        <img src="/icons/icon-192.png" alt="" width="36" height="36" />
        <div className="onvm-app-banner__text">
          <strong>Nouvelle version d’ONVM</strong>
          <span>Recharge pour profiter des nouveautés.</span>
        </div>
        <button type="button" className="onvm-app-banner__main" onClick={update.apply}>
          Mettre à jour
        </button>
      </div>
    );
  }

  if (installer.mode === "prompt") {
    return (
      <div className="onvm-app-banner" role="dialog" aria-label="Installer ONVM">
        <img src="/icons/icon-192.png" alt="" width="36" height="36" />
        <div className="onvm-app-banner__text">
          <strong>Installer ONVM</strong>
          <span>Ajoute l’appli à ton écran d’accueil.</span>
        </div>
        <button type="button" className="onvm-app-banner__main" onClick={installer.install}>
          Installer
        </button>
        <button
          type="button"
          className="onvm-app-banner__close"
          onClick={installer.dismiss}
          aria-label="Plus tard"
        >
          ×
        </button>
      </div>
    );
  }

  if (installer.mode === "ios") {
    return (
      <div className="onvm-app-banner" role="dialog" aria-label="Installer ONVM">
        <img src="/icons/icon-192.png" alt="" width="36" height="36" />
        <div className="onvm-app-banner__text">
          <strong>Installer ONVM sur ton iPhone</strong>
          <span>
            Touche <b>Partager</b> <span aria-hidden="true">⬆︎</span> puis
            « <b>Sur l’écran d’accueil</b> ».
          </span>
        </div>
        <button
          type="button"
          className="onvm-app-banner__close"
          onClick={installer.dismiss}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>
    );
  }

  return null;
}

/* Enregistre le service worker (site web uniquement) */
export function registerServiceWorker() {
  if (
    nativeApp() ||
    process.env.NODE_ENV !== "production" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", { updateViaCache: "none" })
      .catch((error) => console.error("Service worker :", error));
  });
}
