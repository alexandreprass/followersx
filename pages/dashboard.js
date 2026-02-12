// pages/dashboard.js - VERSÃO MODERNA 2025
import { useState, useEffect } from 'react';

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
  const [activeTab, setActiveTab] = useState('followers');
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    checkNeedsSync();
  }, []);

  const checkNeedsSync = async () => {
    try {
      const res = await fetch('/api/check-needs-sync');
      if (res.ok) {
        const data = await res.json();
        setNeedsSync(data.needsSync);
        setLastSync(data.lastSync);

        if (data.needsSync) {
          await startSync();
        } else {
          await loadAllData();
        }
      } else {
        setError('Erro ao verificar sincronização');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao verificar sync:', err);
      setError('Erro ao conectar com servidor');
      setLoading(false);
    }
  };

  const startSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/sync-followers-paginado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok) {
        setNeedsSync(false);
        setLastSync(new Date().toISOString());
        await loadAllData();
      } else {
        setError(data.error || 'Erro na sincronização');
      }
    } catch (err) {
      setError('Erro ao sincronizar dados');
    } finally {
      setSyncing(false);
    }
  };

  const analyzeFollowers = async () => {
    setAnalyzing(true);
    try {
      await startSync();
      setActiveTab('unfollowers');
    } catch (err) {
      setError('Erro ao analisar seguidores');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [userRes, followersRes, unfollowersRes, notFollowingRes] = await Promise.all([
        fetch('/api/user-profile'),
        fetch('/api/followers'),
        fetch('/api/unfollowers'),
        fetch('/api/not-following-back'),
      ]);

      if (userRes.ok) {
        const { profile } = await userRes.json();
        setUserData(profile);
      }

      if (followersRes.ok) {
        const { followers: f } = await followersRes.json();
        setFollowers(f || []);
      }

      if (unfollowersRes.ok) {
        const { unfollowers: u } = await unfollowersRes.json();
        setUnfollowers(u || []);
      }

      if (notFollowingRes.ok) {
        const { notFollowingBack: n } = await notFollowingRes.json();
        setNotFollowingBack(n || []);
      }
    } catch (err) {
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId) => {
    if (!confirm('Tem certeza que deseja deixar de seguir este usuário?')) return;

    try {
      const res = await fetch('/api/unfollow-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      });

      if (res.ok) {
        await loadAllData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao deixar de seguir');
      }
    } catch (err) {
      alert('Erro ao deixar de seguir');
    }
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Nunca sincronizado';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now - date;
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 2) return 'Agora mesmo';
    if (mins < 60) return `${mins} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days === 1) return 'Ontem';
    return `${days} dias atrás`;
  };

  if (loading || syncing) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner}></div>
          <h2 style={styles.loadingText}>
            {syncing ? 'Sincronizando sua rede...' : 'Preparando dashboard'}
          </h2>
          <p style={styles.loadingSubtext}>
            {syncing ? 'Isso leva alguns segundos' : 'Aguarde um instante'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</span>
          <h2>Algo deu errado</h2>
          <p style={{ color: '#ff9b9b', margin: '1rem 0' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.retryButton}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerGradient}></div>

      <header style={styles.header}>
        <h1 style={styles.title}>🐦 Followers Tracker</h1>

        {userData && (
          <div style={styles.userCardMain}>
            <div style={styles.profileSection}>
              {userData.profile_image_url && (
                <img
                  src={userData.profile_image_url}
                  alt={userData.username}
                  style={styles.mainAvatar}
                />
              )}
              <div>
                <h3 style={styles.mainName}>{userData.name}</h3>
                <p style={styles.mainHandle}>@{userData.username}</p>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <strong>{userData.public_metrics?.followers_count || followers.length}</strong>
                <span>Seguidores</span>
              </div>
              <div style={styles.statBox}>
                <strong>{unfollowers.length}</strong>
                <span>Unfollowers</span>
              </div>
              <div style={styles.statBox}>
                <strong>{notFollowingBack.length}</strong>
                <span>Não seguem vc</span>
              </div>
            </div>

            <p style={styles.lastSyncText}>Atualizado {formatLastSync()}</p>
          </div>
        )}
      </header>

      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('followers')}
          style={{
            ...styles.tab,
            ...(activeTab === 'followers' ? styles.tabActive : {}),
          }}
        >
          Seguidores ({followers.length})
        </button>
        <button
          onClick={() => setActiveTab('unfollowers')}
          style={{
            ...styles.tab,
            ...(activeTab === 'unfollowers' ? styles.tabActive : {}),
          }}
        >
          Unfollowers ({unfollowers.length})
        </button>
        <button
          onClick={() => setActiveTab('notFollowing')}
          style={{
            ...styles.tab,
            ...(activeTab === 'notFollowing' ? styles.tabActive : {}),
          }}
        >
          Não seguem de volta ({notFollowingBack.length})
        </button>
      </div>

      <main style={styles.mainContent}>
        {activeTab === 'followers' && (
          <UserList users={followers} title="Seus Seguidores" />
        )}

        {activeTab === 'unfollowers' && (
          <UserList
            users={unfollowers}
            title="Quem parou de te seguir"
            showDate
            emptyMessage="Ninguém te deu unfollow recentemente 🎉"
          />
        )}

        {activeTab === 'notFollowing' && (
          <UserList
            users={notFollowingBack}
            title="Você segue, mas eles não"
            onUnfollow={handleUnfollow}
            emptyMessage="Todo mundo que você segue, te segue de volta ✨"
          />
        )}
      </main>

      <div style={styles.floatingActions}>
        <button
          onClick={analyzeFollowers}
          disabled={analyzing || syncing}
          style={{
            ...styles.actionBtn,
            ...styles.analyzeBtn,
            ...(analyzing || syncing ? styles.btnDisabled : {}),
          }}
        >
          {analyzing ? 'Analisando...' : 'Analisar agora'}
        </button>

        <button
          onClick={startSync}
          disabled={syncing || analyzing}
          style={{
            ...styles.actionBtn,
            ...styles.syncBtn,
            ...(syncing || analyzing ? styles.btnDisabled : {}),
          }}
        >
          {syncing ? 'Atualizando...' : 'Atualizar dados'}
        </button>
      </div>
    </div>
  );
}

function UserList({ users, title, showDate, onUnfollow, emptyMessage }) {
  if (!users?.length) {
    return (
      <div style={styles.emptyState}>
        <span style={styles.emptyEmoji}>{emptyMessage.includes('🎉') ? '🎉' : '✨'}</span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <section>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <div style={styles.grid}>
        {users.map((user) => (
          <div key={user.id} style={styles.userCard}>
            <div style={styles.userInner}>
              {user.profile_image_url && (
                <img
                  src={user.profile_image_url}
                  alt={user.username}
                  style={styles.cardAvatar}
                />
              )}
              <div style={styles.userInfo}>
                <span style={styles.username}>@{user.username}</span>
                <span style={styles.fullname}>{user.name}</span>
                {showDate && user.unfollowDate && (
                  <time style={styles.unfollowDate}>
                    Deixou de seguir em {new Date(user.unfollowDate).toLocaleDateString('pt-BR')}
                  </time>
                )}
              </div>
            </div>

            {onUnfollow && (
              <button
                onClick={() => onUnfollow(user.id)}
                style={styles.unfollowBtn}
              >
                Deixar de seguir
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f17 0%, #0a0a12 100%)',
    color: '#e0e0ff',
    padding: '2rem 1rem 120px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '180px',
    background: 'linear-gradient(180deg, #1a1aff 0%, transparent 70%)',
    opacity: 0.07,
    zIndex: 0,
  },
  header: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  title: {
    fontSize: '2.1rem',
    fontWeight: 700,
    margin: '0 0 1.8rem',
    background: 'linear-gradient(90deg, #60a5fa, #a5b4fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  userCardMain: {
    background: 'rgba(30, 30, 50, 0.55)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(100, 100, 255, 0.18)',
    borderRadius: '16px',
    padding: '1.8rem',
    maxWidth: '620px',
    margin: '0 auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2rem',
    marginBottom: '1.5rem',
    justifyContent: 'center',
  },
  mainAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: '3px solid rgba(96, 165, 250, 0.4)',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.25)',
  },
  mainName: {
    fontSize: '1.5rem',
    margin: 0,
    fontWeight: 600,
  },
  mainHandle: {
    color: '#a0a0ff',
    margin: '0.25rem 0 0',
    fontSize: '1.05rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: '1rem',
    margin: '1.5rem 0',
  },
  statBox: {
    background: 'rgba(20, 20, 40, 0.6)',
    borderRadius: '12px',
    padding: '1rem 0.8rem',
    textAlign: 'center',
    border: '1px solid rgba(80, 80, 180, 0.2)',
  },
  lastSyncText: {
    textAlign: 'center',
    color: '#9090c0',
    fontSize: '0.9rem',
    marginTop: '0.8rem',
  },
  tabsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.8rem',
    margin: '2rem 0 1.8rem',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '0.8rem 1.5rem',
    background: 'rgba(35, 35, 60, 0.6)',
    border: '1px solid rgba(100, 100, 180, 0.3)',
    borderRadius: '50px',
    color: '#c0c0ff',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.22s ease',
    backdropFilter: 'blur(6px)',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: 'white',
    borderColor: 'transparent',
    boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)',
    transform: 'translateY(-2px)',
  },
  mainContent: {
    maxWidth: '860px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '1.45rem',
    margin: '0 0 1.2rem',
    color: '#d0d0ff',
    fontWeight: 600,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  userCard: {
    background: 'rgba(28, 28, 45, 0.7)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(90, 90, 160, 0.25)',
    borderRadius: '14px',
    padding: '1.1rem 1.3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.18s ease',
    ':hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
      borderColor: 'rgba(120, 120, 220, 0.4)',
    },
  },
  userInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
  },
  cardAvatar: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    border: '2px solid rgba(80, 80, 180, 0.3)',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: '1.05rem',
    fontWeight: 600,
    display: 'block',
    color: '#e0e0ff',
  },
  fullname: {
    color: '#b0b0e0',
    fontSize: '0.92rem',
    display: 'block',
    marginTop: '0.15rem',
  },
  unfollowDate: {
    color: '#ff9aaa',
    fontSize: '0.8rem',
    marginTop: '0.4rem',
    display: 'block',
  },
  unfollowBtn: {
    padding: '0.6rem 1.2rem',
    background: 'rgba(239, 68, 68, 0.8)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    ':hover': {
      background: '#ef4444',
      transform: 'scale(1.05)',
    },
  },
  floatingActions: {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    zIndex: 10,
  },
  actionBtn: {
    padding: '0.9rem 1.6rem',
    border: 'none',
    borderRadius: '50px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
    transition: 'all 0.25s ease',
  },
  analyzeBtn: {
    background: 'linear-gradient(135deg, #10b981, #34d399)',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)',
    ':hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 12px 35px rgba(16, 185, 129, 0.5)',
    },
  },
  syncBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.35)',
    ':hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 12px 35px rgba(59, 130, 246, 0.5)',
    },
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    transform: 'none !important',
    boxShadow: 'none !important',
  },
  loadingOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10,10,20,0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  spinner: {
    width: '64px',
    height: '64px',
    border: '6px solid rgba(100,100,255,0.2)',
    borderTop: '6px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1.5rem',
  },
  loadingText: {
    fontSize: '1.6rem',
    margin: '0 0 0.6rem',
    color: '#d0d0ff',
  },
  loadingSubtext: {
    color: '#9090c0',
    fontSize: '1.05rem',
  },
  errorCard: {
    background: 'rgba(40,20,20,0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid #7f1d1d',
    borderRadius: '16px',
    padding: '3rem 2rem',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '8rem auto',
  },
  retryButton: {
    marginTop: '1.5rem',
    padding: '0.9rem 2rem',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '5rem 1rem',
    color: '#a0a0c0',
  },
  emptyEmoji: {
    fontSize: '4.5rem',
    display: 'block',
    marginBottom: '1rem',
  },
};

// Não esqueça de adicionar isso no seu global CSS ou em um <style> tag se necessário:
const keyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
