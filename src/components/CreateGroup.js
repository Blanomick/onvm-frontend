import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateGroup.css';

function CreateGroup() {
  const navigate = useNavigate();

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
    if (!search.trim()) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users`);
        const data = await res.json();

        const filtered = data.filter(u =>
          u.username.toLowerCase().includes(search.toLowerCase())
        );

        setUsers(filtered);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers()
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
    if (selectedUsers.find(u => u.id === user.id)) return;
    setSelectedUsers(prev => [...prev, user]);
  };

  // ❌ SUPPRIMER UTILISATEUR
  const removeUser = (id) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== id));
  };

  // 🚀 CREATION GROUPE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) {
      setMessage('Nom du groupe obligatoire');
      return;
    }

    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem('user'));

      if (!user?.id) {
        navigate('/auth');
        return;
      }

      // 🔥 CREATION GROUPE
      const response = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          description,
          created_by: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // 🔥 AJOUT MEMBRES
      for (let u of selectedUsers) {
        await fetch(`${API_URL}/api/groups/${data.id}/add-member`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: u.id }),
        });
      }

      // 🚀 REDIRECTION CHAT
      navigate(`/chat/group/${data.id}`);

    } catch (err) {
      setMessage(err.message);
    } finally {
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
        />

        {/* DESCRIPTION */}
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* 🔍 RECHERCHE */}
        <input
          type="text"
          placeholder="Rechercher des utilisateurs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
              <button onClick={() => removeUser(u.id)}>❌</button>
            </div>
          ))}
        </div>

        {message && <p className="form-message">{message}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer le groupe'}
        </button>

      </form>
    </div>
  );
}

export default CreateGroup;