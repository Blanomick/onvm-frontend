import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiMapPin, FiSearch, FiUsers } from "react-icons/fi";
import BottomNav from "../BottomNav";
import ShareSheet from "../ShareSheet";
import PostCard, { mediaUrl } from "./PostCard";
import "./Discover.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
const ABIDJAN = [
  "Abobo", "Adjamé", "Anyama", "Attécoubé", "Bingerville", "Cocody", "Koumassi",
  "Marcory", "Plateau", "Port-Bouët", "Songon", "Treichville", "Yopougon",
];

function saveLocalUser(patch) {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user) localStorage.setItem("user", JSON.stringify({ ...user, ...patch }));
  } catch {
    // ignore
  }
}

// Choix de la commune
function CommunePicker({ current, onPick, onCancel }) {
  const [communes, setCommunes] = useState([]);
  const [stats, setStats] = useState({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${apiUrl}/api/discover/communes`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setCommunes)
      .catch(() => setCommunes(ABIDJAN));
    fetch(`${apiUrl}/api/discover/nearby/stats`)
      .then((response) => (response.ok ? response.json() : {}))
      .then(setStats)
      .catch(() => undefined);
  }, []);

  const filtered = communes.filter((name) =>
    name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .includes(query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""))
  );
  const groups = [
    ["Abidjan", filtered.filter((name) => ABIDJAN.includes(name))],
    ["Autres villes", filtered.filter((name) => !ABIDJAN.includes(name) && name !== "Diaspora")],
    ["Hors de Côte d’Ivoire", filtered.filter((name) => name === "Diaspora")],
  ];

  return (
    <section className="onvm-nearby__picker">
      <div className="onvm-nearby__intro">
        <FiMapPin size={30} />
        <h2>Où es-tu ?</h2>
        <p>Choisis ta commune pour voir ce qui se passe près de chez toi et retrouver tes voisins.</p>
      </div>

      <label className="onvm-discover__search">
        <FiSearch />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher ta commune ou ta ville"
        />
      </label>

      {groups.map(([title, list]) =>
        list.length ? (
          <div key={title} className="onvm-nearby__group">
            <h3>{title}</h3>
            <div className="onvm-nearby__chips">
              {list.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={name === current ? "is-active" : ""}
                  onClick={() => onPick(name)}
                >
                  {name}
                  {stats[name] ? <small>{stats[name]}</small> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null
      )}

      {onCancel && (
        <button type="button" className="onvm-nearby__cancel" onClick={onCancel}>
          Annuler
        </button>
      )}
    </section>
  );
}

// Page « Près de moi »
export default function Nearby({ user }) {
  const navigate = useNavigate();
  const [commune, setCommune] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState(null);
  const [people, setPeople] = useState(null);
  const [error, setError] = useState("");
  const [shareId, setShareId] = useState(null);
  const token = useMemo(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  }, []);

  // Commune enregistrée sur le compte
  useEffect(() => {
    if (!user?.id) {
      setLoadingUser(false);
      return;
    }
    fetch(`${apiUrl}/api/users/${user.id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setCommune(data?.commune || user.commune || null))
      .catch(() => setCommune(user.commune || null))
      .finally(() => setLoadingUser(false));
  }, [user?.id, user?.commune]);

  useEffect(() => {
    if (!commune) return;
    setPosts(null);
    setPeople(null);
    setError("");
    const params = new URLSearchParams({ commune, limit: "100" });
    if (user?.id) params.set("userId", user.id);
    fetch(`${apiUrl}/api/publications?${params}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setPosts)
      .catch(() => setError("Impossible de charger les publications."));
    fetch(`${apiUrl}/api/discover/nearby/people?commune=${encodeURIComponent(commune)}`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [commune, user?.id]);

  const pick = async (name) => {
    setPicking(false);
    setCommune(name);
    saveLocalUser({ commune: name });
    try {
      const response = await fetch(`${apiUrl}/api/discover/commune`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ commune: name }),
      });
      if (!response.ok) throw new Error();
    } catch {
      setError("Ta commune n’a pas pu être enregistrée sur ton compte. Réessaie plus tard.");
    }
  };

  const others = (people || []).filter((person) => Number(person.id) !== Number(user?.id));

  return (
    <main className="onvm-discover onvm-nearby">
      <header className="onvm-discover__top">
        <button type="button" onClick={() => navigate(-1)} aria-label="Retour">
          <FiArrowLeft />
        </button>
        <h1>{commune && !picking ? `📍 ${commune}` : "Près de moi"}</h1>
        {commune && !picking ? (
          <button type="button" className="onvm-discover__link" onClick={() => setPicking(true)}>
            Changer
          </button>
        ) : (
          <span />
        )}
      </header>

      {loadingUser && <span className="onvm-discover__spinner" />}

      {!loadingUser && (!commune || picking) && (
        <CommunePicker
          current={commune}
          onPick={pick}
          onCancel={commune ? () => setPicking(false) : null}
        />
      )}

      {!loadingUser && commune && !picking && (
        <>
          <nav className="onvm-feed-tabs">
            <button type="button" className={tab === "posts" ? "is-active" : ""} onClick={() => setTab("posts")}>
              Publications
            </button>
            <button type="button" className={tab === "people" ? "is-active" : ""} onClick={() => setTab("people")}>
              <FiUsers style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Voisins{others.length ? ` (${others.length})` : ""}
            </button>
          </nav>

          {error && <p className="onvm-discover__empty">{error}</p>}

          {tab === "posts" && (
            <>
              {!posts && !error && <span className="onvm-discover__spinner" />}
              {posts && posts.length === 0 && (
                <div className="onvm-discover__empty">
                  <p>Rien n’a encore été publié à {commune}.</p>
                  <p>Lance l’ambiance : partage un bon plan, une photo du quartier, un événement…</p>
                  <button type="button" onClick={() => navigate("/create-publication")}>
                    Publier pour {commune}
                  </button>
                </div>
              )}
              <div className="onvm-tagfeed">
                {(posts || []).map((post) => (
                  <PostCard key={post.id} post={post} onShare={(item) => setShareId(item.id)} />
                ))}
              </div>
            </>
          )}

          {tab === "people" && (
            <>
              {!people && <span className="onvm-discover__spinner" />}
              {people && others.length === 0 && (
                <div className="onvm-discover__empty">
                  <p>Tu es le premier membre ONVM de {commune} !</p>
                  <p>Invite tes amis du quartier avec ton lien ou ton QR code de profil.</p>
                </div>
              )}
              <ul className="onvm-nearby__people">
                {others.map((person) => (
                  <li key={person.id}>
                    <button type="button" onClick={() => navigate(`/profile/${person.id}`)}>
                      <img
                        src={person.profilePicture ? mediaUrl(person.profilePicture) : "/default-profile.svg"}
                        alt=""
                        data-avatar="true"
                      />
                      <span>
                        <strong>{person.username}</strong>
                        <small>
                          {person.posts} publication{person.posts > 1 ? "s" : ""}
                          {person.bio ? ` · ${person.bio}` : ""}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {shareId && (
        <ShareSheet
          type="p"
          id={shareId}
          title={`${commune} sur ONVM`}
          text={`Ça se passe à ${commune} sur ONVM`}
          currentUser={user}
          onClose={() => setShareId(null)}
        />
      )}

      <BottomNav />
    </main>
  );
}
