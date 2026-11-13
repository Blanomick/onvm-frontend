import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiArrowLeft,
  FiChevronRight,
  FiEdit3,
  FiGlobe,
  FiGift,
  FiCreditCard,
  FiLogOut,
  FiRefreshCw,
  FiShield,
  FiTrash2,
} from "react-icons/fi";

import ProfileAvatar from "./ProfileAvatar";
import BottomNav from "./BottomNav";
import SafetyReportForm from "./SafetyReportForm";
import "./Settings.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const Settings = ({ currentUser }) => {
  const navigate = useNavigate();

  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState("");
  const [retry, setRetry] = useState(0);

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();
    let active = true;

    async function fetchBalance() {
      setLoadingBalance(true);
      setBalanceError("");
      setBalance(null);

      try {
        const response = await fetch(
          `${apiUrl}/api/wallet/${encodeURIComponent(userId)}/balance`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Impossible de charger le solde.");
        }

        const data = await response.json();
        const value = data.balance;

        if (
          value == null ||
          (typeof value !== "number" && typeof value !== "string") ||
          String(value).trim() === "" ||
          !Number.isFinite(Number(value))
        ) {
          throw new Error("Le solde reçu est invalide.");
        }

        if (active) setBalance(Number(value));
      } catch (error) {
        if (active && error.name !== "AbortError") {
          setBalanceError("Ton solde est momentanément indisponible.");
        }
      } finally {
        if (active) setLoadingBalance(false);
      }
    }

    fetchBalance();

    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, retry]);

  if (!userId) {
    return (
      <main className="onvm-settings">
        <h1>Paramètres</h1>
        <p>Connecte-toi pour accéder à ton compte.</p>

        <button
          type="button"
          className="onvm-settings__login"
          onClick={() => navigate("/auth")}
        >
          Se connecter
        </button>
      </main>
    );
  }

  // Conservation de l’euro utilisé dans ta version actuelle.
  const formattedBalance =
    balance === null
      ? "—"
      : new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
        }).format(balance);

  return (
    <div className="onvm-settings">
      <header className="onvm-settings__header">
        <button
          type="button"
          className="onvm-settings__back"
          onClick={() => navigate(`/profile/${userId}`)}
          aria-label="Retour au profil"
        >
          <FiArrowLeft aria-hidden="true" />
        </button>

        <h1>Paramètres</h1>
      </header>

      <main>
        <button
          type="button"
          className="onvm-settings__profile"
          onClick={() => navigate(`/profile/${userId}`)}
        >
          <ProfileAvatar
            src={currentUser.profilePicture}
            name={currentUser.username || "Utilisateur"}
            size={58}
          />

          <span className="onvm-settings__profile-text">
            <strong>{currentUser.username || "Mon compte"}</strong>
            <span>Voir mon profil</span>
          </span>

          <FiChevronRight
            className="onvm-settings__chevron"
            aria-hidden="true"
          />
        </button>

        <section
          className="onvm-settings__section"
          aria-labelledby="settings-account-title"
        >
          <h2 id="settings-account-title">Mon compte</h2>

          <div className="onvm-settings__options">
            <button
              type="button"
              className="onvm-settings__option"
              onClick={() => navigate(`/edit-bio/${userId}`)}
            >
              <span className="onvm-settings__icon">
                <FiEdit3 aria-hidden="true" />
              </span>

              <span className="onvm-settings__option-text">
                <strong>Modifier ma bio</strong>
                <span>Quelques mots pour te présenter</span>
              </span>

              <FiChevronRight
                className="onvm-settings__chevron"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="onvm-settings__option"
              onClick={() => navigate("/settings/language")}
            >
              <span className="onvm-settings__icon">
                <FiGlobe aria-hidden="true" />
              </span>

              <span className="onvm-settings__option-text">
                <strong>Langue</strong>
                <span>Choisir la langue de l’application</span>
              </span>

              <FiChevronRight
                className="onvm-settings__chevron"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="onvm-settings__option"
              onClick={() => navigate("/settings/invitation")}
            >
              <span className="onvm-settings__icon">
                <FiGift aria-hidden="true" />
              </span>

              <span className="onvm-settings__option-text">
                <strong>Inviter des amis</strong>
                <span>Faire découvrir ONVM à tes proches</span>
              </span>

              <FiChevronRight
                className="onvm-settings__chevron"
                aria-hidden="true"
              />
            </button>
          </div>
        </section>

        <section
          className="onvm-settings__section"
          aria-labelledby="settings-wallet-title"
        >
          <h2 id="settings-wallet-title">Mon portefeuille</h2>

          <div
            className="onvm-settings__wallet"
            aria-busy={loadingBalance}
          >
            <div className="onvm-settings__wallet-heading">
              <span>
                <FiCreditCard aria-hidden="true" />
                Solde actuel
              </span>

              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                disabled={loadingBalance}
                aria-label="Actualiser le solde"
                className="onvm-settings__refresh"
              >
                <FiRefreshCw
                  aria-hidden="true"
                  className={loadingBalance ? "is-loading" : ""}
                />
              </button>
            </div>

            <div className="onvm-settings__balance" aria-live="polite">
              {loadingBalance ? "Chargement…" : formattedBalance}
            </div>

            {balanceError && (
              <p className="onvm-settings__error" role="alert">
                {balanceError}
              </p>
            )}

            <div className="onvm-settings__wallet-footer">
              <p id="withdraw-unavailable">
                Les retraits ne sont pas encore disponibles.
              </p>

              <button
                type="button"
                disabled
                aria-describedby="withdraw-unavailable"
              >
                Retirer
              </button>
            </div>
          </div>
        </section>


        <section
          className="onvm-settings__section"
          aria-labelledby="settings-privacy-title"
        >
          <h2 id="settings-privacy-title">
            Confidentialité et données
          </h2>

          <div className="onvm-settings__options">
            <a
              className="onvm-settings__option onvm-settings__link"
              href="https://onvme.netlify.app/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="onvm-settings__icon">
                <FiShield aria-hidden="true" />
              </span>

              <span className="onvm-settings__option-text">
                <strong>Politique de confidentialité</strong>
                <span>
                  Comprendre l’utilisation de tes données
                </span>
              </span>

              <FiChevronRight
                className="onvm-settings__chevron"
                aria-hidden="true"
              />
            </a>

            <a
              className={
                "onvm-settings__option " +
                "onvm-settings__link " +
                "onvm-settings__deletion-link"
              }
              href="https://onvme.netlify.app/privacy.html#suppression"
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby="settings-deletion-help"
            >
              <span className="onvm-settings__icon">
                <FiTrash2 aria-hidden="true" />
              </span>

              <span className="onvm-settings__option-text">
                <strong>Demander la suppression de mon compte</strong>
                <span>
                  Consulter la procédure et contacter ONVM
                </span>
              </span>

              <FiChevronRight
                className="onvm-settings__chevron"
                aria-hidden="true"
              />
            </a>
          </div>

          <p
            id="settings-deletion-help"
            className="onvm-settings__deletion-help"
          >
            La demande s’effectue par e-mail depuis la page indiquée.
            Ouvrir cette page ne supprime pas ton compte.
            Se déconnecter ne supprime pas tes données.
          </p>
        </section>
        <SafetyReportForm />
        <section className="onvm-settings__logout-section">
          <button
            type="button"
            className="onvm-settings__logout"
            onClick={() => navigate("/logout")}
          >
            <FiLogOut aria-hidden="true" />
            Se déconnecter
          </button>
        </section>

        <p className="onvm-settings__signature">ONVM</p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;