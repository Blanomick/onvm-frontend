import React, { useState, useEffect , useCallback  } from 'react';
import { useNavigate } from 'react-router-dom'; // Import pour la navigation
import axios from 'axios';
import { useParams } from 'react-router-dom';


const apiUrl = process.env.REACT_APP_API_URL;

console.log("API URL utilisée :", apiUrl);

function CreateCommunity({ userId }) {
  const { communityId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [communities, setCommunities] = useState([]);
  const navigate = useNavigate(); // Hook pour la navigation

 // Ajoutez fetchMessages ici, après les useState
 const fetchMessages = useCallback(() => {
  axios.get(`/api/communities/${communityId}/messages`)
    .then((response) => setMessages(response.data))
    .catch((error) => console.error('Erreur lors de la récupération des messages:', error));
}, [communityId]);


// Fonction pour récupérer les communautés
const fetchCommunities = useCallback(async () => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/communities/users/${userId}`);
    setCommunities(response.data);
  } catch (error) {
    console.error('Erreur lors de la récupération des communautés:', error);
  }
}, [userId]);

 // Fonction pour envoyer un message
 const handleSendMessage = async () => {
  if (newMessage.trim() === '') return;

  try {
    const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/communities/${communityId}/messages`, {
      content: newMessage,
      user_id: userId,
    });
    setMessages((prevMessages) => [...prevMessages, response.data]);
    setNewMessage(''); // Réinitialise le champ de message
  } catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
  }
};


  useEffect(() => {
    if (userId) {
      fetchCommunities();
    }
    if (communityId) {
      fetchMessages();
    }
  }, [userId, communityId, fetchCommunities, fetchMessages]); // Ajoute toutes les dépendances nécessaires

  

  // Fonction pour créer une nouvelle communauté
  const handleCreateCommunity = async (e) => {
    e.preventDefault();

    if (!name || !description) {
      alert('Tous les champs sont requis.');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/communities`, {
        name,
        description,
        created_by: userId,
      });
      setName('');
      setDescription('');
      fetchCommunities(); // Rafraîchir la liste des communautés
    } catch (error) {
      console.error('Erreur lors de la création de la communauté:', error);
    }
  };

  // Fonction pour rediriger vers la page de conversation de la communauté
  const goToCommunityConversation = (communityId) => {
    navigate(`/community/${communityId}`); // Redirige vers la page de la communauté
  };

  return (
    <div>
      <h2>Créer une nouvelle communauté</h2>
      <form onSubmit={handleCreateCommunity}>
        <div>
          <label>Nom de la communauté :</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Description :</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <button type="submit">Créer</button>
      </form>

      <h3>Vos Communautés :</h3>
      <ul>
        {communities.length > 0 ? (
          communities.map((community) => (
            <li key={community.id}>
              <h4 onClick={() => goToCommunityConversation(community.id)} style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}>
                {community.name}
              </h4>
              <p>{community.description}</p>
            </li>
          ))
        ) : (
          <p>Vous n'avez pas encore créé de communauté.</p>
        )}
      </ul>


      <h3>Discussions :</h3>
      <div className="messages">
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <div key={index} className="message">
              <strong>{message.username}:</strong> {message.content}
            </div>
          ))
        ) : (
          <p>Aucun message pour le moment.</p>
        )}
      </div>

      <div className="new-message">
        <input
          type="text"
          placeholder="Écrire un message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button onClick={handleSendMessage}>Envoyer</button>
      </div>
    </div>
  );
}
  
  


export default CreateCommunity;
