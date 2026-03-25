import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
  });
  const [loading, setLoading] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMensagemErro('');
    setMensagemSucesso('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.post('/auth/login', {
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha,
        });

        const { token, user } = response.data;

        if (token) {
          localStorage.setItem('token', token);
        }

        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        setMensagemSucesso('Login realizado com sucesso.');

        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        await api.post('/auth/register', {
          nome: formData.nome.trim(),
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha,
        });

        setMensagemSucesso('Cadastro realizado com sucesso. Agora faça login.');
        setIsLogin(true);
        setFormData({
          nome: '',
          email: formData.email.trim().toLowerCase(),
          senha: '',
        });
      }
    } catch (error) {
      console.error('Erro no login/cadastro:', error);

      if (error.response?.data?.message) {
        setMensagemErro(error.response.data.message);
      } else if (error.code === 'ECONNABORTED') {
        setMensagemErro(
          'A requisição demorou demais. Tente novamente em alguns segundos.'
        );
      } else if (error.message === 'Network Error') {
        setMensagemErro(
          'Não foi possível conectar ao servidor. Verifique a internet e tente novamente.'
        );
      } else {
        setMensagemErro('Ocorreu um erro ao processar sua solicitação.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          {isLogin ? 'Entrar' : 'Cadastrar'}
        </h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div style={styles.field}>
              <label style={styles.label}>Nome</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Digite seu nome"
                style={styles.input}
                required={!isLogin}
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>E-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Digite seu e-mail"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Senha</label>
            <div style={styles.passwordWrapper}>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                name="senha"
                value={formData.senha}
                onChange={handleChange}
                placeholder="Digite sua senha"
                style={styles.inputPassword}
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((prev) => !prev)}
                style={styles.passwordButton}
              >
                {mostrarSenha ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {mensagemErro ? (
            <div style={styles.errorBox}>{mensagemErro}</div>
          ) : null}

          {mensagemSucesso ? (
            <div style={styles.successBox}>{mensagemSucesso}</div>
          ) : null}

          <button type="submit" style={styles.submitButton} disabled={loading}>
            {loading
              ? 'Carregando...'
              : isLogin
              ? 'Entrar'
              : 'Cadastrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsLogin((prev) => !prev);
            setMensagemErro('');
            setMensagemSucesso('');
          }}
          style={styles.switchButton}
        >
          {isLogin
            ? 'Ainda não tem conta? Cadastre-se'
            : 'Já tem conta? Faça login'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: '#f5f5f5',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
  },
  title: {
    margin: '0 0 24px 0',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontWeight: '600',
  },
  input: {
    height: '44px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    padding: '0 12px',
    fontSize: '16px',
    outline: 'none',
  },
  passwordWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  inputPassword: {
    flex: 1,
    height: '44px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    padding: '0 12px',
    fontSize: '16px',
    outline: 'none',
  },
  passwordButton: {
    height: '44px',
    border: 'none',
    borderRadius: '10px',
    padding: '0 12px',
    cursor: 'pointer',
  },
  submitButton: {
    height: '46px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '16px',
  },
  switchButton: {
    marginTop: '16px',
    width: '100%',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  errorBox: {
    background: '#ffe5e5',
    color: '#b00020',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '14px',
  },
  successBox: {
    background: '#e7f8ea',
    color: '#1b5e20',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '14px',
  },
};