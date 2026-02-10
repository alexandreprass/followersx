// pages/index.js
import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    // Redireciona diretamente — NÃO usa fetch
    window.location.href = '/api/auth';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#000',
        color: '#fff',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        Followers Tracker no X
      </h1>

      <p style={{ fontSize: '1.3rem', maxWidth: '600px', marginBottom: '2rem' }}>
        Conecte sua conta do X e veja:
        <br />• Quantos seguidores você tem em tempo real
        <br />• Quem deixou de te seguir (com histórico de 30 dias)
        <br />• Quem você segue mas não te segue de volta
        <br />• Opção para deixar de seguir em massa
      </p>

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          padding: '16px 40px',
          fontSize: '1.4rem',
          fontWeight: 'bold',
          backgroundColor: '#1d9bf0',
          color: 'white',
          border: 'none',
          borderRadius: '9999px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {loading ? 'Conectando...' : 'Conectar com X'}
      </button>

      <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>
        Seus dados são acessados apenas com sua permissão e armazenados de forma segura.
      </p>
    </div>
  );
}