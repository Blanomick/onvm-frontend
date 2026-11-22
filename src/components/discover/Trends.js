import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiHash, FiSearch, FiTrendingUp } from "react-icons/fi";
import BottomNav from "../BottomNav";
import { normalizeTag } from "./RichText";
import "./Discover.css";

const apiUrl = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

// Page « Tendances » : hashtags les plus utilisés en ce moment
export default function Trends() {
  const navigate = useNavigate();
  const [trends, setTrends] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${apiUrl}/api/discover/trends?limit=30`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setTrends)
      .catch(() => setError("Impossible de charger les tendances."));
  }, []);

  const search = (event) => {
    event.preventDefault();
    const tag = normalizeTag(query.trim().split(/\s+/)[0] || "");
    if (tag.length >= 2) navigate(`/hashtag/${encodeURIComponent(tag)}`);
  };

  return (
    <main className="onvm-discover">
      <header className="onvm-discover__top">
        <button type="button" onClick={() => navigate(-1)} aria-label="Retour">
          <FiArrowLeft />
        </button>
        <h1>Tendances</h1>
        <span />
      </header>

      <form className="onvm-discover__search" onSubmit={search}>
        <FiSearch />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher un #hashtag"
          enterKeyHint="search"
        />
      </form>

      {error && <p className="onvm-discover__empty">{error}</p>}
      {!trends && !error && <span className="onvm-discover__spinner" />}

      {trends && trends.length === 0 && (
        <div className="onvm-discover__empty">
          <FiHash size={34} />
          <p>Pas encore de tendance.</p>
          <p>Ajoute des #hashtags à tes publications, par exemple #Abidjan ou #Yopougon !</p>
        </div>
      )}

      <ol className="onvm-trends">
        {(trends || []).map((item, index) => (
          <li key={item.tag}>
            <button type="button" onClick={() => navigate(`/hashtag/${encodeURIComponent(item.tag)}`)}>
              <span className="onvm-trends__rank">{index + 1}</span>
              <span className="onvm-trends__body">
                <strong>#{item.tag}</strong>
                <small>
                  {item.posts} publication{item.posts > 1 ? "s" : ""}
                </small>
              </span>
              {index < 3 && <FiTrendingUp className="onvm-trends__hot" />}
            </button>
          </li>
        ))}
      </ol>

      <BottomNav />
    </main>
  );
}
