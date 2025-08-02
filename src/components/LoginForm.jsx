import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const userData = { name, email, password };

 
    localStorage.setItem('user', JSON.stringify(userData));

   
    onLogin(userData);
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Увійти або зареєструватися</h2>
      <input type="text" placeholder="Імʼя" value={name} onChange={(e) => setName(e.target.value)} required />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit">Продовжити ▶️</button>
    </form>
  );
};

export default LoginForm;
