      import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Profile from './components/profile';
import Publication from './components/Publication';
import AdminAuth from './components/AdminAuth';
import Admin from './components/Admin';
import Search from './components/Search';
import Notifications from './components/Notifications';
import Settings from './components/Settings';
import Communities from './components/Communities';
import CreateCommunity from './components/CreateCommunity';
import MainNavigation from './components/MainNavigation';
import Live from './components/Live';
import Banner from './components/Banner';
import EditBio from './components/EditBio';
import Download from './components/Download';
import LanguageSettings from './components/LanguageSettings';
import Chat from './components/Chat';
import Conversations from './components/Conversations';

const App = () => {
  const [user, setUser] = useState(null); // Stocke l'utilisateur connecté
  const [isAdmin, setIsAdmin] = useState(false); // Indique si l'utilisateur est administrateur
const [showBanner, setShowBanner] = useState(true);
const [language, setLanguage] = useState(localStorage.getItem('language') || 'fr');


React.useEffect(() => {
  const timer = setTimeout(() => {
    setShowBanner(false);
  }, 5000); // 5 secondes

  return () => clearTimeout(timer);
}, []);


  // Fonction pour gérer la connexion de l'utilisateur et administrateur
  const handleLogin = (userData, isAdminFlag = false) => {
    console.log("[LOG] Utilisateur connecté :", userData);
    setUser(userData);
    setIsAdmin(isAdminFlag);
    console.log("[LOG] ID utilisateur après connexion:", userData?.id);
  };

  return (
    <Router>
      <div>
        {showBanner && <Banner />}



        <Routes>


         <Route
  path="/chat/:id"
  element={user ? <Chat currentUser={user} /> : <Navigate to="/auth" />}
/>


   <Route
  path="/conversations"
  element={user ? <Conversations currentUser={user} /> : <Navigate to="/auth" />}
/>


<Route
  path="/profile"
  element={user ? <Navigate to={`/profile/${user.id}`} /> : <Navigate to="/auth" />}
/>

<Route
  path="/notifications"
  element={<Notifications user={user} />}
/>


         <Route path="/settings/language" element={<LanguageSettings setLanguage={setLanguage} />} />

            {/* Route de téléchargement (publique, avant Auth) */}
          <Route path="/download" element={<Download />} />

          {/* Route par défaut vers Auth si l'utilisateur n'est pas connecté */}
          <Route
            path="/"
            element={user ? <Navigate to="/publication" /> : <Auth onLogin={handleLogin} />}
          />
          

          {/* Route d'authentification utilisateur */}
          <Route path="/auth" element={<Auth onLogin={handleLogin} />} />

          {/* Route pour le composant principal de navigation */}
          <Route
            path="/main"
            element={user ? <MainNavigation /> : <Navigate to="/auth" />}
          />

         <Route path="/edit-bio/:id" element={<EditBio currentUser={user} />} />


          {/* Affichage du profil d'un utilisateur spécifique */}
          <Route
            path="/profile/:id"
            element={user ? <Profile currentUser={user} /> : <Navigate to="/auth" />}
          />

          {/* Page de publication */}
          <Route
            path="/publication"
            element={user ? <Publication user={user} /> : <Navigate to="/auth" />}
          />

          {/* Page d'authentification pour les administrateurs */}
          <Route
            path="/admin-auth"
            element={<AdminAuth onLogin={handleLogin} />}
          />

          {/* Page d'administration */}
          <Route
            path="/admin"
            element={user && isAdmin ? <Admin /> : <Navigate to="/auth" />}
          />

          {/* Page de recherche */}
          <Route
            path="/search"
            element={user ? <Search user={user} /> : <Navigate to="/auth" />}
          />

          {/* Page des notifications */}
          <Route
            path="/notifications"
            element={user ? <Notifications user={user} /> : <Navigate to="/auth" />}
          />

          {/* Page des paramètres */}
         <Route
  path="/settings"
  element={user ? <Settings currentUser={user} /> : <Navigate to="/auth" />}
/>


          {/* Page de communauté */}
          <Route
            path="/community"
            element={user ? <Communities userId={user?.id} /> : <Navigate to="/auth" />}
          />

          {/* Page de création de communauté */}
          <Route
            path="/create-community"
            element={user ? <CreateCommunity userId={user?.id} /> : <Navigate to="/auth" />}
          />

          {/* Page de discussion d'une communauté spécifique */}
          <Route
            path="/community/:communityId"
            element={user ? <Communities userId={user?.id} /> : <Navigate to="/auth" />}
          />

          {/* Page de Live */}
          <Route
            path="/live"
            element={user ? <Live currentUser={user} /> : <Navigate to="/auth" />}
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

