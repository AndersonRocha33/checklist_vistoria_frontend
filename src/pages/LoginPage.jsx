import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setMensagemErro('');
    setLoading(true);

    try {
      console.log('CHAMANDO LOGIN...');

      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        senha,
      });

      console.log('RESPOSTA LOGIN:', response.data);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem(
        'user',
        JSON.stringify(response.data.user || response.data.usuario)
      );

      navigate('/'); // ajuste se sua rota for outra
    } catch (error) {
      console.error('ERRO COMPLETO LOGIN:', error);

      const erroDetalhado = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      };

      console.log('DETALHE ERRO:', erroDetalhado);

      alert(JSON.stringify(erroDetalhado));

      if (error.response?.data?.message) {
        setMensagemErro(error.response.data.message);
      } else if (error.code === 'ECONNABORTED') {
        setMensagemErro('Servidor demorou para responder. Tente novamente.');
      } else {
        setMensagemErro('Erro de conexão com o servidor.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Login</h2>

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
              onChange={(e) => setSenha(e.target.value)}
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

          {mensagemErro && (
            <p style={{ color: 'red' }}>{mensagemErro}</p>
          )}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
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