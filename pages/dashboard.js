import { useState } from "react";

export default function Dashboard() {

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState([]);

  async function buscarNaoSeguidores() {

    setLoading(true);
    setResult([]);

    try {

      const res = await fetch("/api/not-following-back");
      const data = await res.json();

      setResult(data.data || []);

    } catch (err) {
      alert("Erro ao buscar dados");
    }

    setLoading(false);
  }

  return (
    <div style={{ padding: 20 }}>

      <h1>FollowersX</h1>

      <button onClick={buscarNaoSeguidores}>
        Buscar não seguidores
      </button>

      {loading && (
        <div style={{ textAlign: "center", marginTop: 20 }}>

          <div className="spinner" />

          <p>
            Carregando seguidores... <br />
            Isso pode levar alguns minutos na primeira vez.
          </p>

        </div>
      )}

      {!loading && result.length > 0 && (
        <ul>
          {result.map(user => (
            <li key={user.id}>
              @{user.username}
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}