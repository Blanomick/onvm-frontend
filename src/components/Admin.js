import React, { useEffect, useState } from 'react';

const apiUrl = process.env.REACT_APP_API_URL;

console.log("API URL utilisée :", apiUrl);



const Admin = () => {
  const [users, setUsers] = useState([]);  // Liste des utilisateurs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); // Utilisateur sélectionné pour suppression

  // Fonction pour récupérer tous les utilisateurs
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/users`); // Utilisation de l'URL d'API dynamique
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs :', error);
      setError('Erreur lors de la récupération des utilisateurs.');
    }
  };

  // Fonction pour supprimer un utilisateur
  const deleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/users/${userId}`, { // Utilisation de l'URL d'API dynamique
        method: 'DELETE',
      });
      if (response.ok) {
        alert('Utilisateur supprimé avec succès');
        fetchUsers();  // Mettre à jour la liste après suppression
      } else {
        const errorMessage = await response.text();
        alert('Erreur lors de la suppression de l\'utilisateur : ' + errorMessage);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur :', error);
    }
  };

  // Utiliser useEffect pour charger les utilisateurs lors du montage du composant
  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return <p>Chargement des utilisateurs...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      <h1>Page d'administration</h1>
      <p>Bienvenue sur la page d'administration. Vous pouvez gérer les utilisateurs ici.</p>
      
      {/* Affichage de la liste des utilisateurs */}
      <h2>Liste des utilisateurs</h2>
      <table border="1" cellPadding="10" cellSpacing="0">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom d'utilisateur</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>
                <button onClick={() => deleteUser(user.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Affichage des détails des utilisateurs */}
      {selectedUser && (
        <div>
          <h2>Détails de l'utilisateur : {selectedUser.username}</h2>
          {/* Ici tu peux ajouter des informations plus détaillées */}
          <button onClick={() => setSelectedUser(null)}>Fermer les détails</button>
        </div>
      )}
    </div>
  );
};

export default Admin;
