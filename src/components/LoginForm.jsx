import React, { useState } from 'react';


const LoginForm = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { name, email, password };
    const endpoint = mode === 'register' ? 'register' : 'login';

    try {
      const res = await fetch(`http://localhost:3001/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Невідома помилка');
        return;
      }

      localStorage.setItem('user', JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      setError('Сервер не відповідає');
    }
  };

  return (

<div
      style={{
        display: "flex",
        justifyContent: "center", // центр по горизонтали
        alignItems: "center", // центр по вертикали
        minHeight: "100vh", // контейнер на весь экран
        background: "#111", // фон (по желанию)
      }}
    >
    
    <form
      onSubmit={handleSubmit}
      className="login-form"
      style={{
        width: '100%',
        maxWidth: '420px',
        padding: '30px 30px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(30px) saturate(180%)',
        borderRadius: '25px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 30px 50px rgba(0, 0, 0, 0.5)',
        color: '#fff',
        textAlign: 'center',
        animation: 'fadeIn 1.2s ease forwards',
        transform: 'scale(0.97)',
      }}
    >
      <h2
        style={{
          fontSize: '28px',
          fontWeight: '700',
          background: 'linear-gradient(90deg, #0ea5e9, #4f46e5, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundSize: '300% 300%',
          animation: 'gradientMove 8s linear infinite',
          marginBottom: '20px',
        }}
      >
        {mode === 'register' ? 'Реєстрація' : 'Вхід'}
      </h2>

      {mode === 'register' && (
        <input
          type="text"
          placeholder="Імʼя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
        />
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={inputStyle}
      />

      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={inputStyle}
      />

      {error && <p style={{ color: '#f88', margin: '10px 0' }}>{error}</p>}

      <button type="submit" style={buttonStyle}>
        {mode === 'register' ? 'Зареєструватися' : 'Увійти'} ▶️
      </button>

      <p style={{ marginTop: '20px', fontSize: '14px' }}>
        {mode === 'register' ? 'Вже є акаунт?' : 'Немає акаунту?'}{' '}
        <button
          type="button"
          onClick={() => {
            setError('');
            setMode(mode === 'register' ? 'login' : 'register');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#94f0d0',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          {mode === 'register' ? 'Увійти' : 'Зареєструватися'}
        </button>
      </p>
    </form>
  </div>
  );
};


const inputStyle = {
  width: '90%',
  padding: '14px 18px',
  marginBottom: '18px',
  borderRadius: '50px',
  border: 'none',
  background: 'rgba(255, 255, 255, 0.08)',
  color: 'white',
  fontSize: '18px',
  outline: 'none',
  backdropFilter: 'blur(10px)',
};

const buttonStyle = {
  background: 'linear-gradient(135deg, #a2f5c8, #f9b8d0)',
  color: '#1a1a1a',
  fontSize: '17px',
  fontWeight: '600',
  border: 'none',
  borderRadius: '50px',
  padding: '14px 28px',
  cursor: 'pointer',
  boxShadow: '0 8px 20px rgba(159, 236, 201, 0.4)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

export default LoginForm;