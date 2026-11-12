import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateGroup.css';

function CreateGroup() {
  const navigate = useNavigate();
const submitLockRef = useRef(false);
const createdGroupIdRef = useRef(null);
const addedMemberIdsRef = useRef(new Set());
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 🔥 NOUVEAU
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // 🔍 RECHERCHE UTILISATEURS
  useEffect(() => {
  const query = search.trim().toLocaleLowerCase("fr");

  setUsers([]);

  if (!query) return;

  const controller = new AbortController();

  const timer = setTimeout(async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/api/users`, {
        signal: controller.signal,
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      });

      if (!response.ok) {
        throw new Error("Impossible de rechercher les utilisateurs.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Liste d’utilisateurs invalide.");
      }

      let savedUser = null;

      try {
        savedUser = JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        // La vérification de session sera faite lors de la création.
      }

      const filtered = data.filter((person) => {
        const isCreator = String(person.id) === String(savedUser?.id);
        const matches = String(person.username || "")
          .toLocaleLowerCase("fr")
          .includes(query);

        return !isCreator && matches;
      });

      if (!controller.signal.aborted) {
        setUsers(filtered);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessage(error.message);
      }
    }
  }, 300);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
}, [search, API_URL]);
  // 📷 PHOTO
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  // ➕ AJOUT UTILISATEUR
const addUser = (user) => {
  if (loading || createdGroupIdRef.current) return;

  setSelectedUsers((previous) => {
    const alreadySelected = previous.some(
      (member) => String(member.id) === String(user.id)
    );

    return alreadySelected ? previous : [...previous, user];
  });
};

  // ❌ SUPPRIMER UTILISATEUR
  const removeUser = (id) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== id));
  };

  // 🚀 CREATION GROUPE
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (submitLockRef.current) return;

  if (!groupName.trim()) {
    setMessage("Le nom du groupe est obligatoire.");
    return;
  }

  let user;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  if (!user?.id) {
    navigate("/auth");
    return;
  }

  submitLockRef.current = true;
  setLoading(true);
  setMessage("");

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    // Si le groupe a déjà été créé lors d’une tentative précédente,
    // on reprend uniquement l’ajout des membres.
    if (!createdGroupIdRef.current) {
      const response = await fetch(`${API_URL}/api/groups`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: groupName.trim(),
          description: description.trim(),
          created_by: user.id,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.id == null) {
        throw new Error(
          data?.error || "La création du groupe n’a pas été confirmée."
        );
      }

      createdGroupIdRef.current = data.id;
    }

    const groupId = createdGroupIdRef.current;
    const failedMembers = [];

    for (const member of selectedUsers) {
      const memberId = String(member.id);

      if (
        memberId === String(user.id) ||
        addedMemberIdsRef.current.has(memberId)
      ) {
        continue;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/groups/${groupId}/add-member`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ user_id: member.id }),
          }
        );

        if (!response.ok) {
          throw new Error("Ajout refusé.");
        }

        addedMemberIdsRef.current.add(memberId);
      } catch {
        failedMembers.push(member.username || "Un membre");
      }
    }

    if (failedMembers.length > 0) {
      setMessage(
        `Le groupe est créé, mais ces membres n’ont pas pu être ajoutés : ${
          failedMembers.join(", ")
        }. Clique sur « Réessayer l’ajout des membres ».`
      );
      return;
    }

    navigate(`/chat/group/${groupId}`, { replace: true });
  } catch (error) {
    setMessage(error.message || "Une erreur est survenue.");
  } finally {
    submitLockRef.current = false;
    setLoading(false);
  }
};

  return (
    <div className="create-group-page">

      <div className="create-group-header">
        <button onClick={() => navigate(-1)}>←</button>
        <h2>Nouveau groupe</h2>
      </div>

      <form onSubmit={handleSubmit} className="create-group-form">

        {/* PHOTO */}
        <div className="group-photo-section">
          <label htmlFor="photo" className="group-photo-circle">
            {preview ? <img src={preview} alt="" /> : <span>📷</span>}
          </label>

          <input
            id="photo"
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoChange}
          />
        </div>

        {/* NOM */}
      <input
  type="text"
  placeholder="Nom du groupe"
  value={groupName}
  onChange={(e) => setGroupName(e.target.value)}
  disabled={loading || Boolean(createdGroupIdRef.current)}
/>

        {/* DESCRIPTION */}
       <textarea
  placeholder="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  disabled={loading || Boolean(createdGroupIdRef.current)}
/>

        {/* 🔍 RECHERCHE */}
       <input
  type="text"
  placeholder="Rechercher des utilisateurs..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  disabled={loading || Boolean(createdGroupIdRef.current)}
/>

        {/* LISTE UTILISATEURS */}
        <div className="user-search-list">
          {users.map(u => (
            <div key={u.id} onClick={() => addUser(u)} className="user-item">
              <img src={`${API_URL}${u.profilePicture}`} alt="" />
              <span>{u.username}</span>
            </div>
          ))}
        </div>

        {/* MEMBRES SELECTIONNÉS */}
        <div className="selected-users">
          {selectedUsers.map(u => (
            <div key={u.id} className="selected-user">
              <span>{u.username}</span>
              <button
  type="button"
  disabled={loading || Boolean(createdGroupIdRef.current)}
  onClick={() => removeUser(u.id)}
  aria-label={`Retirer ${u.username} de la sélection`}
>
  ×
</button>
            </div>
          ))}
        </div>

        {message && <p className="form-message">{message}</p>}

       <button type="submit" disabled={loading}>
  {loading
    ? "Enregistrement…"
    : createdGroupIdRef.current
      ? "Réessayer l’ajout des membres"
      : "Créer le groupe"}
</button>

{createdGroupIdRef.current && !loading && (
  <button
    type="button"
    onClick={() =>
      navigate(`/chat/group/${createdGroupIdRef.current}`)
    }
  >
    Ouvrir le groupe
  </button>
)}

      </form>
    </div>
  );
}

export default CreateGroup;