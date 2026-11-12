import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaTimes,
  FaImage,
  FaVideo,
  FaMicrophone,
} from 'react-icons/fa';
import { FiSend } from 'react-icons/fi';
import './CommentsSection.css';

const apiUrl = process.env.REACT_APP_API_URL;

function CommentAttachment({ src, kind }) {
  const [audioOnly, setAudioOnly] = useState(false);

  useEffect(() => {
    setAudioOnly(false);
  }, [src]);

  if (!src) return null;

  if (kind === 'audio' || audioOnly) {
    return <audio src={src} controls preload="metadata" />;
  }

  if (kind === 'video') {
    return (
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          if (event.currentTarget.videoWidth === 0) {
            setAudioOnly(true);
          }
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt="Pièce jointe du commentaire"
      loading="lazy"
    />
  );
}

export default function CommentsSection({
  publication,
  user,
  onClose,
  onUpdated,
}) {
  const navigate = useNavigate();

  const [commentContent, setCommentContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [commentMedia, setCommentMedia] = useState(null);
  const [commentPreview, setCommentPreview] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentAudioBusy, setCommentAudioBusy] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const commentStreamRef = useRef(null);
  const commentTimerRef = useRef(null);
  const commentRecordLockRef = useRef(false);
  const commentSendLockRef = useRef(false);
  const commentMountedRef = useRef(true);
  const commentSessionRef = useRef(0);

  useEffect(() => {
    const file = audioBlob || commentMedia;

    if (!file) {
      setCommentPreview('');
      return;
    }

    const url = URL.createObjectURL(file);
    setCommentPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [audioBlob, commentMedia]);

  useEffect(() => {
    commentMountedRef.current = true;

    return () => {
      commentMountedRef.current = false;
      commentSessionRef.current += 1;

      clearInterval(commentTimerRef.current);

      const recorder = mediaRecorderRef.current;

      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;

        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }

      commentStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  const closeComments = () => {
    if (
      commentRecordLockRef.current ||
      commentSendLockRef.current
    ) {
      return;
    }

    setCommentContent('');
    setCommentMedia(null);
    setAudioBlob(null);
    setCommentError('');

    onClose();
  };

  const commentMediaUrl = (value) => {
    if (!value || typeof value !== 'string') return '';

    if (/^https?:\/\//i.test(value)) return value;

    if (
      /^(?:data|blob|javascript):/i.test(value) ||
      value.startsWith('//')
    ) {
      return '';
    }

    return `${(apiUrl || '').replace(/\/+$/, '')}/${value.replace(
      /^\/+/,
      ''
    )}`;
  };

  const commentMediaKind = (value) => {
    const path = String(value || '')
      .split(/[?#]/)[0]
      .toLowerCase();

    if (/\.(mp4|webm|mov|m4v|ogv)$/.test(path)) {
      return 'video';
    }

    if (/\.(ogg|oga|mp3|wav|m4a|aac|opus)$/.test(path)) {
      return 'audio';
    }

    return 'image';
  };

  const selectCommentMedia = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!/^(image|video)\//.test(file.type)) {
      setCommentError('Choisis une image ou une vidéo.');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setCommentError('Le fichier dépasse 200 Mo.');
      return;
    }

    setAudioBlob(null);
    setCommentMedia(file);
    setCommentError('');
  };

  const startRecording = async () => {
    if (
      commentRecordLockRef.current ||
      commentSendLockRef.current
    ) {
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      setCommentError(
        'Le micro nécessite HTTPS ou localhost et un navigateur compatible.'
      );
      return;
    }

    commentRecordLockRef.current = true;

    const session = commentSessionRef.current;

    setCommentAudioBusy(true);
    setCommentError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (
        !commentMountedRef.current ||
        session !== commentSessionRef.current
      ) {
        stream.getTracks().forEach((track) => track.stop());
        commentRecordLockRef.current = false;
        return;
      }

      commentStreamRef.current = stream;

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      mediaRecorderRef.current = recorder;

      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearInterval(commentTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());

        commentStreamRef.current = null;
        mediaRecorderRef.current = null;
        commentRecordLockRef.current = false;

        if (!commentMountedRef.current) return;

        setIsRecording(false);
        setCommentAudioBusy(false);

        if (chunks.length) {
          setCommentMedia(null);

          setAudioBlob(
            new Blob(chunks, {
              type: recorder.mimeType || chunks[0].type,
            })
          );
        }
      };

      recorder.onerror = () => {
        recorder.onstop = null;

        if (recorder.state !== 'inactive') {
          recorder.stop();
        }

        clearInterval(commentTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());

        commentStreamRef.current = null;
        mediaRecorderRef.current = null;
        commentRecordLockRef.current = false;

        setIsRecording(false);
        setCommentAudioBusy(false);
        setCommentError('Enregistrement interrompu. Réessaie.');
      };

      recorder.start();

      setAudioBlob(null);
      setCommentMedia(null);
      setRecordingSeconds(0);
      setIsRecording(true);

      const startedAt = Date.now();

      commentTimerRef.current = setInterval(() => {
        setRecordingSeconds(
          Math.floor((Date.now() - startedAt) / 1000)
        );
      }, 1000);
    } catch {
      clearInterval(commentTimerRef.current);

      commentStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      commentStreamRef.current = null;
      mediaRecorderRef.current = null;
      commentRecordLockRef.current = false;

      if (
        commentMountedRef.current &&
        session === commentSessionRef.current
      ) {
        setIsRecording(false);
        setCommentError(
          'Impossible d’accéder au micro. Vérifie son autorisation.'
        );
      }
    } finally {
      if (
        commentMountedRef.current &&
        session === commentSessionRef.current
      ) {
        setCommentAudioBusy(false);
      }
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder?.state === 'recording') {
      setCommentAudioBusy(true);
      setIsRecording(false);

      clearInterval(commentTimerRef.current);
      recorder.stop();
    }
  };

  const handleComment = async (publicationId) => {
    if (
      commentSendLockRef.current ||
      commentRecordLockRef.current
    ) {
      return;
    }

    if (!user?.id) {
      setCommentError('Connecte-toi pour commenter.');
      return;
    }

    const text = commentContent.trim();

    if (!text && !audioBlob && !commentMedia) return;

    commentSendLockRef.current = true;
    setCommentSending(true);
    setCommentError('');

    try {
      const formData = new FormData();

      formData.append('userId', user.id);

      if (text) {
        formData.append('comment', text);
      }

      if (commentMedia) {
        formData.append('media', commentMedia);
      }

      if (audioBlob) {
        const extension = audioBlob.type.includes('mp4')
          ? 'm4a'
          : audioBlob.type.includes('ogg')
            ? 'ogg'
            : 'webm';

        formData.append(
          'audio',
          audioBlob,
          `comment-audio.${extension}`
        );
      }

      const token = localStorage.getItem('token');

      await axios.post(
        `${apiUrl}/api/publications/${publicationId}/comment`,
        formData,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        }
      );

      setCommentContent('');
      setCommentMedia(null);
      setAudioBlob(null);

      // Un échec d’actualisation ne doit pas relancer l’envoi.
      try {
        const { data } = await axios.get(
          `${apiUrl}/api/publications/${publicationId}/comments`
        );

        if (!Array.isArray(data)) {
          throw new Error('Réponse inattendue');
        }

        onUpdated(data);
      } catch {
        setCommentError(
          'Commentaire envoyé. Actualise la page pour mettre à jour la liste.'
        );
      }
    } catch (error) {
      setCommentError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Envoi impossible. Ton commentaire est conservé, tu peux réessayer.'
      );
    } finally {
      commentSendLockRef.current = false;
      setCommentSending(false);
    }
  };

  return (
    <section
      className="onvm-comments"
      aria-label="Commentaires"
    >
      <header className="onvm-comments__header">
        <div>
          <h3>La conversation</h3>

          <span>
            {publication.comments?.length || 0} commentaire(s)
          </span>
        </div>

        <button
          type="button"
          disabled={
            commentSending || isRecording || commentAudioBusy
          }
          onClick={closeComments}
          aria-label="Fermer les commentaires"
        >
          <FaTimes />
        </button>
      </header>

      <div className="onvm-comments__list">
        {!publication.comments?.length && (
          <p className="onvm-comments__empty">
            Un avis, une réaction ? Lance la conversation.
          </p>
        )}

        {(publication.comments || []).map((comment) => (
          <article
            className="onvm-comments__item"
            key={comment.id}
          >
            <button
              type="button"
              className="onvm-comments__avatar"
              aria-label={`Profil de ${
                comment.username || 'ce membre'
              }`}
              disabled={!comment.userId && !comment.user_id}
              onClick={() =>
                navigate(
                  `/profile/${comment.userId || comment.user_id}`
                )
              }
            >
              <span>
                {(comment.username || 'O')
                  .slice(0, 1)
                  .toUpperCase()}
              </span>

              {comment.profilePicture && (
                <img
                  src={commentMediaUrl(comment.profilePicture)}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.visibility =
                      'hidden';
                  }}
                />
              )}
            </button>

            <div className="onvm-comments__body">
              <div className="onvm-comments__meta">
                <strong>
                  {comment.username || 'Membre ONVM'}
                </strong>

                {comment.created_at && (
                  <time dateTime={comment.created_at}>
                    {new Date(
                      comment.created_at
                    ).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </time>
                )}
              </div>

              {comment.comment && <p>{comment.comment}</p>}

              {comment.media && (
                <CommentAttachment
                  src={commentMediaUrl(comment.media)}
                  kind={commentMediaKind(comment.media)}
                />
              )}

              {comment.audio &&
                comment.audio !== comment.media && (
                  <audio
                    src={commentMediaUrl(comment.audio)}
                    controls
                    preload="metadata"
                  />
                )}
            </div>
          </article>
        ))}
      </div>

      <form
        className="onvm-comments__composer"
        onSubmit={(event) => {
          event.preventDefault();
          handleComment(publication.id);
        }}
      >
        <label
          className="onvm-comments__sr"
          htmlFor={`comment-text-${publication.id}`}
        >
          Ton commentaire
        </label>

        <textarea
          id={`comment-text-${publication.id}`}
          rows={2}
          maxLength={5000}
          value={commentContent}
          disabled={commentSending}
          onChange={(event) =>
            setCommentContent(event.target.value)
          }
          placeholder="Ajoute ta voix à la conversation…"
        />

        {(audioBlob || commentMedia) && commentPreview && (
          <div className="onvm-comments__preview">
            {audioBlob ? (
              <audio src={commentPreview} controls />
            ) : commentMedia.type.startsWith('video/') ? (
              <video
                src={commentPreview}
                controls
                playsInline
              />
            ) : (
              <img
                src={commentPreview}
                alt="Pièce jointe sélectionnée"
              />
            )}

            <button
              type="button"
              disabled={commentSending}
              aria-label="Retirer la pièce jointe"
              onClick={() => {
                setAudioBlob(null);
                setCommentMedia(null);
              }}
            >
              <FaTimes />
            </button>
          </div>
        )}

        {(isRecording || commentAudioBusy) && (
          <div
            className="onvm-comments__recording"
            role="status"
          >
            <span className="onvm-comments__record-dot" />

            {isRecording
              ? `Enregistrement · ${recordingSeconds}s`
              : 'Préparation de l’audio…'}
          </div>
        )}

        {commentError && (
          <p
            className="onvm-comments__error"
            role="alert"
          >
            {commentError}
          </p>
        )}

        <div className="onvm-comments__tools">
          <label className="onvm-comments__file">
            <input
              type="file"
              accept="image/*"
              disabled={
                commentSending ||
                isRecording ||
                commentAudioBusy
              }
              onChange={selectCommentMedia}
            />

            <span>
              <FaImage /> Image
            </span>
          </label>

          <label className="onvm-comments__file">
            <input
              type="file"
              accept="video/*"
              disabled={
                commentSending ||
                isRecording ||
                commentAudioBusy
              }
              onChange={selectCommentMedia}
            />

            <span>
              <FaVideo /> Vidéo
            </span>
          </label>

          <button
            type="button"
            className={isRecording ? 'is-recording' : ''}
            disabled={commentSending || commentAudioBusy}
            onClick={
              isRecording ? stopRecording : startRecording
            }
            aria-label={
              isRecording
                ? 'Arrêter l’enregistrement'
                : 'Enregistrer un vocal'
            }
          >
            <FaMicrophone />
            <span>{isRecording ? 'Arrêter' : 'Vocal'}</span>
          </button>

          <button
            type="submit"
            className="onvm-comments__send"
            disabled={
              commentSending ||
              isRecording ||
              commentAudioBusy ||
              (!commentContent.trim() &&
                !commentMedia &&
                !audioBlob)
            }
          >
            <FiSend />
            <span>
              {commentSending ? 'Envoi…' : 'Envoyer'}
            </span>
          </button>
        </div>
      </form>
    </section>
  );
}