// pages/dashboard.js
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  const [userData, setUserData] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [unfollowers, setUnfollowers] = useState([]);
  const [notFollowingBack, setNotFollowingBack] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('followers');

  // Verifica se precisa fazer sync inicial
  useEffect(() => {
    checkNeedsSync();
  }, []);

  const checkNeedsSync = async () => {
    try {
      const res = await fetch('/api/check-needs-sync');
      if (res.ok) {
        const data = await res.json();
        setNeedsSync(data.needsSync);
        
        if (data.needsSync) {
          // Se precisa sync, inicia automaticamente
          await startSync();
        } else {
          // Se não precisa, carrega os dados
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
      // ✅ CORREÇÃO: Usar POST em vez de GET
      const res = await fetch('/api/sync-followers-paginado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (res.ok) {
        console.log('Sincronização concluída:', data);
        setNeedsSync(false);
        await loadAllData();
      } else {
        setError(data.error || 'Erro na sincronização');
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setError('Erro ao sincronizar dados');
    } finally {
      setSyncing(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Carrega perfil do usuário
      const userRes = await fetch('/api/user-profile');
      if (userRes.ok) {
        const user = await userRes.json();
        setUserData(user);
      }

      // Carrega seguidores
      const followersRes = await fetch('/api/followers');
      if (followersRes.ok) {
        const data = await followersRes.json();
        setFollowers(data.followers || []);
      }

      // Carrega unfollowers
      const unfollowersRes = await fetch('/api/unfollowers');
      if (unfollowersRes.ok) {
        const data = await unfollowersRes.json();
        setUnfollowers(data.unfollowers || []);
      }

      // Carrega quem não segue de volta
      const notFollowingRes = await fetch('/api/not-following-back');
      if (notFollowingRes.ok) {
        const data = await notFollowingRes.json();
        setNotFollowingBack(data.notFollowingBack || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
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
        body: JSON.stringify({ userIds: [userId] })
      });
      
      if (res.ok) {
        // Recarrega os dados
        await loadAllData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao deixar de seguir');
      }
    } catch (err) {
      console.error('Erro ao deixar de seguir:', err);
      alert('Erro ao deixar de seguir');
    }
  };

  if (loading || syncing) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <h2>{syncing ? 'Sincronizando seus dados...' : 'Carregando...'}</h2>
          <p>{syncing ? 'Isso pode levar alguns segundos' : 'Aguarde'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Erro</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.button}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Followers Tracker</h1>
        {userData && (
          <div style={styles.userInfo}>
            <p><strong>@{userData.username}</strong></p>
            <p>{userData.followersCount} seguidores</p>
          </div>
        )}
      </header>

      <div style={styles.tabs}>
        <button 
          onClick={() => setActiveTab('followers')}
          style={{...styles.tab, ...(activeTab === 'followers' ? styles.activeTab : {})}}
        >
          Seguidores ({followers.length})
        </button>
        <button 
          onClick={() => setActiveTab('unfollowers')}
          style={{...styles.tab, ...(activeTab === 'unfollowers' ? styles.activeTab : {})}}
        >
          Unfollowers ({unfollowers.length})
        </button>
        <button 
          onClick={() => setActiveTab('notFollowing')}
          style={{...styles.tab, ...(activeTab === 'notFollowing' ? styles.activeTab : {})}}
        >
          Não seguem de volta ({notFollowingBack.length})
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'followers' && (
          <UserList users={followers} title="Seus Seguidores" />
        )}
        {activeTab === 'unfollowers' && (
          <UserList users={unfollowers} title="Quem deixou de te seguir" showDate />
        )}
        {activeTab === 'notFollowing' && (
          <UserList 
            users={notFollowingBack} 
            title="Você segue, mas não te seguem de volta" 
            onUnfollow={handleUnfollow}
          />
        )}
      </div>

      <button onClick={startSync} style={styles.syncButton}>
        🔄 Sincronizar Agora
      </button>
    </div>
  );
}

function UserList({ users, title, showDate, onUnfollow }) {
  if (!users || users.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>Nenhum usuário encontrado</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.listTitle}>{title}</h2>
      <div style={styles.userList}>
        {users.map(user => (
          <div key={user.id} style={styles.userCard}>
            <div style={styles.userCardInfo}>
              <strong>@{user.username}</strong>
              <p style={styles.userName}>{user.name}</p>
              {showDate && user.unfollowDate && (
                <small style={styles.date}>
                  {new Date(user.unfollowDate).toLocaleDateString('pt-BR')}
                </small>
              )}
            </div>
            {onUnfollow && (
              <button 
                onClick={() => onUnfollow(user.id)}
                style={styles.unfollowButton}
              >
                Deixar de seguir
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#000',
    color: '#fff',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    borderBottom: '1px solid #333',
    paddingBottom: '20px',
  },
  userInfo: {
    marginTop: '10px',
  },
  loading: {
    textAlign: 'center',
    paddingTop: '100px',
  },
  error: {
    textAlign: 'center',
    paddingTop: '100px',
    color: '#ff6b6b',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '10px 20px',
    background: '#1a1a1a',
    border: '1px solid #333',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '14px',
  },
  activeTab: {
    background: '#1d9bf0',
    borderColor: '#1d9bf0',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  listTitle: {
    marginBottom: '20px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  userCard: {
    background: '#1a1a1a',
    padding: '15px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #333',
  },
  userCardInfo: {
    flex: 1,
  },
  userName: {
    color: '#999',
    margin: '5px 0',
    fontSize: '14px',
  },
  date: {
    color: '#666',
    fontSize: '12px',
  },
  unfollowButton: {
    padding: '8px 16px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  syncButton: {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    padding: '15px 25px',
    background: '#1d9bf0',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(29, 155, 240, 0.4)',
  },
  button: {
    padding: '12px 24px',
    background: '#1d9bf0',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
};
