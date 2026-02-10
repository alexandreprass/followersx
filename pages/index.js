import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});

      if (cookies.twitter_user) {
        try {
          const decodedUser = decodeURIComponent(cookies.twitter_user);
          const userData = JSON.parse(decodedUser);
          setUser(userData);
        } catch (error) {
          console.error('Erro ao parsear usuário:', error);
          document.cookie = 'twitter_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Erro ao iniciar autenticação');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Erro ao conectar com Twitter');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    document.cookie = 'twitter_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'twitter_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'twitter_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setUser(null);
    window.location.href = '/';
  };

  if (!user) {
    return (
      <div className="container">
        <Head>
          <title>Twitter Unfollowers Tracker</title>
        </Head>
        
        <div className="login-container">
          <h1>📊 Twitter Analytics</h1>
          <p>Conecte sua conta do Twitter para ver suas estatísticas</p>
          <button onClick={handleLogin} className="btn-primary" disabled={loading}>
            {loading ? 'Conectando...' : 'Conectar com Twitter/X'}
          </button>
          
          <div className="warning-box">
            <p><strong>⚠️ Aviso:</strong> Este app usa o plano FREE da API do Twitter.</p>
            <p>Funcionalidades disponíveis:</p>
            <ul>
              <li>✅ Ver seus dados públicos</li>
              <li>✅ Ver seu perfil</li>
              <li>❌ Seguidores/Following (precisa plano pago $100/mês)</li>
            </ul>
          </div>
        </div>

        <style jsx>{`
          .container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1DA1F2 0%, #14171A 100%);
            padding: 2rem;
          }
          .login-container {
            background: white;
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
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
          .btn-primary:hover:not(:disabled) {
            background: #1a8cd8;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(29, 161, 242, 0.3);
          }
          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .warning-box {
            margin-top: 2rem;
            padding: 1.5rem;
            background: #FFF3CD;
            border-radius: 10px;
            text-align: left;
          }
          .warning-box p {
            margin: 0.5rem 0;
            color: #856404;
          }
          .warning-box strong {
            color: #856404;
          }
          .warning-box ul {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
            color: #856404;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <Head>
        <title>Twitter Analytics - {user.username}</title>
      </Head>

      <nav className="navbar">
        <div className="nav-content">
          <h2>📊 Twitter Analytics</h2>
          <div className="user-info">
            <span>@{user.username}</span>
            <button onClick={handleLogout} className="btn-logout">Sair</button>
          </div>
        </div>
      </nav>

      <div className="main-content">
        <div className="profile-card">
          <div className="profile-header">
            {user.profile_image_url && (
              <img 
                src={user.profile_image_url} 
                alt={user.name}
                className="profile-image"
              />
            )}
            <h1>{user.name}</h1>
            <p className="username">@{user.username}</p>
            <p className="user-id">ID: {user.id}</p>
          </div>

          <div className="stats-section">
            <h2>📊 Estatísticas Disponíveis</h2>
            {user.public_metrics ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">
                    {user.public_metrics.followers_count?.toLocaleString() || 0}
                  </div>
                  <div className="stat-label">Seguidores</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {user.public_metrics.following_count?.toLocaleString() || 0}
                  </div>
                  <div className="stat-label">Seguindo</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {user.public_metrics.tweet_count?.toLocaleString() || 0}
                  </div>
                  <div className="stat-label">Tweets</div>
                </div>
              </div>
            ) : (
              <p className="no-metrics">Métricas não disponíveis</p>
            )}
          </div>

          <div className="info-section">
            <h2>ℹ️ Informações da Conta</h2>
            <div className="info-item">
              <strong>Nome:</strong> {user.name}
            </div>
            <div className="info-item">
              <strong>Username:</strong> @{user.username}
            </div>
            <div className="info-item">
              <strong>ID:</strong> {user.id}
            </div>
            {user.description && (
              <div className="info-item">
                <strong>Bio:</strong> {user.description}
              </div>
            )}
            {user.created_at && (
              <div className="info-item">
                <strong>Criado em:</strong> {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </div>
            )}
            {user.verified !== undefined && (
              <div className="info-item">
                <strong>Verificado:</strong> {user.verified ? '✅ Sim' : '❌ Não'}
              </div>
            )}
          </div>

          <div className="upgrade-box">
            <h3>🚀 Quer mais funcionalidades?</h3>
            <p>Para acessar dados de seguidores, unfollowers e mais:</p>
            <ul>
              <li>Upgrade para Twitter API Basic ($100/mês)</li>
              <li>Ou use ferramentas alternativas gratuitas</li>
            </ul>
          </div>
        </div>
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
          max-width: 800px;
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
          max-width: 800px;
          margin: 2rem auto;
          padding: 0 2rem;
        }
        .profile-card {
          background: white;
          border-radius: 15px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .profile-header {
          text-align: center;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e1e8ed;
        }
        .profile-image {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          margin-bottom: 1rem;
        }
        .profile-header h1 {
          color: #14171A;
          margin-bottom: 0.5rem;
        }
        .username {
          color: #657786;
          font-size: 1.1rem;
        }
        .user-id {
          color: #AAB8C2;
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }
        .stats-section {
          margin: 2rem 0;
        }
        .stats-section h2 {
          color: #14171A;
          margin-bottom: 1.5rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }
        .stat-card {
          background: linear-gradient(135deg, #1DA1F2 0%, #0d8bd9 100%);
          padding: 1.5rem;
          border-radius: 10px;
          color: white;
          text-align: center;
        }
        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .stat-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }
        .no-metrics {
          text-align: center;
          color: #657786;
          padding: 2rem;
        }
        .info-section {
          margin: 2rem 0;
        }
        .info-section h2 {
          color: #14171A;
          margin-bottom: 1rem;
        }
        .info-item {
          padding: 0.75rem 0;
          border-bottom: 1px solid #f7f9fa;
          color: #14171A;
        }
        .info-item strong {
          color: #657786;
          margin-right: 0.5rem;
        }
        .upgrade-box {
          margin-top: 2rem;
          padding: 1.5rem;
          background: #E8F5FE;
          border-radius: 10px;
          border-left: 4px solid #1DA1F2;
        }
        .upgrade-box h3 {
          color: #14171A;
          margin-bottom: 0.5rem;
        }
        .upgrade-box p {
          color: #657786;
          margin: 0.5rem 0;
        }
        .upgrade-box ul {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
          color: #657786;
        }
      `}</style>
    </div>
  );
}
