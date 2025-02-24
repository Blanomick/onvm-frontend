import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Publication.css';
import MainNavigation from './MainNavigation';
import {
  FaRetweet,
  FaComment,
  FaShare,
  FaHome,
  FaPlus,
  FaMicrophone,
  FaImage,
  FaVideo,
  FaTimes,
  FaCopy,
  FaHeart,
  FaUser,
  FaBell,
  FaSearch,
  FaBars,
  FaUsers,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';



const apiUrl = process.env.REACT_APP_API_URL;

console.log("API URL utilisée :", apiUrl);


const Publication = ({ user }) => {
  const [publications, setPublications] = useState([]);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [retweets, setRetweets] = useState({});
  const [likes, setLikes] = useState({});

  const [isCreating, setIsCreating] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  


  

  const navigate = useNavigate();
  const mediaRecorderRef = useRef(null);
  const lastScrollTop = useRef(0);

  const toggleMenu = () => setShowMenu(!showMenu);

  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      alert("L'enregistrement audio n'est pas pris en charge sur ce navigateur.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        setAudioBlob(blob);
      };
      setIsRecording(true);
      mediaRecorderRef.current.start();
      setTimeout(() => stopRecording(), 5000);
    } catch (error) {
      console.error('[ERREUR] Impossible de démarrer l’enregistrement audio:', error);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };




  const fetchPublications = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/publications`);
      const publicationsWithDetails = await Promise.all(
        response.data.map(async (publication) => {
          const commentsResponse = await axios.get(`${apiUrl}/api/publications/${publication.id}/comments`);
          return { ...publication, comments: commentsResponse.data };
        })
      );
      setPublications(publicationsWithDetails);
      const initialRetweets = publicationsWithDetails.reduce((acc, pub) => {
        acc[pub.id] = pub.retweetsCount || 0;
        return acc;
      }, {});
      setRetweets(initialRetweets);
    } catch (err) {
      console.error('[ERREUR] Erreur lors de la récupération des publications:', err);
    }
  };

  const fetchUsersList = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/users`);
      setUsersList(response.data);
    } catch (err) {
      console.error('[ERREUR] Erreur lors de la récupération des utilisateurs:', err);
    }
  };

  const handlePublication = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Erreur : vous devez être connecté pour publier.");
      return;
    }

    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('content', content);
    if (media) formData.append('media', media);

    try {
      await axios.post(`${apiUrl}/api/publications`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setContent('');
      setMedia(null);
      setIsCreating(false);
      fetchPublications();
    } catch (err) {
      console.error('[ERREUR] Erreur lors de la publication:', err);
    }
  };

  const handleComment = async (publicationId) => {
    console.log("Publication ID utilisé pour le commentaire :", publicationId); // Ajout du log
    const formData = new FormData();

    if (!commentContent && !audioBlob && !media) {
      alert("Veuillez ajouter du texte, une image, une vidéo ou un fichier audio.");
      return;
    }

    formData.append('userId', user.id);
    if (commentContent) formData.append('comment', commentContent);
    if (audioBlob) formData.append('audio', audioBlob, 'comment_audio.ogg');
    if (media) formData.append('media', media);

    try {
      await axios.post(`${apiUrl}/api/publications/${publicationId}/comment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCommentContent('');
      setAudioBlob(null);
      setMedia(null);
      fetchPublications();
    } catch (err) {
      console.error("[ERREUR] Erreur lors de l'ajout du commentaire:", err);
    }
  };

  const handleDeletePublication = async (publicationId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) {
      try {
        await axios.delete(`${apiUrl}/api/publications/${publicationId}`);
        setPublications((prev) => prev.filter((pub) => pub.id !== publicationId));
      } catch (err) {
        console.error('[ERREUR] Erreur lors de la suppression de la publication:', err);
      }
    }
  };

  const handleLike = async (publicationId) => {
    try {
      await axios.post(`${apiUrl}/api/publications/${publicationId}/like`, {
        userId: user.id,
      });
      await fetchPublications(); // Ajoutez cette ligne juste après le post
      setLikes((prevLikes) => ({
        ...prevLikes,
        [publicationId]: (prevLikes[publicationId] || 0) + 1,
      }));
    } catch (err) {
      console.error('[ERREUR] Erreur lors du like:', err);
    }
  };
  
  const handleRetweet = async (publicationId) => {
    if (!user || !user.id) {
      alert("Vous devez être connecté pour retweeter.");
      return;
    }
  
    console.log('Données envoyées pour retweet :', { publicationId, userId: user.id });
  
    try {
      const response = await axios.post(`${apiUrl}/api/publications/${publicationId}/retweet`, { userId: user.id });
      console.log('[SUCCÈS] Réponse du backend :', response.data);
  
      // Met à jour le compteur de retweets localement
      setPublications((prevPublications) =>
        prevPublications.map((pub) =>
          pub.id === publicationId
            ? { ...pub, retweetsCount: (pub.retweetsCount || 0) + 1 }
            : pub
        )
      );
    } catch (err) {
      console.error('[ERREUR] Erreur lors du retweet:', err);
      if (err.response) {
        console.error('[ERREUR] Réponse du backend :', err.response.data);
      }
    }
  };
  
      
  

  const copyLink = (publicationId) => {
    const link = `${window.location.origin}/publication/${publicationId}`;
    navigator.clipboard.writeText(link);
    alert('Lien copié dans le presse-papiers.');
  };
// Gestion des publications et des utilisateurs au chargement du composant
useEffect(() => {
  const fetchInitialData = async () => {
    try {
      await fetchPublications();
      await fetchUsersList();
    } catch (err) {
      console.error('[ERREUR] Erreur lors du chargement des données initiales :', err);
    }
  };

  fetchInitialData();
}, []);

// Gestion du partage d'une publication
const handleSharePublication = (publicationId) => {
  setShareModal(publicationId);
  fetchUsersList()
    .then(() => {
      console.log('[INFO] Liste des utilisateurs récupérée pour le partage.');
    })
    .catch((err) => {
      console.error('[ERREUR] Erreur lors de la récupération de la liste des utilisateurs pour le partage :', err);
    });
};

// Gestion de la barre de navigation en bas (disparition lors du scroll vers le bas)
useEffect(() => {
  const handleScroll = () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    if (currentScroll > lastScrollTop.current) {
      setShowBottomNav(false); // Cache le BottomNav lors du défilement vers le bas
    } else {
      setShowBottomNav(true); // Affiche le BottomNav lors du défilement vers le haut
    }

    lastScrollTop.current = currentScroll <= 0 ? 0 : currentScroll; // Mise à jour du dernier positionnement du scroll
  };

  // Ajout d'un écouteur d'événement pour surveiller le défilement
  window.addEventListener('scroll', handleScroll);

  // Nettoyage de l'écouteur lors du démontage du composant
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, []);

// Fonction de nettoyage de la modale de partage
const closeShareModal = () => {
  setShareModal(null);
  console.log('[INFO] Modale de partage fermée.');
};

  
useEffect(() => {
  console.log("🔹 Retweets chargés :", retweets);
  console.log("🔹 Likes chargés :", likes);
}, [retweets, likes]);


  
  
  return (
    <div className="publication-page">
      {/* En-tête de la page */}
      <div className="header">
        <FaBars className="menu-icon" onClick={toggleMenu} />
        <div className="logo">O</div>
        <div className="header-icons">
          <FaHome onClick={() => navigate('/')} title="Accueil" />
          <FaUsers onClick={() => navigate('/create-community')} title="Créer une communauté" />
        </div>
      </div>
      {/* Menu coulissant */}
      {showMenu && <MainNavigation onClose={toggleMenu} />}
  
      {/* Formulaire de création de publication */}
      {isCreating && (
        <form onSubmit={handlePublication} className="publication-form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Exprimez-vous..."
          ></textarea>
          <input
            type="file"
            onChange={(e) => setMedia(e.target.files[0])}
            accept="image/*,video/*"
          />
          <button type="submit">Publier</button>
        </form>
      )}
  
      {/* Liste des publications */}
      <div className="publications-list">
        {publications.length > 0 ? (
          publications.map((publication) => (
            <div key={publication.id} className="publication">
{/* En-tête de la publication */}
<div className="publication-header">
  {/* Vérification et affichage de la photo de profil */}
  <img
    src={
      publication.profilePicture
        ? `${apiUrl}${publication.profilePicture}`
        : '/default-profile.png' // Chemin par défaut si aucune photo de profil
    }
    alt={`${publication.username || 'Utilisateur'} - Profil`}
    className="profile-picture"
  />

  {/* Informations sur la publication */}
  <div className="publication-info">
    <h3
      onClick={() =>
        publication.userId && navigate(`/profile/${publication.userId}`)
      }
      className="clickable-username"
      title={`Voir le profil de ${publication.username || 'Utilisateur inconnu'}`}
    >
      {publication.username || 'Utilisateur inconnu'} {/* Nom d'utilisateur */}
    </h3>
    <span>
      {publication.created_at
        ? new Date(publication.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'Date inconnue'} {/* Date de création */}
    </span>
  </div>

  {/* Icône de suppression (uniquement visible pour le propriétaire de la publication) */}
  {user?.id === publication.userId && (
    <FaTimes
      className="delete-icon"
      onClick={() => handleDeletePublication(publication.id)}
      title="Supprimer cette publication"
    />
  )}
</div>

  
              {/* Contenu de la publication */}
              <p>{publication.content}</p>
  
              {/* Médias associés à la publication */}
              {publication.media && (
                <div className="media">
                  {publication.media.endsWith('.mp4') ? (
                    <video src={`${apiUrl}${publication.media}`} controls />
                  ) : (
                    <img src={`${apiUrl}${publication.media}`} alt="Publication media" />
                  )}
                </div>
              )}
  
              {/* Actions (Retweet, Commentaire, Partage) */}
              <div className="publication-footer">
  <button onClick={() => handleRetweet(publication.id)}>
    <FaRetweet /> {publication.retweetsCount || 0} Retweets
  </button>    
         
                <button onClick={() => handleLike(publication.id)}>
  <FaHeart /> {publication.likes || 0} J'aime
</button>

               


                <button onClick={() => setSelectedPublication(publication.id)}>
                  <FaComment /> {publication.comments.length} Commentaires
                </button>

               <button onClick={() => handleSharePublication(publication.id)}>
  <FaShare /> Partager
</button>

              

              </div>
  
              {/* Section des commentaires */}
              {selectedPublication === publication.id && (
                <div className="comments-section">
                  {publication.comments.map((comment) => (
                    <div key={comment.id} className="comment">
                      <div className="comment-header">
                        <img
                          src={
                            comment.profilePicture
                              ? `${apiUrl}${comment.profilePicture}`
                              : '/default-profile.png'
                          }
                          alt="Profil"
                          className="comment-profile-picture"
                        />
                        <span className="comment-username">{comment.username}</span>
                      </div>
                      <p>{comment.comment}</p>
                      {comment.media && (
                        <div className="comment-media">
                          {comment.media.endsWith('.mp4') ? (
                            <video src={`${apiUrl}${comment.media}`} controls />
                          ) : comment.media.endsWith('.ogg') ||
                            comment.media.endsWith('.mp3') ? (
                            <audio src={`${apiUrl}${comment.media}`} controls />
                          ) : (
                            <img src={`${apiUrl}${comment.media}`} alt="Comment media" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

<div className="add-comment">
  {/* Zone de texte pour le commentaire */}
  <textarea
    value={commentContent}
    onChange={(e) => setCommentContent(e.target.value)}
    placeholder="Écrire un commentaire..."
    className="comment-textarea"
  ></textarea>

  {/* Section pour ajouter des médias (image/vidéo/audio) */}
  <div className="comment-media-section">
    <label htmlFor={`comment-image-${publication.id}`} className="media-icon">
      <FaImage title="Ajouter une image" />
    </label>
    <input
      id={`comment-image-${publication.id}`}
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={(e) => setMedia(e.target.files[0])}
    />

    <label htmlFor={`comment-video-${publication.id}`} className="media-icon">
      <FaVideo title="Ajouter une vidéo" />
    </label>
    <input
      id={`comment-video-${publication.id}`}
      type="file"
      accept="video/*"
      style={{ display: 'none' }}
      onChange={(e) => setMedia(e.target.files[0])}
    />

    <button
      onClick={startRecording}
      disabled={isRecording}
      className={`microphone-icon ${isRecording ? 'recording' : ''}`}
      title="Enregistrer un audio"
    >
      <FaMicrophone />
    </button>
  </div>

  {/* Bouton pour envoyer le commentaire */}
  <button
    onClick={() => handleComment(publication.id)}
    className="send-comment-button"
  >
    Envoyer
  </button>
</div>

                  
                </div>
              )}
            </div>
          ))
        ) : (
          <p>Aucune publication disponible.</p>
        )}
{shareModal && (
  <div className="share-modal">
    <h4>Partager la publication</h4>
    <ul>
      {usersList.map((user) => (
        <li key={user.id}>
          {user.username}
          <button onClick={() => alert(`Partagé avec ${user.username}`)}>Partager</button>
        </li>
      ))}
    </ul>
    {/* Bouton pour copier le lien */}
    <button onClick={() => copyLink(shareModal)}>
      <FaCopy /> Copier le lien
    </button>
    <button onClick={closeShareModal}>Fermer</button>
  </div>
)}



      </div>
  
      {/* Barre de navigation en bas de la page */}
      <div className={`bottom-nav ${showBottomNav ? 'visible' : 'hidden'}`}>
        <FaHome onClick={() => navigate('/')} title="Accueil" />
        <FaSearch onClick={() => navigate('/search')} title="Recherche" />
        <FaPlus onClick={() => setIsCreating(!isCreating)} title="Créer une publication" />
        <FaBell onClick={() => navigate('/notifications')} title="Notifications" />
        <FaUser onClick={() => navigate(`/profile/${user?.id}`)} title="Mon profil" />
      </div>
    </div>
  );
};
export default Publication;