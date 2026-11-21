import React from "react";
import { useNavigate } from "react-router-dom";

// Affiche un message en toute sécurité (aucun code HTML exécuté)
// et rend les liens cliquables. Les liens ONVM (/p/… et /u/…) s'ouvrent
// directement dans l'appli.
const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;
const SAFE_SRC = /^(https?:\/\/|\/(?!\/))/i;

function onvmPath(href) {
  try {
    const url = new URL(href);
    const own =
      url.origin === window.location.origin || /(^|\.)onv\.netlify\.app$/i.test(url.hostname);
    if (own && /^\/(p|u)\/[A-Za-z0-9]+\/?$/.test(url.pathname)) return url.pathname;
  } catch {
    return null;
  }
  return null;
}

function Linkified({ text }) {
  const navigate = useNavigate();
  const parts = String(text || "").split(URL_PATTERN);
  return parts.map((part, index) => {
    if (index % 2 === 0) return <React.Fragment key={index}>{part}</React.Fragment>;
    const clean = part.replace(/[.,!?;:)]+$/, "");
    const rest = part.slice(clean.length);
    const inApp = onvmPath(clean);
    return (
      <React.Fragment key={index}>
        <a
          href={clean}
          target={inApp ? undefined : "_blank"}
          rel="noopener noreferrer"
          className="message-link"
          onClick={(event) => {
            if (!inApp) return;
            event.preventDefault();
            navigate(inApp);
          }}
        >
          {clean}
        </a>
        {rest}
      </React.Fragment>
    );
  });
}

// Anciens messages au format HTML (stories partagées…) : on n'en garde
// que le texte et les médias, sans aucun script ni attribut.
function LegacyHtml({ html, toAbs }) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(String(html), "text/html");
  } catch {
    return <Linkified text={String(html).replace(/<[^>]*>/g, " ")} />;
  }
  const nodes = [];
  doc.body.querySelectorAll("img, video, audio").forEach((element, index) => {
    const src = element.getAttribute("src") || element.querySelector("source")?.getAttribute("src");
    if (!src || !SAFE_SRC.test(src)) return;
    const url = toAbs ? toAbs(src) : src;
    const tag = element.tagName.toLowerCase();
    if (tag === "img") nodes.push(<img key={`m${index}`} src={url} alt="" />);
    if (tag === "video") nodes.push(<video key={`m${index}`} src={url} controls playsInline />);
    if (tag === "audio") nodes.push(<audio key={`m${index}`} src={url} controls />);
  });
  doc.body.querySelectorAll("script, style, img, video, audio").forEach((element) => element.remove());
  const text = (doc.body.textContent || "").trim();
  return (
    <>
      {text && (
        <p>
          <Linkified text={text} />
        </p>
      )}
      {nodes}
    </>
  );
}

export default function MessageContent({ content, toAbs }) {
  const value = String(content || "");
  if (/<[a-z][\s\S]*>/i.test(value)) return <LegacyHtml html={value} toAbs={toAbs} />;
  return (
    <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      <Linkified text={value} />
    </span>
  );
}
