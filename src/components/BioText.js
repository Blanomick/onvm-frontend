import React from "react";
import { Link } from "react-router-dom";

// Convertit la bio enregistrée en texte lisible et mentions.
export function decodeBio(value = "") {
  const source = String(value);
  const pattern = /@\{(\+?\d+):([^}]*)\}/g;

  let text = "";
  let previousEnd = 0;
  const mentions = [];

  for (const match of source.matchAll(pattern)) {
    text += source.slice(previousEnd, match.index);

    try {
      const username = decodeURIComponent(match[2]);
      const label = `@${username}`;
      const start = text.length;

      text += label;
      mentions.push({
        id: match[1],
        username,
        start,
        end: text.length,
      });
    } catch {
      text += match[0];
    }

    previousEnd = match.index + match[0].length;
  }

  text += source.slice(previousEnd);
  return { text, mentions };
}

// Conserve l’identifiant du profil dans la bio enregistrée.
export function encodeBio(text, mentions) {
  let result = "";
  let previousEnd = 0;

  for (const mention of [...mentions].sort((a, b) => a.start - b.start)) {
    if (
      mention.start < previousEnd ||
      text.slice(mention.start, mention.end) !== `@${mention.username}`
    ) {
      continue;
    }

    result += text.slice(previousEnd, mention.start);
    result += `@{${mention.id}:${encodeURIComponent(mention.username)}}`;
    previousEnd = mention.end;
  }

  return result + text.slice(previousEnd);
}

// Déplace les mentions après une modification du texte.
// Une mention modifiée directement redevient du texte ordinaire.
export function adjustMentions(before, after, mentions) {
  let start = 0;

  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  ) {
    start += 1;
  }

  let oldEnd = before.length;
  let newEnd = after.length;

  while (
    oldEnd > start &&
    newEnd > start &&
    before[oldEnd - 1] === after[newEnd - 1]
  ) {
    oldEnd -= 1;
    newEnd -= 1;
  }

  const shift = after.length - before.length;

  return mentions.flatMap((mention) => {
    if (mention.end <= start) return [mention];

    if (mention.start >= oldEnd) {
      return [{
        ...mention,
        start: mention.start + shift,
        end: mention.end + shift,
      }];
    }

    return [];
  });
}

export default function BioText({ value = "" }) {
  const { text, mentions } = decodeBio(value);
  const parts = [];
  let previousEnd = 0;

  mentions.forEach((mention) => {
    parts.push(text.slice(previousEnd, mention.start));

    parts.push(
      <Link
        key={`${mention.id}-${mention.start}`}
        to={`/profile/${mention.id}`}
        style={{
          color: "#e90064",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {text.slice(mention.start, mention.end)}
      </Link>
    );

    previousEnd = mention.end;
  });

  parts.push(text.slice(previousEnd));

  return (
    <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {parts}
    </span>
  );
}