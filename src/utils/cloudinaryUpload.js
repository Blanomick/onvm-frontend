// Envoi direct navigateur -> Cloudinary (signé par le backend).
// Les gros fichiers sont envoyés par morceaux de 20 Mo : plus de plantage
// du serveur ni de délai dépassé pour les vidéos.

const CHUNK_SIZE = 20 * 1024 * 1024;

export async function getUploadSignature(apiUrl, token) {
  const response = await fetch(`${apiUrl}/api/publications/upload-signature`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? "Ta session a expiré. Reconnecte-toi pour publier."
        : "Envoi direct indisponible."
    );
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function sendChunk({ endpoint, form, headers, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    Object.entries(headers).forEach(([key, value]) =>
      xhr.setRequestHeader(key, value)
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };

    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(
          new Error(data?.error?.message || `Échec de l’envoi (${xhr.status}).`)
        );
      }
    };

    xhr.onerror = () => reject(new Error("Connexion perdue pendant l’envoi."));
    xhr.ontimeout = () => reject(new Error("L’envoi a pris trop de temps."));
    xhr.send(form);
  });
}

// URL lisible partout (HEIC -> JPG, MOV/MKV -> MP4)
function playableUrl(result) {
  const url = result.secure_url;
  const format = String(result.format || "").toLowerCase();

  if (result.resource_type === "image" && ["heic", "heif"].includes(format)) {
    return url.replace(/\.[a-z0-9]+$/i, ".jpg");
  }

  if (
    result.resource_type === "video" &&
    !["mp4", "webm", "mp3", "m4a", "ogg", "wav", "aac", "opus"].includes(format)
  ) {
    return url
      .replace("/video/upload/", "/video/upload/q_auto,vc_auto/")
      .replace(/\.[a-z0-9]+$/i, ".mp4");
  }

  return url;
}

function videoThumbnail(url) {
  return url
    .replace("/video/upload/", "/video/upload/so_0/")
    .replace(/\/q_auto,vc_auto\//, "/")
    .replace(/\.[a-z0-9]+$/i, ".jpg");
}

export async function uploadToCloudinary(file, signature, kind, onProgress) {
  const endpoint = `https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`;
  const total = file.size;
  const uploadId = `onvm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let result = null;

  for (let start = 0; start < total; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, total);
    const form = new FormData();

    form.append("file", file.slice(start, end), file.name || "media");
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("signature", signature.signature);
    form.append("folder", signature.folder);

    const headers =
      total > CHUNK_SIZE
        ? {
            "X-Unique-Upload-Id": uploadId,
            "Content-Range": `bytes ${start}-${end - 1}/${total}`,
          }
        : {};

    result = await sendChunk({
      endpoint,
      form,
      headers,
      onProgress: (loaded) => onProgress?.(start + loaded, total),
    });
  }

  if (!result?.secure_url) {
    throw new Error("Cloudinary n’a pas renvoyé l’adresse du fichier.");
  }

  const resolvedKind =
    kind === "audio" || result.is_audio
      ? "audio"
      : result.resource_type === "image"
        ? "image"
        : result.resource_type === "video"
          ? "video"
          : kind || "other";

  const url = playableUrl(result);

  return {
    url,
    kind: resolvedKind,
    width: result.width || null,
    height: result.height || null,
    duration: result.duration || null,
    ...(resolvedKind === "video" ? { thumbnail: videoThumbnail(url) } : {}),
  };
}
