import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Profile.css';
import { FaVideo, FaComment, FaShare, FaRetweet, FaWallet } from 'react-icons/fa'; // Ajout de l'icône de portefeuille
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import BottomNav from './BottomNav';
import { FaHome, FaSearch, FaPlus, FaBell, FaUser  , FaUsers} from 'react-icons/fa';


const apiUrl = process.env.REACT_APP_API_URL;




const Profile = ({ currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [bio, setBio] = useState('Bienvenue sur mon profil!');
  const [followerCount, setFollowerCount] = useState(0);
  const [posts, setPosts] = useState([]);
  const [retweets, setRetweets] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [newProfileImage, setNewProfileImage] = useState(null);
  const [cropper, setCropper] = useState(null);
  const [comments, setComments] = useState({});
  const [activeComments, setActiveComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [extraData, setExtraData] = useState(null); // Ajoutez cet état pour stocker les données supplémentaires
  const [response, setResponse] = useState(null);
  const [activeTab, setActiveTab] = useState('publications'); // Onglet actif : 'publications' ou 'retweets'
  const [showBottomNav, setShowBottomNav] = useState(true); // Par défaut, la barre est visible
  const [lastScrollY, setLastScrollY] = useState(0);
  const [likes, setLikes] = useState({});
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const fileInputRef = React.useRef(null);
  const [animateFollower, setAnimateFollower] = useState(false);




  // Portefeuille - Handle withdrawal action
  const handleWithdraw = () => {
    if (balance === 0) {
      alert("Votre portefeuille est vide.");
    } else {
      alert("Fonction de retrait indisponible pour l'instant.");
    }
  };

  const fetchProfileData = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/users/${id}`);
      if (!res.ok) throw new Error('Erreur lors de la récupération des données utilisateur.');
      const data = await res.json();

      setProfileUser(data);
      setBio(data.bio || 'Bienvenue sur mon profil!');
      setIsOwner(currentUser && currentUser.id === parseInt(id)); // Utilisation de setIsOwner
      setResponse(data); // Met à jour response avec les données reçues

      const [followerResponse, postsResponse, retweetsResponse, isFollowingResponse] = await Promise.all([
        fetch(`${apiUrl}/api/users/${id}/followers`),
        fetch(`${apiUrl}/api/users/${id}/publications`),
        fetch(`${apiUrl}/api/users/${id}/retweets`),
        fetch(`${apiUrl}/api/users/${id}/is-following?followerId=${currentUser ? currentUser.id : null}`)
      ]);

      const [followerData, postsData, retweetsData, isFollowingData] = await Promise.all([
        followerResponse.json(),
        postsResponse.json(),
        retweetsResponse.json(),
        isFollowingResponse.json()
      ]);

     
      const newCount = followerData.totalFollowers || 0;
      if (newCount !== followerCount) {
        setAnimateFollower(true);
        setTimeout(() => setAnimateFollower(false), 500);
      }
      setFollowerCount(newCount);
      
      setPosts(postsData);
      setRetweets(retweetsData);
      setIsFollowing(isFollowingData.isFollowing);
      

      setFollowerCount(followerData.totalFollowers || 0);
setPosts(postsData);
setRetweets(retweetsData);
setIsFollowing(isFollowingData.isFollowing);

// ✅ Ajoute ce bloc ici :
const likesMap = {};
[...postsData, ...retweetsData].forEach(post => {
  likesMap[post.id] = post.likes || 0;
});
setLikes(likesMap);

    } catch (error) {
      console.error('[ERREUR] Erreur lors de la récupération du profil:', error);
    }
  }, [currentUser, id, followerCount]); // Dépendances pour stabiliser la fonction


  // Fonction `fetchWalletData` enveloppée avec `useCallback`
  const fetchWalletData = useCallback(async () => {
    try {
      const responseBalance = await fetch(`${apiUrl}/api/wallet/${currentUser.id}/balance`);

      if (!responseBalance.ok) {
        throw new Error(`Erreur ${responseBalance.status} lors de la récupération du solde`);
      }

      const balanceData = await responseBalance.json();
      setBalance(balanceData.balance || 0);
      console.log(`[INFO] Solde récupéré: ${balanceData.balance || 0}`);

      const responseTransactions = await fetch(`${apiUrl}/api/wallet/${currentUser.id}/history`);

      if (!responseTransactions.ok) {
        throw new Error(`Erreur ${responseTransactions.status} lors de la récupération des transactions`);
      }

      const transactionsData = await responseTransactions.json();
      setTransactions(transactionsData.transactions || []);
      console.log(`[INFO] Historique des transactions récupéré:`, transactionsData.transactions || []);

    } catch (error) {
      console.error('[ERREUR] Erreur lors de la récupération des données de portefeuille :', error);
    }
  }, [currentUser.id,]);



  // Handle file change for profile picture
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setNewProfileImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Save the cropped profile image
  const handleProfileImageSave = async () => {
    if (!newProfileImage || !cropper) return;

    cropper.getCroppedCanvas().toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('profilePicture', blob, 'profile-picture.png');

      try {
        const response = await fetch(`${apiUrl}/api/users/${id}/profile-picture`, {
          method: 'PUT',
          body: formData,
        });

        if (response.ok) {
          alert('Photo de profil mise à jour avec succès!');
          setNewProfileImage(null); // Reset the profile image after saving
          setCropper(null); // Reset the cropper instance
          fetchProfileData(); // Refresh profile data
        } else {
          alert('Erreur lors de la mise à jour de la photo de profil.');
        }
      } catch (error) {
        console.error('[ERREUR] Erreur lors de la mise à jour de la photo de profil:', error);
      }
    });
  };

  

  // Fonction pour gérer les retweets
  const handleRetweet = async (postId) => {
    try {
      // Remplace l'URL par celle de ton API pour le retweet
      const response = await fetch(`${apiUrl}/api/publications/${postId}/retweet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (response.ok) {
        alert("Publication retweetée avec succès !");
        fetchProfileData(); // Actualise les données de profil
      } else {
        alert("Erreur lors du retweet de la publication.");
      }
    } catch (error) {
      console.error('[ERREUR] Erreur lors du retweet :', error);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await fetch(`${apiUrl}/api/publications/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
  
      if (response.ok) {
        const updatedLikes = await response.json();
        setLikes((prev) => ({ ...prev, [postId]: updatedLikes.count }));
      } else {
        alert("Erreur lors du like.");
      }
    } catch (error) {
      console.error('[ERREUR] Erreur lors du like :', error);
    }
  };
  
          

  const handleDeletePost = async (postId) => {
    try {
      const response = await fetch(`${apiUrl}/api/publications/${postId}`, {
        method: 'DELETE',
      });
  
      if (response.ok) {
        alert('Publication supprimée avec succès!');
        setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
      } else {
        alert("Erreur lors de la suppression de la publication.");
      }
    } catch (error) {
      console.error('[ERREUR] Erreur lors de la suppression de la publication :', error);
    }
  };
  

  const handleDeleteRetweet = async (publicationId) => {
    try {
      const response = await fetch(
        `${apiUrl}/api/retweets/${publicationId}/${currentUser.id}`,
        {
          method: 'DELETE',
        }
      );
  
      if (response.ok) {
        alert('Retweet supprimé avec succès!');
        setRetweets((prevRetweets) =>
          prevRetweets.filter((retweet) => retweet.id !== publicationId)
        );
      } else {
        alert("Erreur lors de la suppression du retweet.");
      }
    } catch (error) {
      console.error('[ERREUR] Erreur lors de la suppression du retweet :', error);
    }
  };
  

  // Handle follow/unfollow action

  const handleFollow = async () => {
    try {
      const url = isFollowing ? '/unfollow' : '/follow';
      const response = await fetch(`${apiUrl}/api/users${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: currentUser.id, followingId: profileUser.id })
      });
  
      if (response.ok) {
        // 🔁 Recharge immédiatement le nombre de followers depuis le serveur
        const followersRes = await fetch(`${apiUrl}/api/users/${profileUser.id}/followers`);
        const followersData = await followersRes.json();
        setFollowerCount(followersData.totalFollowers || 0); // ✅ mise à jour réelle
  
        setIsFollowing(!isFollowing);
      } else {
        const err = await response.json();
        console.error("[ERREUR] Suivi échoué :", err.message);
      }
    } catch (error) {
      console.error('[ERREUR] Erreur lors de l’action de suivi/désabonnement :', error);
    }
  };
  


  // Save biography
  const handleBioSave = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/users/${id}/bio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio })
      });
      if (response.ok) {
        alert('Biographie mise à jour avec succès!');
      } else {
        alert('Erreur lors de la mise à jour de la biographie.');
      }
    } catch (error) {
      console.error('[ERREUR] Erreur lors de l\'enregistrement de la biographie:', error);
    }
  };

  const handleProfilePictureClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };
  
  const handleViewProfilePicture = () => {
    if (profileUser?.profilePicture) {
      window.open(`${apiUrl}${profileUser.profilePicture}`, '_blank');
    } else {
      alert("Aucune photo de profil.");
    }
  };
  
  const handleOpenFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  

  // Handle comments for a post
  const handleComment = async (postId, comment) => {
    if (!comment.trim()) {
      alert("Le commentaire ne peut pas être vide.");
      return;
    }
    try {
      await fetch(`${apiUrl}/api/publications/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, comment })
      });
      fetchProfileData(); // Refresh profile data after adding comment
    } catch (error) {
      console.error('[ERREUR] Erreur lors du commentaire:', error);
    }
  };

  // Share a post
  const handleShare = (postId) => {
    alert(`Publication partagée : ${postId}`);
  };

  // Fetch comments for a post
  const fetchComments = async (postId) => {
    try {
      const response = await fetch(`${apiUrl}/api/publications/${postId}/comments`);
      const data = await response.json();
      setComments((prevComments) => ({
        ...prevComments,
        [postId]: data,
      }));
      setActiveComments((prev) => ({
        ...prev,
        [postId]: !prev[postId],
      }));
    } catch (error) {
      console.error('[ERREUR] Erreur lors de la récupération des commentaires:', error);
    }
  };

  const fetchExtraProfileData = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/users/${id}/extra-data`);
      if (!res.ok) throw new Error("Erreur lors de la récupération des données supplémentaires");

      const data = await res.json();
      setExtraData(data);
      console.log(data);
    } catch (error) {
      console.error("[ERREUR] Erreur lors de la récupération des données supplémentaires:", error);
    }
  }, [id]);


  // Appelez ensuite les fonctions dans `useEffect` pour charger les données supplémentaires
  useEffect(() => {
    if (currentUser) {
      // Récupérer les données de profil de l'utilisateur
      fetchProfileData();

      // Récupérer les données supplémentaires
      fetchExtraProfileData();

      // Récupérer les données du portefeuille
      fetchWalletData();
    }
  }, [currentUser, fetchProfileData, fetchExtraProfileData, fetchWalletData]); // Cela appelle les fonctions quand `currentUser` change

  useEffect(() => {
    if (response) {
      console.log("Réponse utilisateur :", response);
    }
  }, [response]);
  



  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
  
      if (currentScrollY > lastScrollY) {
        setShowBottomNav(false); // L'utilisateur descend => on cache
      } else {
        setShowBottomNav(true); // L'utilisateur monte => on montre
      }
  
      setLastScrollY(currentScrollY);
    };
  
    window.addEventListener('scroll', handleScroll);
  
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
  

  return (
    <div className="profile-container">
      {profileUser ? (
        <>
               <div className="profile-header">
  
               <img
  src={
    profileUser.profilePicture
      ? `${apiUrl}${profileUser.profilePicture}`
      : '/images/default-profile.png'
  }
  alt="Profile"
  className="profile-picture"
  onClick={isOwner ? handleProfilePictureClick : undefined}
/>




            <div className="profile-info">
              <h2>{profileUser?.username || 'Nom indisponible'}</h2>
  
              {isOwner && <button>Modifier le profil</button>}
  
              <p className={`follower-count ${animateFollower ? 'pop' : ''}`}>
  <strong>{followerCount}</strong> {followerCount === 1 ? 'abonné' : 'abonnés'}
</p>

 

{isOwner ? (
  <>
    
    <div className="profile-picture-container" onClick={handleProfilePictureClick}>
  <input
    type="file"
    ref={fileInputRef}
    style={{ display: 'none' }}
    accept="image/*"
    onChange={handleFileChange}
  />
  {showProfileMenu && (
    <div className="profile-picture-menu">
      <button onClick={handleViewProfilePicture}>Voir la photo</button>
      <button onClick={handleOpenFilePicker}>Changer la photo</button>
    </div>
  )}
</div>


    {newProfileImage && (

             
                    <div>
                      <Cropper
                        src={newProfileImage}
                        style={{ height: 200, width: '100%' }}
                        aspectRatio={1}
                        guides={false}
                        viewMode={1}
                        minCropBoxHeight={10}
                        minCropBoxWidth={10}
                        background={false}
                        responsive={true}
                        autoCropArea={1}
                        checkOrientation={false}
                        onInitialized={(instance) => setCropper(instance)}
                      />
                      <button onClick={handleProfileImageSave}>Confirmer la nouvelle photo de profil</button>
                    </div>
                  )}
                </>
              ) : (
                <button onClick={handleFollow}>{isFollowing ? 'Se désabonner' : 'Suivre'}</button>
              )}
            </div>
          </div>



  
          <div className="profile-bio">
            {isOwner ? (
              <>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
                <button onClick={handleBioSave}>Enregistrer la bio</button>
              </>
            ) : (
              <p>{profileUser.bio || 'Cet utilisateur n\'a pas encore de biographie.'}</p>
            )}
          </div>
  
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
  <FaWallet size={60} color="#555" title="Portefeuille" />
</div>

{extraData && (
  <div style={{ display: 'none' }}>
    {JSON.stringify(extraData)}
  </div>
)}

  
          {isOwner && (
            <div className="actions-section">
              <button className="action-button live-button" onClick={() => navigate('/live')}>
                <FaVideo /> Démarrer un Live
              </button>
              <button className="action-button withdraw-button" onClick={handleWithdraw}>
                Retirer
              </button>

              {transactions.length > 0 && (
  <div className="wallet-history">
    <h4>Historique des transactions</h4>
    <ul>
      {transactions.map((tx, index) => (
        <li key={index}>{tx.type} de {tx.amount}€</li>
      ))}
    </ul>
  </div>
)}

            </div>
          )}
  
  
  
          <div className="profile-grid">
            <div className="tabs">
              <button
                className={`tab-button ${activeTab === 'publications' ? 'active' : ''}`}
                onClick={() => setActiveTab('publications')}
              >
                Mes Publications
              </button>
              <button
                className={`tab-button ${activeTab === 'retweets' ? 'active' : ''}`}
                onClick={() => setActiveTab('retweets')}
              >
                Mes Retweets
              </button>
            </div>
  
            {activeTab === 'publications' && (
              <>
                <h3>Mes publications</h3>
                {posts.length > 0 ? (
  posts.map((post) => (
    <div key={post.id} className="profile-post">
      {post.media ? (
        post.media.endsWith('.mp4') ? (
          <video src={`${apiUrl}${post.media}`} controls />
        ) : (
          <img src={`${apiUrl}${post.media}`} alt={post.content} />
        )
      ) : (
        <p>{post.content}</p>
      )}

      <button
        className="delete-button"
        onClick={() => handleDeletePost(post.id)}
        title="Supprimer cette publication"
      >
        ✖
      </button>

      <div className="post-actions">
        <button onClick={() => fetchComments(post.id)}>
          <FaComment /> {comments[post.id]?.length || 0} Commentaires
        </button>
        <button onClick={() => handleShare(post.id)}>
          <FaShare /> Partager
        </button>
        <button onClick={() => handleRetweet(post.id)}>
          <FaRetweet /> Retweeter
        </button>
        <button onClick={() => handleLike(post.id)}>
          ❤️ {likes[post.id] || 0}
        </button>
      </div>

      {activeComments[post.id] && (
        <div className="comments-section">
          {comments[post.id]?.map((comment, index) => (
            <div key={index} className="comment">
              <img
                src={comment.profilePicture ? `${apiUrl}${comment.profilePicture}` : '/default-profile.png'}
                alt="Profil"
                className="profile-picture-comment"
              />
              <strong>{comment.username}</strong>
              <p>{comment.comment}</p>
            </div>
          ))}
          <div className="add-comment-section">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
            />
            <button onClick={() => handleComment(post.id, newComment)}>Envoyer</button>
          </div>
        </div>
      )}


    </div>
  ))
) : (
  <p>Aucune publication pour le moment.</p>
)}

              </>
            )}
  
  {activeTab === 'retweets' && (
  <div className="retweets-section">
    <h3>Mes retweets</h3>
    {retweets.length > 0 ? (
      retweets.map((retweet) => (
        <div key={retweet.id} className="profile-post">
          {/* Bouton de suppression */}
          <button
            className="delete-button"
            onClick={() => handleDeleteRetweet(retweet.id)}
            title="Supprimer ce retweet"
          >
            ✖
          </button>
          <p>{retweet.content}</p>


          <div className="post-actions">
  <button onClick={() => fetchComments(retweet.id)}>
    <FaComment /> {comments[retweet.id]?.length || 0} Commentaires
  </button>
  <button onClick={() => handleShare(retweet.id)}>
    <FaShare /> Partager
  </button>
  <button onClick={() => handleRetweet(retweet.id)}>
    <FaRetweet /> Retweeter
  </button>
  <button onClick={() => handleLike(retweet.id)}>
    ❤️ {likes[retweet.id] || 0}
  </button>
</div>

        </div>
      ))
    ) : (
      <p>Aucun retweet pour le moment.</p>
    )}
  </div>
)}

{/* Fin de la condition activeTab === 'retweets' */}
</div>

{/* Fin du profil utilisateur */}
</>
) : (
  <p>Chargement...</p>
)}


 
{/* Navigation en bas de page */}
<div className={`bottom-nav ${showBottomNav ? 'visible' : 'hidden'}`}>
  <FaHome onClick={() => navigate('/')} title="Accueil" />
  <FaSearch onClick={() => navigate('/search')} title="Recherche" />
  <FaPlus onClick={() => navigate('/publication')} title="Créer une publication" />

  <FaBell onClick={() => navigate('/notifications')} title="Notifications" />
  <FaUser onClick={() => navigate(`/profile/${currentUser?.id}`)} title="Mon profil" />
</div>
    

{/* Utilisation de BottomNav pour éviter le warning */}
{showBottomNav && <BottomNav />}

{/* Icône utilisée uniquement pour éviter le warning ESLint */}
<div style={{ display: 'none' }}>
  <FaUsers />
</div>


</div>
);
};

export default Profile;