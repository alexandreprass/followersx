const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f0f 0%, #111827 100%)',
    color: '#fff',
    padding: '40px 20px',
    paddingBottom: '120px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },

  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },

  userInfo: {
    marginTop: '30px',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    borderRadius: '20px',
    padding: '25px',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
  },

  userProfile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '25px',
  },

  avatar: {
    width: '75px',
    height: '75px',
    borderRadius: '50%',
    border: '3px solid #1d9bf0',
    boxShadow: '0 0 20px rgba(29,155,240,0.5)',
  },

  userName: {
    margin: 0,
    fontSize: '20px',
  },

  userHandle: {
    margin: '5px 0 0 0',
    color: '#9ca3af',
    fontSize: '14px',
  },

  stats: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: '20px',
    flexWrap: 'wrap',
    gap: '20px',
  },

  statItem: {
    background: 'rgba(255,255,255,0.03)',
    padding: '15px 25px',
    borderRadius: '14px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.2s',
  },

  lastSync: {
    marginTop: '20px',
    color: '#9ca3af',
    fontSize: '13px',
  },

  loading: {
    textAlign: 'center',
    paddingTop: '150px',
  },

  spinner: {
    width: '55px',
    height: '55px',
    border: '6px solid rgba(255,255,255,0.1)',
    borderTop: '6px solid #1d9bf0',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 25px',
  },

  error: {
    textAlign: 'center',
    paddingTop: '120px',
    color: '#ff6b6b',
  },

  tabs: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '35px',
    flexWrap: 'wrap',
  },

  tab: {
    padding: '12px 22px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '30px',
    fontSize: '14px',
    transition: 'all 0.25s ease',
  },

  activeTab: {
    background: '#1d9bf0',
    boxShadow: '0 0 20px rgba(29,155,240,0.5)',
    transform: 'translateY(-2px)',
  },

  content: {
    maxWidth: '850px',
    margin: '0 auto',
  },

  listTitle: {
    marginBottom: '25px',
    fontSize: '22px',
    textAlign: 'center',
  },

  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },

  userCard: {
    background: 'rgba(255,255,255,0.04)',
    padding: '18px',
    borderRadius: '18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.25s ease',
    backdropFilter: 'blur(8px)',
  },

  userCardInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },

  userAvatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.1)',
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
    color: '#9ca3af',
    margin: 0,
    fontSize: '14px',
  },

  date: {
    color: '#9ca3af',
    fontSize: '12px',
    display: 'block',
    marginTop: '6px',
  },

  unfollowButton: {
    padding: '9px 16px',
    background: 'linear-gradient(135deg, #ff4d4d, #dc3545)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 5px 15px rgba(220,53,69,0.4)',
  },

  actionButtons: {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    display: 'flex',
    gap: '15px',
    flexDirection: 'column',
  },

  analyzeButton: {
    padding: '16px 28px',
    background: 'linear-gradient(135deg, #10a37f, #0e8f6f)',
    color: 'white',
    border: 'none',
    borderRadius: '60px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 8px 25px rgba(16,163,127,0.5)',
    transition: 'all 0.25s ease',
  },

  syncButton: {
    padding: '16px 28px',
    background: 'linear-gradient(135deg, #1d9bf0, #0c7bd9)',
    color: 'white',
    border: 'none',
    borderRadius: '60px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 8px 25px rgba(29,155,240,0.5)',
    transition: 'all 0.25s ease',
  },

  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  button: {
    padding: '14px 26px',
    background: '#1d9bf0',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px',
  },

  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: '#9ca3af',
  },

  emptyIcon: {
    fontSize: '60px',
    marginBottom: '15px',
  },
};
