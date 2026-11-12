  import React, { useState, useEffect, useRef , useCallback} from 'react';
import axios from 'axios';
import './Publication.css';
import MainNavigation from './MainNavigation';
import AdMultiplex from '../components/AdMultiplex';
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from './BottomNav';
import CommentsSection from './CommentsSection';
import PostMediaCarousel from "./PostMediaCarousel";
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
  

  FaUsers,
} from 'react-icons/fa';


import {
  FiHeart,
  FiMessageCircle,
  FiRepeat,
  FiSend,
} from "react-icons/fi";


const apiUrl = process.env.REACT_APP_API_URL;

// --- Lightbox minimaliste (plein écran) ---
function useLightbox(){
  const [isOpen, setOpen] = useState(false);
  const [items, setItems] = useState([]); // [{url, type}]
  const [index, setIndex] = useState(0);

  const open = useCallback((list, startIndex=0)=>{
    setItems(list);
    setIndex(startIndex);
    setOpen(true);
    document.body.style.overflow = "hidden";
  },[]);

  const close = useCallback(()=>{
    setOpen(false);
    document.body.style.overflow = "";
  },[]);

  const next = useCallback(()=> setIndex(i => (i + 1) % items.length), [items.length]);
  const prev = useCallback(()=> setIndex(i => (i - 1 + items.length) % items.length), [items.length]);

  useEffect(()=>{
    if(!isOpen) return;
    const onKey = (e)=>{
      if(e.key === "Escape") close();
      if(e.key === "ArrowRight") next();
      if(e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  }, [isOpen, next, prev, close]);

  const Lightbox = () => !isOpen ? null : (
    <div className="media-lightbox" onClick={close}>
      <button className="close" aria-label="Fermer" onClick={close}>✕</button>
      {items.length > 1 && <button className="nav left" onClick={(e)=>{e.stopPropagation(); prev();}}>‹</button>}
      {items.length > 1 && <button className="nav right" onClick={(e)=>{e.stopPropagation(); next();}}>›</button>}
      <div className="content" onClick={(e)=> e.stopPropagation()}>
        {items[index]?.type?.startsWith("image")
          ? <img src={items[index].url} alt="" />
          : <video src={items[index].url} controls autoPlay playsInline />}
      </div>
    </div>
  );

  return { open, close, next, prev, Lightbox };
}



function PublicationText({ text }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const value = String(text);
  const canExpand = value.length > 280 || value.split("\n").length > 5;

  return (
    <div className="onvm-post-copy">
      <p
        className={`publication-text ${
          canExpand && !expanded ? "onvm-text-collapsed" : ""
        }`}
      >
        {value}
      </p>

      {canExpand && (
        <button
          type="button"
          className="onvm-read-more"
          aria-expanded={expanded}
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? "Réduire" : "Lire la suite"}
        </button>
      )}
    </div>
  );
}

const Publication = ({ user }) => {
  const [publications, setPublications] = useState([]);
  const [viewMode, setViewMode] = useState('feed');
const [shortIndex, setShortIndex] = useState(0);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [retweets, setRetweets] = useState({}); 
const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [usersList, setUsersList] = useState([]);
  
  const [selectedPublication, setSelectedPublication] = useState(null);

  const [showBottomNav, setShowBottomNav] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

 
  const navigate = useNavigate();


const location = useLocation();

const targetPostId = new URLSearchParams(location.search).get("post");

useEffect(() => {
  if (!targetPostId || !publications.length) return;

  const frame = window.requestAnimationFrame(() => {
    document
      .getElementById(`publication-${targetPostId}`)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  });

  return () => window.cancelAnimationFrame(frame);
}, [targetPostId, publications]);

  const { open, Lightbox } = useLightbox();

  const mediaRecorderRef = useRef(null);
  const lastScrollTop = useRef(0);

  const toggleMenu = () => setShowMenu(!showMenu);

 

const fetchPublications = useCallback(async () => {
  try {
    const response = await axios.get(`${apiUrl}/api/publications`, {
      params: { userId: user?.id }
    });

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
}, [user?.id]);


  const fetchUsersList = useCallback(async () => {
  try {
    const response = await axios.get(`${apiUrl}/api/users`);
    setUsersList(response.data);
  } catch (err) {
    console.error('[ERREUR] Erreur lors de la récupération des utilisateurs:', err);
  }
}, []);

// Détermine le type à partir de l'URL/extension
// Récupère un tableau de médias homogène [{url, kind, type}]
const normalizeMedia = (value) => {
  if (!value) return [];

  let parsed = value;

  if (
  typeof value === 'string' &&
  (value.trim().startsWith('[') || value.trim().startsWith('{'))
) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  const entries = Array.isArray(parsed) ? parsed : [parsed];

  return entries
    .map((entry) => {
      const originalUrl =
        typeof entry === 'string' ? entry : entry?.url;

      if (!originalUrl) return null;

      const url = originalUrl.startsWith('/uploads/')
        ? `${apiUrl}${originalUrl}`
        : originalUrl;

      const pathname = url.split(/[?#]/)[0].toLowerCase();
      const declaredType =
        typeof entry === 'object' ? entry.kind || entry.type : '';

      let kind = 'image';

      if (declaredType?.startsWith('audio')) {
        kind = 'audio';
      } else if (declaredType?.startsWith('video')) {
        kind = 'video';
      } else if (declaredType?.startsWith('image')) {
        kind = 'image';
      } else if (/\.(mp4|webm|mov|m4v|ogv|avi)$/.test(pathname)) {
        kind = 'video';
      } else if (/\.(mp3|wav|aac|m4a|ogg|oga|opus)$/.test(pathname)) {
        kind = 'audio';
      }

      return { url, kind, type: kind };
    })
    .filter(Boolean);
};

const videoPublications = publications.filter((publication) =>
  normalizeMedia(publication.media).some((item) => item.kind === 'video')
);

const currentShortIndex = Math.min(
  shortIndex,
  Math.max(videoPublications.length - 1, 0)
);

const displayedPublications =
  viewMode === 'shorts'
    ? videoPublications.slice(currentShortIndex, currentShortIndex + 1)
    : publications;





  const handlePublication = async (e) => {
    e.preventDefault();
  
    if (!user?.id) {
      alert("Erreur : utilisateur non connecté.");
      return;
    }
  
    if (!content && !media) {
      alert("Erreur : veuillez écrire quelque chose ou ajouter un fichier.");
      return;
    }
  
    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('content', content);
  
    if (media) {
      formData.append('media', media);
    }
  
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
      if (err.response && err.response.data && err.response.data.message) {
        alert(`Erreur de publication : ${err.response.data.message}`);
      } else {
        alert("Une erreur est survenue pendant la publication. Veuillez réessayer.");
      }
    }
  };
  







const handleDeletePublication = async (publicationId) => {
  if (window.confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) {
    try {
      await axios.delete(`${apiUrl}/api/publications/${publicationId}`, {
        data: { userId: user.id }, // ✅ Ajout de userId
      });
      setPublications((prev) => prev.filter((pub) => pub.id !== publicationId));
    } catch (err) {
      console.error('[ERREUR] Erreur lors de la suppression de la publication:', err);
    }
  }
};


const handleLike = async (publicationId) => {
  const userId = user?.id;


  console.log('[FRONT] userId envoyé:', userId);
  console.log('[FRONT] publicationId envoyé:', publicationId);

  if (!userId) {
    alert("Impossible de liker : identifiant utilisateur manquant.");
    return;
  }

  try {
    const response = await axios.post(`${apiUrl}/api/publications/${publicationId}/like`, {
      userId: userId
    });

  console.log('[SUCCESS] Like ajouté:', response.data);
fetchPublications(); // ← recharge les données mises à jour

  } catch (err) {
    console.error('[ERREUR] Erreur lors du like:', err);
    alert(err?.response?.data?.message || 'Erreur lors du like.');
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
}, [fetchPublications, fetchUsersList]); // ← ou [] si elles sont déclarées dans ce même fichier


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

  useEffect(() => {
  let timeout;

  const handleScroll = () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    // Défilement vers le bas -> cache avec un délai
    if (currentScroll > lastScrollTop.current) {
      timeout = setTimeout(() => {
        setShowBottomNav(false);
      }, 150);
    } else {
      // Défilement vers le haut -> montre immédiatement
      setShowBottomNav(true);
      clearTimeout(timeout);
    }

    lastScrollTop.current = currentScroll <= 0 ? 0 : currentScroll;
  };

  window.addEventListener('scroll', handleScroll);

  return () => {
    clearTimeout(timeout);
    window.removeEventListener('scroll', handleScroll);
  };
}, []);


// Fonction de nettoyage de la modale de partage
const closeShareModal = () => {
  setShareModal(null);
  console.log('[INFO] Modale de partage fermée.');
};

  


  
  
  return (
   <div
 className={`publication-page onvm-redesign onvm-refined ${
    viewMode === 'shorts' ? 'onvm-shorts-mode' : ''
  }`}
>
 
  
  
  
  {viewMode === 'shorts' && videoPublications.length > 0 && (
    <div className="onvm-short-controls">
      <button
        disabled={currentShortIndex === 0}
        onClick={() => setShortIndex(currentShortIndex - 1)}
      >
        ← Précédente
      </button>

      <span>
        {currentShortIndex + 1} / {videoPublications.length}
      </span>

      <button
        disabled={currentShortIndex >= videoPublications.length - 1}
        onClick={() => setShortIndex(currentShortIndex + 1)}
      >
        Suivante →
      </button>
    </div>
  )}
     
      {/* Menu coulissant */}
      {showMenu && <MainNavigation onClose={toggleMenu} />}
  
      {/* Formulaire de création de publication */}
     
      {/* Liste des publications */}
      <div className="publications-list">
      {displayedPublications.length > 0 ? (
  displayedPublications.map((publication, i) => (
   <div
  key={`${viewMode}-${publication.id}`}
  id={`publication-${publication.id}`}
  className={`publication ${
    viewMode === 'shorts' ? 'publication--short' : ''
  }`}
>
  
{/* En-tête de la publication */}
<div className="publication-header">
  {/* Vérification et affichage de la photo de profil */}
 <img
  src={publication.profilePicture || '/default-profile.png'}
  alt="Profil"
  className="publication-profile-picture"
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
           <PublicationText text={publication.content} />

  
 {/* Médias associés à la publication — supporte 1 ou plusieurs éléments + SWIPE */}
{/* Médias associés à la publication — carrousel + lightbox */}
   
   {(() => {
  const mediaItems = normalizeMedia(publication.media).filter(
    (item) => viewMode !== "shorts" || item.kind === "video"
  );

  if (!mediaItems.length) return null;

  function openPhoto(index) {
    const visualItems = mediaItems.filter(
      (item) => item.kind !== "audio"
    );

    const visualIndex = mediaItems
      .slice(0, index)
      .filter((item) => item.kind !== "audio").length;

    open(
      visualItems.map((item) => ({
        url: item.url,
        type: item.kind,
      })),
      visualIndex
    );
  }

  return (
    <div className="onvm-post-media">
      <PostMediaCarousel
        items={mediaItems}
        onOpen={openPhoto}
        autoPlay={viewMode === "shorts"}
      />
    </div>
  );
})()}

<div className="publication-footer">
  <button
    type="button"
    className={`footer-button ${
      publication.userHasLiked ? "liked" : ""
    }`}
    onClick={() => {
      if (!publication.userHasLiked) handleLike(publication.id);
    }}
    aria-label={
      publication.userHasLiked ? "Publication aimée" : "Aimer"
    }
    aria-pressed={Boolean(publication.userHasLiked)}
  >
    <FiHeart />
    <span>{publication.likeCount || 0}</span>
  </button>

  <button
    type="button"
    className="footer-button"
    onClick={() =>
      setSelectedPublication(
        selectedPublication === publication.id ? null : publication.id
      )
    }
    aria-label="Afficher les commentaires"
    aria-expanded={selectedPublication === publication.id}
  >
    <FiMessageCircle />
    <span>{publication.comments?.length ?? 0}</span>
  </button>

  <button
    type="button"
    className="footer-button"
    onClick={() => handleRetweet(publication.id)}
    aria-label="Repartager"
  >
    <FiRepeat />
    <span>
      {publication.retweetsCount ?? retweets[publication.id] ?? 0}
    </span>
  </button>

  <button
    type="button"
    className="footer-button"
    onClick={() => handleSharePublication(publication.id)}
    aria-label="Partager la publication"
  >
    <FiSend />
  </button>
</div>
  
              {/* Section des commentaires */}
              {/* Section des commentaires */}
{selectedPublication === publication.id && (
  <CommentsSection
    key={publication.id}
    publication={publication}
    user={user}
    onClose={() => setSelectedPublication(null)}
    onUpdated={(comments) => {
      setPublications((previous) =>
        previous.map((post) =>
          post.id === publication.id
            ? { ...post, comments }
            : post
        )
      );
    }}
  />
)}




            </div>
          ))
        ) : (
          <div className="onvm-empty">
  <h2>
    {viewMode === 'shorts'
      ? 'Les vidéos arrivent ici.'
      : 'La conversation commence avec toi.'}
  </h2>
  <p>
    {viewMode === 'shorts'
      ? 'Publie une vidéo pour la retrouver dans ONVM Shorts.'
      : 'Partage une idée, une photo ou un moment.'}
  </p>
  
</div>
        )}
{shareModal && (
  <div className="share-modal">
    <h4>Partager la publication</h4>
    <ul>

{usersList.map((u) => (
  <li key={u.id}>
    {u.username}
    <button onClick={() => alert(`Partagé avec ${u.username}`)}>Partager</button>
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
  
     

      {/* Icône FaUsers utilisée juste pour éviter le warning ESLint */}
<div style={{ display: 'none' }}>
  <FaUsers />
</div>



<BottomNav />
<Lightbox />

    </div>
  );
};


export default Publication;