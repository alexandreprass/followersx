import { useState, useEffect } from "react";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  const [userData, setUserData] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [unfollowers, setUnfollowers] = useState([]);
  const [notFollowingBack, setNotFollowingBack] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("followers");
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    checkNeedsSync();
  }, []);

  const checkNeedsSync = async () => {
    try {
      const res = await fetch("/api/check-needs-sync");
      if (!res.ok) throw new Error();
      const data = await res.json();

      setNeedsSync(data.needsSync);
      setLastSync(data.lastSync);

      if (data.needsSync) {
        await startSync();
      } else {
        await loadAllData();
      }
    } catch {
      setError("Erro ao verificar sincronização");
      setLoading(false);
    }
  };

  const startSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-followers-paginado", {
        method: "POST",
      });

      if (!res.ok) throw new Error();

      setNeedsSync(false);
      setLastSync(new Date().toISOString());
      await loadAllData();
    } catch {
      setError("Erro ao sincronizar dados");
    } finally {
      setSyncing(false);
    }
  };

  const analyzeFollowers = async () => {
    setAnalyzing(true);
    await startSync();
    setActiveTab("unfollowers");
    setAnalyzing(false);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [userRes, followersRes, unfollowersRes, notFollowingRes] =
        await Promise.all([
          fetch("/api/user-profile"),
          fetch("/api/followers"),
          fetch("/api/unfollowers"),
          fetch("/api/not-following-back"),
        ]);

      if (userRes.ok) {
        const user = await userRes.json();
        setUserData(user.profile);
      }

      if (followersRes.ok) {
        const data = await followersRes.json();
        setFollowers(data.followers || []);
      }

      if (unfollowersRes.ok) {
        const data = await unfollowersRes.json();
        setUnfollowers(data.unfollowers || []);
      }

      if (notFollowingRes.ok) {
        const data = await notFollowingRes.json();
        setNotFollowingBack(data.notFollowingBack || []);
      }
    } catch {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  if (loading || syncing) {
    return (
      <div style={styles.center}>
        <h2>{syncing ? "Sincronizando..." : "Carregando..."}</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <h2>Erro</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Followers Tracker</h1>

      {userData && (
        <div style={styles.profileBox}>
          <img
            src={userData.profile_image_url}
            alt=""
            style={styles.avatar}
          />
          <div>
            <strong>{userData.name}</strong>
            <p>@{userData.username}</p>
          </div>
        </div>
      )}

      <div style={styles.tabs}>
        <button onClick={() => setActiveTab("followers")}>
          Seguidores ({followers.length})
        </button>
        <button onClick={() => setActiveTab("unfollowers")}>
          Unfollowers ({unfollowers.length})
        </button>
        <button onClick={() => setActiveTab("notFollowing")}>
          Não seguem ({notFollowingBack.length})
        </button>
      </div>

      <div style={styles.list}>
        {activeTab === "followers" &&
          followers.map((u) => <UserCard key={u.id} user={u} />)}

        {activeTab === "unfollowers" &&
          unfollowers.map((u) => <UserCard key={u.id} user={u} />)}

        {activeTab === "notFollowing" &&
          notFollowingBack.map((u) => <UserCard key={u.id} user={u} />)}
      </div>

      <div style={styles.actions}>
        <button onClick={analyzeFollowers}>
          {analyzing ? "Analisando..." : "Analisar"}
        </button>
        <button onClick={startSync}>
          {syncing ? "Sincronizando..." : "Atualizar"}
        </button>
      </div>
    </div>
  );
}

function UserCard({ user }) {
  return (
    <div style={styles.card}>
      <img src={user.profile_image_url} alt="" style={styles.smallAvatar} />
      <div>
        <strong>@{user.username}</strong>
        <p>{user.name}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "white",
    padding: 40,
    fontFamily: "system-ui",
  },
  title: {
    textAlign: "center",
    marginBottom: 30,
  },
  profileBox: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    justifyContent: "center",
    marginBottom: 30,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: "50%",
  },
  tabs: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },
  list: {
    maxWidth: 700,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  card: {
    display: "flex",
    gap: 15,
    background: "#1e293b",
    padding: 15,
    borderRadius: 12,
  },
  smallAvatar: {
    width: 45,
    height: 45,
    borderRadius: "50%",
  },
  actions: {
    position: "fixed",
    bottom: 30,
    right: 30,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  center: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  },
};
