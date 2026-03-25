import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (error) {
  console.error(error);
  setError(
    error.response?.data?.message ||
    error.response?.data?.error ||
    'Erro ao fazer login.'
  );
}
  }

  return (
    <div className="container">
      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        <h1 style={{ marginBottom: '16px' }}>Login</h1>

        <form onSubmit={handleSubmit} className="form">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />

          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Senha"
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit">Entrar</button>
        </form>

        <p style={{ marginTop: '16px' }}>
          Não tem conta? <Link to="/register">Cadastrar</Link>
        </p>
      </div>
    </div>
  );
}