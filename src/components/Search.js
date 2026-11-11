import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiX, FiCheck } from "react-icons/fi";
import axios from "axios";

import BottomNav from "./BottomNav";
import ProfileAvatar from "./ProfileAvatar";
import "./Search.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const Search = ({ user }) => {
  const navigate = useNavigate();
  const userId = user?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const [followedIds, setFollowedIds] = useState([]);
  const [pendingIds, setPendingIds] = useState([]);
  const [followError, setFollowError] = useState("");
  const pendingFollowRef = useRef(new Set());

  const query = searchTerm.trim();

  useEffect(() => {
    setFollowedIds([]);
    setFollowError("");
  }, [userId]);

  useEffect(() => {
    setResults([]);
    setError("");
    setSearched(false);

    if (!userId || !query) {
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();

    setLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/api/search`, {
          params: {
            q: query,
            userId,
          },
          signal: controller.signal,
          timeout: 15000,
        });

        if (!Array.isArray(data)) {
          throw new Error("Réponse de recherche invalide.");
        }

        if (active) {
          // Chaque compte apparaît une seule fois.
          const uniqueResults = [
            ...new Map(
              data
                .filter((item) => item?.id != null)
                .map((item) => [String(item.id), item])
            ).values(),
          ];

          setResults(uniqueResults);
        }
      } catch (err) {
        if (active && !axios.isCancel(err)) {
          console.error("[RECHERCHE]", err);
          setError("La recherche est indisponible. Réessaie dans un instant.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setSearched(true);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, userId]);

  const handleFollow = async (targetUserId) => {
    if (!userId) return;

    const id = String(targetUserId);

    if (
      id === String(userId) ||
      followedIds.includes(id) ||
      pendingFollowRef.current.has(id)
    ) {
      return;
    }

    pendingFollowRef.current.add(id);
    setPendingIds((previous) => [...previous, id]);
    setFollowError("");

    try {
      await axios.post(
        `${apiUrl}/api/users/follow`,
        {
          followerId: userId,
          followingId: targetUserId,
        },
        { timeout: 15000 }
      );

      setFollowedIds((previous) =>
        previous.includes(id) ? previous : [...previous, id]
      );
    } catch (err) {
      console.error("[SUIVI]", err);
      setFollowError(
        err.response?.data?.message ||
          "Impossible de suivre ce compte pour le moment."
      );
    } finally {
      pendingFollowRef.current.delete(id);
      setPendingIds((previous) => previous.filter((item) => item !== id));
    }
  };

  return (
    <main className="onvm-search">
      <div className="onvm-search-content">
        <header className="onvm-search-header">
          <h1>Rechercher</h1>
          <p>Retrouve les personnes qui t’intéressent.</p>
        </header>

        <form
          className="onvm-search-field"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <FiSearch aria-hidden="true" />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher une personne"
            aria-label="Rechercher une personne"
            autoComplete="off"
            spellCheck={false}
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Effacer la recherche"
            >
              <FiX aria-hidden="true" />
            </button>
          )}
        </form>

        {followError && (
          <p className="onvm-search-error" role="alert">
            {followError}
          </p>
        )}

        {!userId ? (
          <div className="onvm-search-empty">
            <h2>Retrouve la communauté ONVM</h2>
            <p>Connecte-toi pour rechercher des personnes.</p>
            <button type="button" onClick={() => navigate("/auth")}>
              Se connecter
            </button>
          </div>
        ) : !query ? (
          <div className="onvm-search-empty">
            <FiSearch aria-hidden="true" />
            <h2>Une personne en tête ?</h2>
            <p>Écris son nom pour retrouver son profil.</p>
          </div>
        ) : loading ? (
          <p className="onvm-search-status" role="status">
            Recherche en cours…
          </p>
        ) : error ? (
          <p className="onvm-search-error" role="alert">
            {error}
          </p>
        ) : results.length > 0 ? (
          <>
            <p className="onvm-search-count" role="status">
              {results.length} résultat{results.length > 1 ? "s" : ""}
            </p>

            <ul className="onvm-search-results">
              {results.map((result) => {
                const id = String(result.id);
                const isSelf = id === String(userId);
                const isFollowing = followedIds.includes(id);
                const isPending = pendingIds.includes(id);
                const name = result.username || "Utilisateur";

                return (
                  <li key={id} className="onvm-search-row">
                    <button
                      type="button"
                      className="onvm-search-profile"
                      onClick={() => navigate(`/profile/${result.id}`)}
                      aria-label={`Voir le profil de ${name}`}
                    >
                      <ProfileAvatar
                        src={result.profilePicture}
                        name={name}
                        size={46}
                      />

                      <span className="onvm-search-person">
                        <span className="onvm-search-name">{name}</span>

                        {result.bio && (
                          <span className="onvm-search-bio">
                            {result.bio}
                          </span>
                        )}

                        {isSelf && (
                          <span className="onvm-search-bio">Ton profil</span>
                        )}
                      </span>
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        className={`onvm-search-follow ${
                          isFollowing ? "is-following" : ""
                        }`}
                        onClick={() => handleFollow(result.id)}
                        disabled={isPending || isFollowing}
                        aria-label={
                          isFollowing
                            ? `Tu suis ${name}`
                            : `Suivre ${name}`
                        }
                      >
                        {isFollowing && <FiCheck aria-hidden="true" />}
                        {isPending
                          ? "…"
                          : isFollowing
                            ? "Suivi"
                            : "Suivre"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : searched ? (
          <div className="onvm-search-empty">
            <h2>Aucun résultat pour « {query} »</h2>
            <p>Essaie un autre nom ou vérifie l’orthographe.</p>
          </div>
        ) : null}
      </div>

      <BottomNav />
    </main>
  );
};

export default Search;