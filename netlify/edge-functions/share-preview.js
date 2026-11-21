// Aperçu des liens ONVM dans WhatsApp, Facebook, Messenger, X, Telegram…
// Ces applis lisent la page sans exécuter React : pour elles seules, on
// renvoie une petite page avec titre, texte et image (balises Open Graph).
// Les vraies personnes reçoivent l'appli normalement.
const BOTS =
  /(facebookexternalhit|facebookcatalog|Facebot|meta-externalagent|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Discordbot|SkypeUriPreview|Pinterest|redditbot|Googlebot|bingbot|Applebot|Snapchat|vkShare|Viber|Embedly|Iframely|quora link preview|KAKAOTALK|Line\/|Google-InspectionTool)/i;

const DEFAULT_API = "https://onvm-z085.onrender.com";

export default async (request, context) => {
  const agent = request.headers.get("user-agent") || "";
  if (!BOTS.test(agent)) return context.next();

  const { pathname } = new URL(request.url);
  const match = pathname.match(/^\/(p|u)\/([A-Za-z0-9]+)\/?$/);
  if (!match) return context.next();

  const api = (
    globalThis.Netlify?.env?.get?.("REACT_APP_API_URL") || DEFAULT_API
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(`${api}/api/share/og/${match[1]}/${match[2]}`, {
      signal: AbortSignal.timeout(9000),
    });
    const html = await response.text();
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=600",
      },
    });
  } catch {
    return context.next();
  }
};

export const config = { path: ["/p/*", "/u/*"] };
