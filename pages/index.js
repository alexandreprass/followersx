import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [unfollowers, setUnfollowers] = useState([]);
  const [notFollowingBack, setNotFollowingBack] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userData = localStorage.getItem('twitter_user');
    if (userData) {
      setUser(JSON.parse(userData));
      loadStoredData();
    }
  };

  const loadStoredData = () => {
    const storedFollowers = localStorage.getItem('followers');
    const storedHistory = localStorage.getItem('unfollowers_history');
    
    if (storedFollowers) {
      setFollowers(JSON.parse(storedFollowers));
    }
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  };

  const handleLogin = async () => {
    // Simulação de login - você precisará implementar OAuth real
    const mockUser = {
      id: '1234567890',
      username: 'usuario_teste',
      name: 'Usuário Teste',
      followers_count: 1000,
      following_count: 500
    };
    
    localStorage.setItem('twitter_user', JSON.stringify(mockUser));
    setUser(mockUser);
    
    // Simular carregamento inicial de seguidores
    await fetchFollowers();
  };

  const fetchFollowers = async () => {
    setLoading(true);
    
    try {
      // Aqui você fará a chamada real para a API do Twitter
      const response = await fetch('/api/followers');
      const data = await response.json();
      
      // Verificar unfollowers
      const storedFollowers = localStorage.getItem('followers');
      if (storedFollowers) {
        const previousFollowers = JSON.parse(storedFollowers);
        const currentFollowerIds = data.followers.map(f => f.id);
        const previousFollowerIds = previousFollowers.map(f => f.id);
        
        const newUnfollowers = previousFollowers.filter(
          f => !currentFollowerIds.includes(f.id)
        );
        
        if (newUnfollowers.length > 0) {
          updateUnfollowersHistory(newUnfollowers);
        }
      }
      
      setFollowers(data.followers);
      localStorage.setItem('followers', JSON.stringify(data.followers));
      
    } catch (error) {
      console.error('Erro ao buscar seguidores:', error);
    }
    
    setLoading(false);
  };

  const updateUnfollowersHistory = (newUnfollowers) => {
    const storedHistory = localStorage.getItem('unfollowers_history');
    let history = storedHistory ? JSON.parse(storedHistory) : [];
    
    const timestamp = new Date().toISOString();
    const newEntries = newUnfollowers.map(user => ({
      ...user,
      unfollowed_at: timestamp
    }));
    
    history = [...newEntries, ...history];
    
    // Manter apenas últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    history = history.filter(entry => 
      new Date(entry.unfollowed_at) > thirtyDaysAgo
    );
    
    localStorage.setItem('unfollowers_history', JSON.stringify(history));
    setHistory(history);
  };

  const checkNotFollowingBack = async () => {
    setLoading(true);
    setActiveTab('not-following-back');
    
    try {
      const response = await fetch('/api/not-following-back');
      const data = await response.json();
      setNotFollowingBack(data.users);
    } catch (error) {
      console.error('Erro ao verificar quem não segue de volta:', error);
    }
    
    setLoading(false);
  };

  const unfollowAll = async () => {
    if (!confirm(`Tem certeza que deseja deixar de seguir ${notFollowingBack.length} pessoas?`)) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/unfollow-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: notFollowingBack.map(u => u.id) })
      });
      
      const data = await response.json();
      alert(`${data.unfollowed} usuários deixaram de ser seguidos!`);
      setNotFollowingBack([]);
      
    } catch (error) {
      console.error('Erro ao deixar de seguir:', error);
      alert('Erro ao processar. Tente novamente.');
    }
    
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="container">
        <Head>
          <title>Twitter Unfollowers Tracker</title>
        </Head>
        
        <div className="login-container">
          <h1>📊 Twitter Unfollowers</h1>
          <p>Descubra quem deixou de te seguir e gerencie seus seguidores</p>
          <button onClick={handleLogin} className="btn-primary">
            Conectar com Twitter/X
          </button>
        </div>

        <style jsx>{`
          .container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1DA1F2 0%, #14171A 100%);
          }
          .login-container {
            background: white;
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 400px;
          }
          h1 {
            color: #14171A;
            margin-bottom: 1rem;
          }
          p {
            color: #657786;
            margin-bottom: 2rem;
          }
          .btn-primary {
            background: #1DA1F2;
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 50px;
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
          }
          .btn-primary:hover {
            background: #1a8cd8;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(29, 161, 242, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <Head>
        <title>Twitter Unfollowers - Dashboard</title>
      </Head>

      <nav className="navbar">
        <div className="nav-content">
          <h2>📊 Unfollowers Tracker</h2>
          <div className="user-info">
            <span>@{user.username}</span>
            <button onClick={() => {
              localStorage.clear();
              setUser(null);
            }} className="btn-logout">Sair</button>
          </div>
        </div>
      </nav>

      <div className="main-content">
        <aside className="sidebar">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            🏠 Dashboard
          </button>
          <button 
            className={activeTab === 'unfollowers' ? 'active' : ''}
            onClick={() => setActiveTab('unfollowers')}
          >
            📉 Quem deixou de seguir
          </button>
          <button 
            className={activeTab === 'not-following-back' ? 'active' : ''}
            onClick={checkNotFollowingBack}
          >
            ❌ Não me segue de volta
          </button>
          <button 
            onClick={fetchFollowers}
            className="btn-refresh"
          >
            🔄 Atualizar dados
          </button>
        </aside>

        <main className="content">
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Carregando...</p>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="dashboard">
              <h1>Dashboard</h1>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{user.followers_count.toLocaleString()}</div>
                  <div className="stat-label">Seguidores</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{user.following_count.toLocaleString()}</div>
                  <div className="stat-label">Seguindo</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{history.length}</div>
                  <div className="stat-label">Unfollowers (30 dias)</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'unfollowers' && (
            <div className="unfollowers">
              <h1>Quem deixou de te seguir (últimos 30 dias)</h1>
              {history.length === 0 ? (
                <p className="empty-state">Nenhum unfollow registrado nos últimos 30 dias 🎉</p>
              ) : (
                <div className="user-list">
                  {history.map((user, index) => (
                    <div key={index} className="user-card">
                      <div className="user-avatar">
                        {user.name.charAt(0)}
                      </div>
                      <div className="user-info-card">
                        <div className="user-name">{user.name}</div>
                        <div className="user-username">@{user.username}</div>
                        <div className="unfollowed-date">
                          {new Date(user.unfollowed_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'not-following-back' && (
            <div className="not-following-back">
              <h1>Não te seguem de volta</h1>
              {notFollowingBack.length === 0 ? (
                <p className="empty-state">Carregue os dados para ver quem não te segue de volta</p>
              ) : (
                <>
                  <div className="actions">
                    <button onClick={unfollowAll} className="btn-danger">
                      Deixar de seguir todos ({notFollowingBack.length})
                    </button>
                  </div>
                  <div className="user-list">
                    {notFollowingBack.map((user, index) => (
                      <div key={index} className="user-card">
                        <div className="user-avatar">
                          {user.name.charAt(0)}
                        </div>
                        <div className="user-info-card">
                          <div className="user-name">{user.name}</div>
                          <div className="user-username">@{user.username}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: #f7f9fa;
        }
      `}</style>

      <style jsx>{`
        .app {
          min-height: 100vh;
        }
        .navbar {
          background: white;
          border-bottom: 1px solid #e1e8ed;
          padding: 1rem 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .nav-content h2 {
          color: #14171A;
          font-size: 1.5rem;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .user-info span {
          color: #657786;
          font-weight: 500;
        }
        .btn-logout {
          background: #f7f9fa;
          border: 1px solid #e1e8ed;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-logout:hover {
          background: #e1e8ed;
        }
        .main-content {
          max-width: 1200px;
          margin: 2rem auto;
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 2rem;
          padding: 0 2rem;
        }
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .sidebar button {
          background: white;
          border: 1px solid #e1e8ed;
          padding: 1rem;
          border-radius: 10px;
          text-align: left;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
          font-weight: 500;
        }
        .sidebar button:hover {
          background: #f7f9fa;
          border-color: #1DA1F2;
        }
        .sidebar button.active {
          background: #1DA1F2;
          color: white;
          border-color: #1DA1F2;
        }
        .btn-refresh {
          margin-top: 1rem;
          background: #1DA1F2 !important;
          color: white !important;
          border: none !important;
        }
        .btn-refresh:hover {
          background: #1a8cd8 !important;
        }
        .content {
          background: white;
          border-radius: 15px;
          padding: 2rem;
          min-height: 500px;
        }
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f7f9fa;
          border-top-color: #1DA1F2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .dashboard h1, .unfollowers h1, .not-following-back h1 {
          color: #14171A;
          margin-bottom: 2rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        .stat-card {
          background: linear-gradient(135deg, #1DA1F2 0%, #0d8bd9 100%);
          padding: 2rem;
          border-radius: 15px;
          color: white;
          text-align: center;
        }
        .stat-number {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .stat-label {
          font-size: 1rem;
          opacity: 0.9;
        }
        .user-list {
          display: grid;
          gap: 1rem;
        }
        .user-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f7f9fa;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .user-card:hover {
          background: #e1e8ed;
          transform: translateX(5px);
        }
        .user-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #1DA1F2;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
        }
        .user-info-card {
          flex: 1;
        }
        .user-name {
          font-weight: bold;
          color: #14171A;
        }
        .user-username {
          color: #657786;
          font-size: 0.9rem;
        }
        .unfollowed-date {
          color: #657786;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }
        .empty-state {
          text-align: center;
          color: #657786;
          padding: 4rem;
          font-size: 1.1rem;
        }
        .actions {
          margin-bottom: 2rem;
        }
        .btn-danger {
          background: #e0245e;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-danger:hover {
          background: #c91e52;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(224, 36, 94, 0.3);
        }
      `}</style>
    </div>
  );
}
