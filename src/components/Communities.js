import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';




const apiUrl = process.env.REACT_APP_API_URL;

console.log("API URL utilisée :", apiUrl);



function Communities({ userId }) {
    const { communityId } = useParams();
    const [community, setCommunity] = useState({});
    const [members, setMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);

    // Fonction pour récupérer les détails de la communauté
    const fetchCommunityDetails = useCallback(() => {
        if (!communityId) {
            console.warn("[LOG] L'ID de la communauté est manquant.");
            return;
        }
        console.log(`[LOG] Récupération des détails de la communauté avec ID : ${communityId}`);

        axios.get(`${apiUrl}/api/communities/${communityId}`)
            .then(response => {
                console.log("[LOG] Détails de la communauté récupérés :", response.data);
                setCommunity(response.data);
            })
            .catch(error => console.error("[ERREUR] Erreur lors de la récupération de la communauté:", error));
    }, [communityId]);

    // Fonction pour récupérer les membres de la communauté
    const fetchMembers = useCallback(() => {
        if (!communityId) return;

        console.log(`[LOG] Récupération des membres de la communauté avec ID : ${communityId}`);
        axios.get(`${apiUrl}/api/communities/${communityId}/members`)
            .then(response => {
                console.log("[LOG] Membres récupérés :", response.data);
                setMembers(response.data);
            })
            .catch(error => console.error("[ERREUR] Erreur lors de la récupération des membres:", error));
    }, [communityId]);

    // Fonction pour récupérer les messages de la communauté
    const fetchMessages = useCallback(() => {
        if (!communityId) return;

        console.log(`[LOG] Récupération des messages de la communauté avec ID : ${communityId}`);
        axios.get(`${apiUrl}/api/communities/${communityId}/messages`)
            .then(response => {
                console.log("[LOG] Messages récupérés :", response.data);
                setMessages(response.data);
            })
            .catch(error => console.error("[ERREUR] Erreur lors de la récupération des messages:", error));
    }, [communityId]);

    useEffect(() => {
        fetchCommunityDetails();
        fetchMembers();
        fetchMessages();
    }, [fetchCommunityDetails, fetchMembers, fetchMessages]);

    // Fonction pour envoyer un nouveau message
    const handleSendMessage = () => {
        if (newMessage.trim() === '') return;

        console.log(`[LOG] Envoi d'un message dans la communauté ID : ${communityId}`);
        axios.post(`${apiUrl}/api/communities/${communityId}/messages`, {
            content: newMessage,
            user_id: userId,
        })
            .then(response => {
                console.log("[LOG] Message envoyé avec succès :", response.data);
                setMessages([...messages, response.data]);
                setNewMessage('');
            })
            .catch(error => console.error("[ERREUR] Erreur lors de l'envoi du message:", error));
    };

    // Fonction pour gérer le téléchargement de la photo de profil
    const handleProfilePhotoUpload = () => {
        if (!communityId) {
            console.error("[ERREUR] L'ID de la communauté est manquant lors du téléchargement de la photo.");
            return;
        }

        if (!profilePhoto) {
            console.error("[ERREUR] Aucune photo sélectionnée pour le téléchargement.");
            return;
        }

        const formData = new FormData();
        formData.append('profilePhoto', profilePhoto);

        console.log(`[LOG] Début du téléchargement de la photo de profil pour la communauté ID : ${communityId}`);
        axios.post(`${apiUrl}/api/communities/${communityId}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        .then((response) => {
            console.log("[LOG] Photo de profil mise à jour avec succès :", response.data);
            alert('Photo de profil mise à jour');
            setProfilePhoto(null);
            fetchCommunityDetails(); // Recharge les détails de la communauté pour afficher la nouvelle photo
        })
        .catch(error => {
            console.error("[ERREUR] Erreur lors du téléchargement de la photo de profil:", error);
            alert('Erreur lors du téléchargement de la photo de profil.');
        });
    };

    return (
        <div>
            <h2>{community.name || 'Chargement...'}</h2>
            <p>{community.description || 'Description non disponible.'}</p>

            {/* Affichage de la photo de profil actuelle */}
            <div>
                <label>Photo de profil actuelle :</label>
                {community.profile_photo ? (
                    
                    <img
    src={`${apiUrl}${community.profile_photo}`}
    alt="Profil de la communauté"
    style={{ width: '100px', height: '100px', borderRadius: '50%' }}
/>

                ) : (
                    <p>Aucune photo de profil disponible</p>
                )}
            </div>

            {/* Changer la photo de profil */}
            <div>
                <label>Changer la photo de profil:</label>
                <input type="file" onChange={(e) => {
                    console.log("[LOG] Photo sélectionnée :", e.target.files[0]);
                    setProfilePhoto(e.target.files[0]);
                }} />
                <button onClick={handleProfilePhotoUpload}>Télécharger la nouvelle photo</button>
            </div>

            {/* Affichage des membres */}
            <h3>Membres :</h3>
            <ul>
                {members.length > 0 ? (
                    members.map((member, index) => (
                        <li key={index}>{member.username}</li>
                    ))
                ) : (
                    <p>Aucun membre pour le moment.</p>
                )}
            </ul>

            {/* Section de discussion */}
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

            {/* Champ pour envoyer un message */}
            <input
                type="text"
                placeholder="Écrire un message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
            />
            <button onClick={handleSendMessage}>Envoyer</button>
        </div>
    );
}

export default Communities;
