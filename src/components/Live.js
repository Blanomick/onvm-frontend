import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';
import './Live.css'; // Assurez-vous d'avoir un fichier CSS pour le style


const apiUrl = process.env.REACT_APP_API_URL;

console.log("API URL utilisée :", apiUrl);

// Connexion sécurisée au WebSocket
const socket = io(apiUrl, {
    transports: ['websocket', 'polling'],
    secure: true,
    withCredentials: true
});

const Live = ({ currentUser }) => {
    const { id } = useParams();
    const [isLive, setIsLive] = useState(false);
    const [activeLiveUsers, setActiveLiveUsers] = useState([]);
    const [reactions, setReactions] = useState({});
    const [floatingReactions, setFloatingReactions] = useState([]);
    const [extraData, setExtraData] = useState(null);
    const [loading, setLoading] = useState(true);  // Pour gérer l'état de chargement

    const videoRef = useRef(null);
    const navigate = useNavigate();

    const emojis = ['❤️', '🔥', '👏', '😂', '😍'];

    // Fonction pour démarrer le direct
    const startLiveStream = () => {
        setIsLive(true);
        socket.emit('start-live', {
            username: currentUser.username,
            userId: currentUser.id,
            profilePicture: currentUser.profilePicture
        });

        // Accès à la caméra et au micro
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            })
            .catch((err) => {
                console.error("Erreur d'accès à la caméra et au micro : ", err);
                setIsLive(false);
            });
    };

    // Fonction pour arrêter le direct
    const stopLiveStream = () => {
        setIsLive(false);
        socket.emit('stop-live', { userId: currentUser.id });

        let stream = videoRef.current.srcObject;
        if (stream) {
            let tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
        videoRef.current.srcObject = null;
    };

    // Envoyer une réaction pendant le direct
    const sendReaction = (userId, emoji) => {
        socket.emit('reaction', { userId, emoji });

        setFloatingReactions((prevReactions) => [...prevReactions, emoji]);
        setTimeout(() => {
            setFloatingReactions((prevReactions) => prevReactions.slice(1));
        }, 3000);
    };

    // Récupérer des données supplémentaires du profil
    const fetchExtraProfileData = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/api/users/${id}/extra-data`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erreur lors de la récupération des données supplémentaires');

            const data = await response.json();
            setExtraData(data);
        } catch (error) {
            console.error('[ERREUR] Erreur lors de la récupération des données supplémentaires:', error);
        } finally {
            setLoading(false);  // Fin du chargement
        }
    }, [id]);

    useEffect(() => {
        socket.on('notify-live', (data) => {
            setActiveLiveUsers((prevUsers) => [...prevUsers, data]);
        });

        socket.on('end-live', (data) => {
            setActiveLiveUsers((prevUsers) => prevUsers.filter(user => user.userId !== data.userId));
        });

        socket.on('new-reaction', (data) => {
            setReactions((prevReactions) => ({
                ...prevReactions,
                [data.userId]: [...(prevReactions[data.userId] || []), data.emoji]
            }));
        });

        // Récupérer les utilisateurs en direct
        fetch(`${apiUrl}/api/live/active`)
            .then(response => response.json())
            .then(data => setActiveLiveUsers(data.activeLiveUsers))
            .catch(error => console.error("Erreur lors de la récupération des utilisateurs en direct : ", error));

        fetchExtraProfileData();

        return () => {
            socket.off('notify-live');
            socket.off('end-live');
            socket.off('new-reaction');
        };
    }, [fetchExtraProfileData]);


    useEffect(() => {
        console.log("🔹 Réactions chargées :", reactions);
    }, [reactions]);

    

    return (
        <div className="live-container">
            <h2>Live Streaming</h2>

            {loading ? (
                <p>Chargement des données...</p>
            ) : (
                <video ref={videoRef} className="live-video" autoPlay muted />
            )}

            <div>
                Données supplémentaires :
                {extraData && typeof extraData === 'object' ? (
                    <pre>{JSON.stringify(extraData, null, 2)}</pre>
                ) : (
                    "Aucune donnée"
                )}
            </div>

            {/* Réactions flottantes */}
            <div className="floating-reactions">
                {floatingReactions.map((reaction, index) => (
                    <span key={index} className="floating-emoji">{reaction}</span>
                ))}
            </div>

            {isLive ? (
                <button onClick={stopLiveStream}>Arrêter le Direct</button>
            ) : (
                <button onClick={startLiveStream}>Démarrer le Direct</button>
            )}

            <div className="active-live-users">
                <h3>Utilisateurs en direct</h3>
                {activeLiveUsers.length > 0 ? (
                    <ul>
                        {activeLiveUsers.map((user) => {
                            const profileImageUrl = user.profilePicture
                                ? `${apiUrl}${user.profilePicture}`
                                : '/images/default-profile.png';

                            return (
                                <li key={user.userId} className="live-user-item">
                                    <img
                                        src={profileImageUrl}
                                        alt={`${user.username}`}
                                        className="live-profile-picture"
                                        onClick={() => navigate(`/profile/${user.userId}`)}
                                    />
                                    <span>{user.username} est en direct</span>
                                    <div className="emoji-reactions">
                                        {emojis.map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => sendReaction(user.userId, emoji)}
                                                className="emoji-button"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p>Aucun utilisateur en direct actuellement.</p>
                )}
            </div>
        </div>
    );
};

export default Live;
