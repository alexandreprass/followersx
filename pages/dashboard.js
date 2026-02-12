// pages/dashboard.js - VERSÃO MELHORADA
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
        setLastSync(data.lastSync);
        
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
      const res = await fetch('/api/sync-followers-paginado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (res.ok) {
        console.log('Sincronização concluída:', data);
        setNeedsSync(false);
        setLastSync(new Date().toISOString());
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

  const analyzeFollowers = async () => {
    setAnalyzing(true);
    setError(null);
    
    try {
      await startSync();
      setActiveTab('unfollowers'); // Muda para aba de unfollowers após análise
    } catch (err) {
      console.error('Erro ao analisar:', err);
      setError('Erro ao analisar seguidores');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Carrega perfil do usuário
      const userRes = await fetch('/api/user-profile');
      if (userRes.ok) {
        const user = await userRes.json();
        setUserData(user.profile);
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

  const formatLastSync = () => {
    if (!lastSync) return 'Nunca';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'Ontem';
    return `${diffDays} dias atrás`;
  };

  if (loading || syncing) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
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
          <h2>❌ Erro</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.button}>
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>🐦 Followers Tracker</h1>
        {userData && (
          <div style={styles.userInfo}>
            <div style={styles.userProfile}>
              {userData.profile_image_url && (
                <img 
                  src={userData.profile_image_url} 
                  alt={userData.username}
                  style={styles.avatar}
                />
              )}
              <div>
                <p style={styles.userName}><strong>{userData.name}</strong></p>
                <p style={styles.userHandle}>@{userData.username}</p>
              </div>
            </div>
            
            <div style={styles.stats}>
              <div style={styles.statItem}>
                <strong>{userData.public_metrics?.followers_count || followers.length}</strong>
                <span>Seguidores</span>
              </div>
              <div style={styles.statItem}>
                <strong>{unfollowers.length}</strong>
                <span>Unfollowers</span>
              </div>
              <div style={styles.statItem}>
                <strong>{notFollowingBack.length}</strong>
                <span>Não seguem de volta</span>
              </div>
            </div>

            <div style={styles.lastSync}>
              <small>Última atualização: {formatLastSync()}</small>
            </div>
          </div>
        )}
      </header>

      <div style={styles.tabs}>
        <button 
          onClick={() => setActiveTab('followers')}
          style={{...styles.tab, ...(activeTab === 'followers' ? styles.activeTab : {})}}
        >
          👥 Seguidores ({followers.length})
        </button>
        <button 
          onClick={() => setActiveTab('unfollowers')}
          style={{...styles.tab, ...(activeTab === 'unfollowers' ? styles.activeTab : {})}}
        >
          💔 Unfollowers ({unfollowers.length})
        </button>
        <button 
          onClick={() => setActiveTab('notFollowing')}
          style={{...styles.tab, ...(activeTab === 'notFollowing' ? styles.activeTab : {})}}
        >
          👻 Não seguem de volta ({notFollowingBack.length})
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'followers' && (
          <UserList users={followers} title="Seus Seguidores Atuais" />
        )}
        {activeTab === 'unfollowers' && (
          <UserList 
            users={unfollowers} 
            title="Quem deixou de te seguir" 
            showDate 
            emptyMessage="🎉 Ninguém deixou de te seguir recentemente!"
          />
        )}
        {activeTab === 'notFollowing' && (
          <UserList 
            users={notFollowingBack} 
            title="Você segue, mas não te seguem de volta" 
            onUnfollow={handleUnfollow}
            emptyMessage="✨ Todos que você segue te seguem de volta!"
          />
        )}
      </div>

      <div style={styles.actionButtons}>
        <button 
          onClick={analyzeFollowers} 
          style={{...styles.analyzeButton, ...(analyzing ? styles.buttonDisabled : {})}}
          disabled={analyzing || syncing}
        >
          {analyzing ? '⏳ Analisando...' : '🔍 Analisar Seguidores'}
        </button>
        
        <button 
          onClick={startSync} 
          style={{...styles.syncButton, ...(syncing ? styles.buttonDisabled : {})}}
          disabled={syncing || analyzing}
        >
          {syncing ? '⏳ Sincronizando...' : '🔄 Atualizar Dados'}
        </button>
      </div>
    </div>
  );
}

function UserList({ users, title, showDate, onUnfollow, emptyMessage }) {
  if (!users || users.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyIcon}>
          {emptyMessage?.includes('🎉') ? '🎉' : 
           emptyMessage?.includes('✨') ? '✨' : '📭'}
        </p>
        <p>{emptyMessage || 'Nenhum usuário encontrado'}</p>
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
              {user.profile_image_url && (
                <img 
                  src={user.profile_image_url} 
                  alt={user.username}
                  style={styles.userAvatar}
                />
              )}
              <div style={styles.userDetails}>
                <strong style={styles.userCardName}>@{user.username}</strong>
                <p style={styles.userFullName}>{user.name}</p>
                {showDate && user.unfollowDate && (
                  <small style={styles.date}>
                    💔 Deixou de seguir em: {new Date(user.unfollowDate).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </small>
                )}
              </div>
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
    paddingBottom: '100px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    borderBottom: '1px solid #333',
    paddingBottom: '20px',
  },
  userInfo: {
    marginTop: '20px',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '20px',
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '2px solid #1d9bf0',
  },
  userName: {
    margin: '0',
    fontSize: '18px',
  },
  userHandle: {
    margin: '5px 0 0 0',
    color: '#8b98a5',
    fontSize: '14px',
  },
  stats: {
    display: 'flex',
    gap: '30px',
    justifyContent: 'center',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  },
  lastSync: {
    marginTop: '15px',
    color: '#8b98a5',
  },
  loading: {
    textAlign: 'center',
    paddingTop: '100px',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #333',
    borderTop: '5px solid #1d9bf0',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
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
    padding: '12px 20px',
    background: '#1a1a1a',
    border: '1px solid #333',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: '#1d9bf0',
    borderColor: '#1d9bf0',
    transform: 'scale(1.05)',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  listTitle: {
    marginBottom: '20px',
    fontSize: '22px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userCard: {
    background: '#1a1a1a',
    padding: '15px',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #333',
    transition: 'all 0.2s',
  },
  userCardInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  userAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '2px solid #333',
  },
  userDetails: {
    flex: 1,
  },
  userCardName: {
    display: 'block',
    fontSize: '16px',
    marginBottom: '4px',
  },
  userFullName: {
    color: '#8b98a5',
    margin: '0',
    fontSize: '14px',
  },
  date: {
    color: '#8b98a5',
    fontSize: '12px',
    display: 'block',
    marginTop: '6px',
  },
  unfollowButton: {
    padding: '8px 16px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
  actionButtons: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    gap: '10px',
    flexDirection: 'column',
  },
  analyzeButton: {
    padding: '15px 25px',
    background: '#10a37f',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(16, 163, 127, 0.4)',
    transition: 'all 0.2s',
  },
  syncButton: {
    padding: '15px 25px',
    background: '#1d9bf0',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(29, 155, 240, 0.4)',
    transition: 'all 0.2s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
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
    color: '#8b98a5',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
};