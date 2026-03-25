import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setErro('');
    setLoading(true);

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        senha: senha, // 👈 GARANTE QUE ESTÁ ENVIANDO
      };

      console.log('PAYLOAD LOGIN:', payload);

      const response = await api.post('/auth/login', payload);

      localStorage.setItem('token', response.data.token);

      navigate('/');
    } catch (error) {
      console.error('ERRO LOGIN:', error);

      setErro(
        error.response?.data?.message ||
        'Erro ao fazer login'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Entrar</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />

          <div style={styles.passwordContainer}>
            <input
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)} // 👈 ESSENCIAL
              style={styles.input}
              required
            />

            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              style={styles.buttonMostrar}
            >
              {mostrarSenha ? 'Ocultar' : 'Ver'}
            </button>
          </div>

          {erro && <p style={{ color: 'red' }}>{erro}</p>}

          <button type="submit" style={styles.button}>
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f5f5f5',
  },
  card: {
    background: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    maxWidth: 300,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 10,
    margin: '10px 0',
  },
  button: {
    width: '100%',
    padding: 10,
    marginTop: 10,
  },
  passwordContainer: {
    display: 'flex',
    gap: 5,
  },
  buttonMostrar: {
    padding: '10px',
  },
};