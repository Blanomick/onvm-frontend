// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const savedLang = localStorage.getItem('language') || 'fr';

const resources = {
  fr: {
    translation: {
      welcome: "Bienvenue",
      settings: "Paramètres",
      changeLanguage: "Changer la langue",
      message: "Message",
      followers: "abonnés",
      following: "suivis",
      posts: "publications",
      // ajoute d'autres traductions ici
    },
  },
  en: {
    translation: {
      welcome: "Welcome",
      settings: "Settings",
      changeLanguage: "Change Language",
      message: "Message",
      followers: "followers",
      following: "following",
      posts: "posts",
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
