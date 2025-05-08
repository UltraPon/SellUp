import React from 'react';
import { Link } from 'react-router-dom';

const CheckEmail = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>
        <h2 style={styles.title}>Пожалуйста, проверьте свою почту</h2>
        <p style={styles.text}>
          Мы отправили письмо с подтверждением на ваш email.
          Пожалуйста, откройте письмо и перейдите по ссылке,
          чтобы завершить регистрацию.
        </p>
        <Link
          to="http://localhost:3000/login"
          style={styles.loginLink}
        >
          Перейти к авторизации
        </Link>
      </div>
    </div>
  );
};

interface Styles {
  [key: string]: React.CSSProperties;
}

const styles: Styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center' as const,
  },
  iconContainer: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '16px',
  },
  text: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: 1.5,
    marginBottom: '16px',
  },
  resendLink: {
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: 500,
    marginLeft: '4px',
  },
  loginLink: {
    display: 'inline-block',
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 500,
    marginTop: '16px',
    transition: 'background-color 0.2s',
  },
};

export default CheckEmail;