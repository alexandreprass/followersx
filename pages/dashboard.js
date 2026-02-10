// pages/dashboard.js
// MELHORADO: Feedback visual em tempo real durante sincronização
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [lastSyncInfo, setLastSyncInfo] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [unfollowers, setUnfollowers] = useState([]);
  const [notFollowingBack, setNotFollowingBack] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stats');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(''); // NOVO: Status da sincronização
  const [syncProgress, setSyncProgress] = useState(''); // NOVO: Progresso detalhado
  const [unfollowingBulk, setUnfollowingBulk] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadLastSync();
    loadUserData();
  }, []);

  const loadUserProfile = async () => {
    try {
      const res = await fetch('/api/user-profile');
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile);
        console.log('Perfil carregado:', data.profile);
      } else {
        console.error('Erro ao carregar perfil:', await res.text());
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  const loadLastSync = async () => {
    try {
      const res = await fetch('/api/get-last-sync');
      if (res.ok) {
        const data = await res.json();
        setLastSyncInfo(data);
        console.log('Última sincronização:', data);
      }
    } catch (err) {
      console.error('Erro ao carregar última sincronização:', err);
    }
  };

  const loadUserData = async () => {
    try {
      const followersRes = await fetch('/api/followers');
      if (followersRes.ok) {
        const data = await followersRes.json();
        setFollowers(data.followers || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setLoading(false);
    }
  };

  // MELHORADO: Sincronização com feedback visual em tempo real
  const syncFollowers = async () => {
    setSyncing(true);
    setSyncStatus('🔄 ATUALIZANDO...');
    setSyncProgress('Conectando à API do X...');
    
    try {
      // Simular etapas do processo para melhor UX
      setTimeout(() => setSyncProgress('Autenticando usuário...'), 500);
      setTimeout(() => setSyncProgress('Buscando lista de seguidores...'), 1500);
      setTimeout(() => setSyncProgress('Processando dados (isso pode levar alguns segundos)...'), 3000);
      
      const res = await fetch('/api/sync-followers', {
        method: 'POST',
      });
      const data = await res.json();
      
      if (res.status === 429) {
        // Limite de frequência atingido
        setSyncStatus('⏳ AGUARDE');
        setSyncProgress('');
        alert(data.message + '\n\nPróxima atualização disponível em: ' + data.nextUpdateIn);
      } else if (res.ok) {
        // Sincronização bem-sucedida
        const totalFollowers = data.totalFollowers || 0;
        const newFollowersCount = data.newFollowers || 0;
        const unfollowersCount = data.unfollowersCount || 0;
        
        setSyncStatus('✅ ATUALIZADO COM SUCESSO!');
        setSyncProgress(`${totalFollowers.toLocaleString('pt-BR')} seguidores encontrados`);
        
        // Mostrar mensagem detalhada
        let detailMessage = `🎉 Atualização concluída!\n\n`;
        detailMessage += `📊 Total de seguidores: ${totalFollowers.toLocaleString('pt-BR')}\n`;
        
        if (newFollowersCount > 0) {
          detailMessage += `🆕 Novos seguidores: +${newFollowersCount}\n`;
        }
        
        if (unfollowersCount > 0) {
          detailMessage += `👋 Unfollowers: ${unfollowersCount}\n`;
        }
        
        detailMessage += `\n⏰ Volte mais tarde para atualizar novamente!`;
        
        alert(detailMessage);
        
        // Recarregar dados
        await loadUserData();
        await loadLastSync();
        
        // Manter mensagem de sucesso por 3 segundos
        setTimeout(() => {
          setSyncStatus('');
          setSyncProgress('');
        }, 3000);
        
      } else {
        setSyncStatus('❌ ERRO');
        setSyncProgress('');
        alert('Erro: ' + (data.error || 'Erro desconhecido') + '\n\n' + (data.message || ''));
      }
    } catch (err) {
      setSyncStatus('❌ ERRO');
      setSyncProgress('');
      alert('Erro ao sincronizar: ' + err.message);
    }
    
    setSyncing(false);
  };

  const loadUnfollowers = async () => {
    setLoading(true);
    try {
      const userId = '2696187636'; // Pegar do cookie depois
      const res = await fetch(`/api/unfollowers?userId=${userId}`);
      const data = await res.json();
      setUnfollowers(data.history || []);
    } catch (err) {
      console.error('Erro:', err);
    }
    setLoading(false);
  };

  const loadNotFollowingBack = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/not-following-back');
      const data = await res.json();
      setNotFollowingBack(data.notFollowingBack || []);
    } catch (err) {
      console.error('Erro:', err);
    }
    setLoading(false);
  };

  const unfollowBulk = async () => {
    if (!confirm(`Tem certeza que deseja deixar de seguir ${notFollowingBack.length} pessoas?`)) {
      return;
    }

    setUnfollowingBulk(true);
    try {
      const userIds = notFollowingBack.map(u => u.id);
      const res = await fetch('/api/unfollow-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });
      
      const data = await res.json();
      alert(data.message);
      setNotFollowingBack([]);
    } catch (err) {
      alert('Erro: ' + err.message);
    }
    setUnfollowingBulk(false);
  };

  const logout = () => {
    document.cookie = 'accessToken=; Max-Age=0; path=/';
    document.cookie = 'refreshToken=; Max-Age=0; path=/';
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Carregando...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Followers Tracker</h1>
        <button onClick={logout} style={styles.logoutBtn}>Sair</button>
      </div>

      {/* Card de Perfil do Usuário */}
      {userProfile && (
        <div style={styles.profileCard}>
          <img 
            src={userProfile.profile_image_url?.replace('_normal', '_400x400') || userProfile.profile_image_url} 
            alt={userProfile.name}
            style={styles.profileImage}
          />
          <div style={styles.profileInfo}>
            <h2 style={styles.profileName}>{userProfile.name}</h2>
            <p style={styles.profileUsername}>@{userProfile.username}</p>
            <p style={styles.profileId}>ID: {userProfile.id}</p>
          </div>
          <div style={styles.profileMetrics}>
            <div style={styles.metricItem}>
              <div style={styles.metricNumber}>{userProfile.public_metrics?.followers_count?.toLocaleString('pt-BR') || 0}</div>
              <div style={styles.metricLabel}>Seguidores</div>
            </div>
            <div style={styles.metricItem}>
              <div style={styles.metricNumber}>{userProfile.public_metrics?.following_count?.toLocaleString('pt-BR') || 0}</div>
              <div style={styles.metricLabel}>Seguindo</div>
            </div>
            <div style={styles.metricItem}>
              <div style={styles.metricNumber}>{userProfile.public_metrics?.tweet_count?.toLocaleString('pt-BR') || 0}</div>
              <div style={styles.metricLabel}>Posts</div>
            </div>
          </div>
        </div>
      )}

      {/* NOVO: Card de Status da Sincronização */}
      {syncing && (
        <div style={styles.syncStatusCard}>
          <div style={styles.syncStatusText}>{syncStatus}</div>
          <div style={styles.syncProgressText}>{syncProgress}</div>
          <div style={styles.loadingBar}>
            <div style={styles.loadingBarFill}></div>
          </div>
        </div>
      )}

      {/* Card de Última Sincronização */}
      {lastSyncInfo && !syncing && (
        <div style={styles.lastSyncCard}>
          {lastSyncInfo.lastSync ? (
            <>
              <span style={styles.lastSyncLabel}>📅 Última atualização: </span>
              <span style={styles.lastSyncValue}>{lastSyncInfo.lastSyncFormatted}</span>
              <span style={styles.lastSyncStatus}>
                {lastSyncInfo.canUpdate 
                  ? ' ✅ Você pode atualizar agora!' 
                  : ` ⏳ Aguarde ${lastSyncInfo.hoursRemaining}h para próxima atualização`
                }
              </span>
            </>
          ) : (
            <span style={styles.lastSyncLabel}>🆕 Primeira vez aqui? Clique em "Atualizar Dados" para começar!</span>
          )}
        </div>
      )}

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{followers.length}</div>
          <div style={styles.statLabel}>Seguidores</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{unfollowers.length}</div>
          <div style={styles.statLabel}>Unfollowers (30d)</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{notFollowingBack.length}</div>
          <div style={styles.statLabel}>Não seguem de volta</div>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setTab('stats')}
          style={{ ...styles.tab, ...(tab === 'stats' ? styles.tabActive : {}) }}
        >
          📈 Estatísticas
        </button>
        <button
          onClick={() => { setTab('unfollowers'); loadUnfollowers(); }}
          style={{ ...styles.tab, ...(tab === 'unfollowers' ? styles.tabActive : {}) }}
        >
          👋 Unfollowers
        </button>
        <button
          onClick={() => { setTab('notfollowing'); loadNotFollowingBack(); }}
          style={{ ...styles.tab, ...(tab === 'notfollowing' ? styles.tabActive : {}) }}
        >
          ❌ Não me seguem
        </button>
      </div>

      <div style={styles.content}>
        {tab === 'stats' && (
          <div>
            <h2 style={styles.subtitle}>Bem-vindo ao seu Dashboard!</h2>
            <p style={styles.text}>
              Você tem {followers.length.toLocaleString('pt-BR')} seguidores atualmente.
            </p>
            <button
              onClick={syncFollowers}
              disabled={syncing}
              style={{
                ...styles.button,
                opacity: syncing ? 0.7 : 1,
                cursor: syncing ? 'not-allowed' : 'pointer',
              }}
            >
              {syncing ? '⏳ Sincronizando...' : '🔄 Atualizar Dados'}
            </button>
            
            <div style={styles.info}>
              <h3>Como usar:</h3>
              <ul style={{ textAlign: 'left', marginTop: '1rem' }}>
                <li>👋 <strong>Unfollowers</strong>: Veja quem deixou de te seguir nos últimos 30 dias</li>
                <li>❌ <strong>Não me seguem</strong>: Veja quem você segue mas não te segue de volta</li>
                <li>🔄 <strong>Atualizar Dados</strong>: Sincroniza seus seguidores e detecta mudanças</li>
              </ul>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                💡 <strong>Dica:</strong> Você pode atualizar seus dados a cada 12 horas para monitorar mudanças.
              </p>
            </div>
          </div>
        )}

        {tab === 'unfollowers' && (
          <div>
            <h2 style={styles.subtitle}>Histórico de Unfollowers (últimos 30 dias)</h2>
            {unfollowers.length === 0 ? (
              <p style={styles.text}>✨ Nenhum unfollower detectado nos últimos 30 dias!</p>
            ) : (
              <div style={styles.list}>
                {unfollowers.map((person, idx) => (
                  <div key={idx} style={styles.listItem}>
                    <img
                      src={person.profile_image_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'}
                      alt={person.username}
                      style={styles.avatar}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={styles.name}>{person.name}</div>
                      <div style={styles.username}>@{person.username}</div>
                    </div>
                    <div style={styles.unfollowDate}>
                      {new Date(person.unfollowedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'notfollowing' && (
          <div>
            <h2 style={styles.subtitle}>Pessoas que não te seguem de volta</h2>
            {notFollowingBack.length === 0 ? (
              <p style={styles.text}>✨ Todas as pessoas que você segue te seguem de volta!</p>
            ) : (
              <>
                <button
                  onClick={unfollowBulk}
                  disabled={unfollowingBulk}
                  style={styles.dangerButton}
                >
                  {unfollowingBulk ? 'Processando...' : `Deixar de seguir todos (${notFollowingBack.length})`}
                </button>
                <div style={styles.list}>
                  {notFollowingBack.map((person, idx) => (
                    <div key={idx} style={styles.listItem}>
                      <img
                        src={person.profile_image_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'}
                        alt={person.username}
                        style={styles.avatar}
                      />
                      <div>
                        <div style={styles.name}>{person.name}</div>
                        <div style={styles.username}>@{person.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto 2rem',
  },
  title: {
    fontSize: '2.5rem',
    margin: 0,
  },
  logoutBtn: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '20px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto 3rem',
  },
  statCard: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '15px',
    padding: '2rem',
    textAlign: 'center',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  statNumber: {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  statLabel: {
    fontSize: '1rem',
    opacity: 0.9,
  },
  tabs: {
    display: 'flex',
    gap: '1rem',
    maxWidth: '1200px',
    margin: '0 auto 2rem',
    flexWrap: 'wrap',
  },
  tab: {
    flex: 1,
    minWidth: '150px',
    padding: '1rem 2rem',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'all 0.3s',
  },
  tabActive: {
    background: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '2rem',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  subtitle: {
    fontSize: '2rem',
    marginBottom: '1.5rem',
  },
  text: {
    fontSize: '1.1rem',
    marginBottom: '1.5rem',
    opacity: 0.95,
  },
  button: {
    padding: '12px 30px',
    background: '#1d9bf0',
    border: 'none',
    borderRadius: '25px',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  dangerButton: {
    padding: '12px 30px',
    background: '#dc2626',
    border: 'none',
    borderRadius: '25px',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '2rem',
  },
  info: {
    marginTop: '3rem',
    padding: '2rem',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
  },
  name: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  username: {
    fontSize: '0.95rem',
    opacity: 0.8,
  },
  unfollowDate: {
    fontSize: '0.85rem',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '2rem',
  },
  // Card de Perfil
  profileCard: {
    maxWidth: '1200px',
    margin: '0 auto 2rem',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    border: '1px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  profileImage: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.3)',
    objectFit: 'cover',
  },
  profileInfo: {
    flex: '1',
    minWidth: '200px',
  },
  profileName: {
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: '0 0 0.5rem 0',
  },
  profileUsername: {
    fontSize: '1.3rem',
    opacity: 0.85,
    margin: '0 0 0.5rem 0',
  },
  profileId: {
    fontSize: '0.9rem',
    opacity: 0.6,
    margin: 0,
    fontFamily: 'monospace',
  },
  profileMetrics: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  metricItem: {
    textAlign: 'center',
    minWidth: '100px',
  },
  metricNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.3rem',
  },
  metricLabel: {
    fontSize: '0.9rem',
    opacity: 0.8,
  },
  // Card de Última Sincronização
  lastSyncCard: {
    maxWidth: '1200px',
    margin: '0 auto 2rem',
    background: 'rgba(29, 155, 240, 0.15)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '1rem 1.5rem',
    border: '1px solid rgba(29, 155, 240, 0.3)',
    textAlign: 'center',
    fontSize: '1rem',
  },
  lastSyncLabel: {
    fontWeight: '500',
    opacity: 0.9,
  },
  lastSyncValue: {
    fontWeight: 'bold',
    margin: '0 0.5rem',
  },
  lastSyncStatus: {
    fontSize: '0.95rem',
    opacity: 0.85,
  },
  // NOVOS: Card de Status da Sincronização em Tempo Real
  syncStatusCard: {
    maxWidth: '1200px',
    margin: '0 auto 2rem',
    background: 'rgba(29, 155, 240, 0.25)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    border: '2px solid rgba(29, 155, 240, 0.5)',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(29, 155, 240, 0.3)',
  },
  syncStatusText: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    animation: 'pulse 2s ease-in-out infinite',
  },
  syncProgressText: {
    fontSize: '1.1rem',
    opacity: 0.9,
    marginBottom: '1.5rem',
  },
  loadingBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #1d9bf0, #00d4ff)',
    animation: 'loading 2s ease-in-out infinite',
    borderRadius: '10px',
  },
};

// Adicionar animações CSS no head (inject via useEffect ou global CSS)
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    @keyframes loading {
      0% { width: 0%; }
      50% { width: 70%; }
      100% { width: 100%; }
    }
  `;
  document.head.appendChild(style);
}