// ONVM — abonnement aux notifications push
// Web (navigateur / appli installée) : Web Push via le service worker.
// Appli Android : Firebase (plugin @capacitor/push-notifications).

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

function token() {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

function nativePush() {
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  if (cap.isPluginAvailable && !cap.isPluginAvailable("PushNotifications")) return null;
  return cap.Plugins?.PushNotifications || null;
}

export function isNativeApp() {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function webPushSupported() {
  return (
    !isNativeApp() &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function webPushPermission() {
  return webPushSupported() ? Notification.permission : "unsupported";
}

function keyToBytes(base64url) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function post(path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Serveur : ${response.status}`);
  return response.json().catch(() => ({}));
}

/* ---------- Web ---------- */

// askPermission = true seulement après un appui de l'utilisateur
export async function enableWebPush(askPermission = false) {
  if (!webPushSupported() || !apiUrl || !token()) return "unsupported";

  let permission = Notification.permission;
  if (permission === "default" && askPermission) {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return permission;

  const config = await fetch(`${apiUrl}/api/push/config`).then((r) => r.json());
  if (!config?.vapidPublicKey) return "unavailable";

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  // Clé du serveur changée : on se réabonne
  if (subscription) {
    const current = subscription.options?.applicationServerKey;
    const expected = keyToBytes(config.vapidPublicKey);
    if (current) {
      const same =
        current.byteLength === expected.byteLength &&
        new Uint8Array(current).every((value, index) => value === expected[index]);
      if (!same) {
        await subscription.unsubscribe().catch(() => undefined);
        subscription = null;
      }
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(config.vapidPublicKey),
    });
  }

  await post("/api/push/subscribe", { subscription: subscription.toJSON() });
  return "granted";
}

/* ---------- Android (Capacitor) ---------- */

let nativeListeners = false;

export async function enableNativePush() {
  const PushNotifications = nativePush();
  if (!PushNotifications || !apiUrl || !token()) return "unsupported";

  if (!nativeListeners) {
    nativeListeners = true;

    await PushNotifications.addListener("registration", ({ value }) => {
      try {
        localStorage.setItem("onvm_fcm_token", value);
      } catch {
        // ignore
      }
      post("/api/push/register-fcm", { token: value }).catch((error) =>
        console.warn("Enregistrement des notifications :", error.message)
      );
    });

    await PushNotifications.addListener("registrationError", (error) =>
      console.warn("Notifications Android :", error?.error || error)
    );

    await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const data = event?.notification?.data || {};
      if (data.url && String(data.url).startsWith("/")) window.location.assign(data.url);
    });
  }

  try {
    await PushNotifications.createChannel({
      id: "onvm_calls",
      name: "Appels",
      description: "Appels vocaux et vidéo entrants",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    await PushNotifications.createChannel({
      id: "onvm_messages",
      name: "Messages et activité",
      description: "Nouveaux messages, j'aime, commentaires",
      importance: 4,
      visibility: 1,
      vibration: true,
    });
    await PushNotifications.createChannel({
      id: "onvm_silent",
      name: "Appels terminés",
      description: "Arrête la sonnerie quand l'appel est décroché ou terminé",
      importance: 2,
      visibility: 1,
      vibration: false,
    });
  } catch {
    // Android < 8 : pas de canaux
  }

  let status = await PushNotifications.checkPermissions();
  if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
    status = await PushNotifications.requestPermissions();
  }
  if (status.receive !== "granted") return "denied";

  await PushNotifications.register();
  return "granted";
}

/* ---------- Déconnexion ---------- */

export async function disablePush() {
  try {
    if (webPushSupported()) {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager?.getSubscription();
      if (subscription) {
        await post("/api/push/unsubscribe", { endpoint: subscription.endpoint }).catch(() => undefined);
        await subscription.unsubscribe();
      }
    }
    const PushNotifications = nativePush();
    if (PushNotifications) {
      const fcm = localStorage.getItem("onvm_fcm_token");
      if (fcm) {
        await post("/api/push/unsubscribe", { token: fcm }).catch(() => undefined);
        localStorage.removeItem("onvm_fcm_token");
      }
      await PushNotifications.unregister().catch(() => undefined);
    }
  } catch {
    // rien de bloquant à la déconnexion
  }
}
