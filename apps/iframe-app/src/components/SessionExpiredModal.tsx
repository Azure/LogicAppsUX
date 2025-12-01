import React from 'react';

interface SessionExpiredModalProps {
  isOpen: boolean;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({ isOpen }) => {
  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
        role="dialog"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-description"
      >
        <h2 id="session-expired-title" style={{ marginTop: 0, marginBottom: '16px' }}>
          Session Expired
        </h2>
        <p id="session-expired-description" style={{ marginBottom: '24px' }}>
          Your session has expired. Please refresh the page to continue.
        </p>
        <button
          onClick={handleRefresh}
          style={{
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#106ebe';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#0078d4';
          }}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};
