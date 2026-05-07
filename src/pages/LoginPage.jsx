import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function LoginPage() {
  const navigate = useNavigate();

  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [loading, setLoading] = useState(false);

  function limparMensagens() {
    setMensagemErro('');
    setMensagemSucesso('');
  }

  function limparFormulario() {
    setNome('');
    setEmail('');
    setSenha('');
    setMostrarSenha(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    limparMensagens();
    setLoading(true);

    try {
      if (modoCadastro) {
        const payloadCadastro = {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha: senha.trim(),
        };

        await api.post('/auth/register', payloadCadastro);

        setMensagemSucesso('Cadastro realizado com sucesso. Agora faça login.');
        setModoCadastro(false);
        setNome('');
        setSenha('');
      } else {
        const payloadLogin = {
          email: email.trim().toLowerCase(),
          senha: senha.trim(),
        };

        const response = await api.post('/auth/login', payloadLogin);

        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        if (response.data.usuario) {
          localStorage.setItem('user', JSON.stringify(response.data.usuario));
        }

        setMensagemSucesso('Login realizado com sucesso.');

        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setMensagemErro(error.response.data.message);
      } else if (error.code === 'ECONNABORTED') {
        setMensagemErro('O servidor demorou para responder. Tente novamente.');
      } else if (error.message === 'Network Error') {
        setMensagemErro('Erro de conexão com o servidor.');
      } else {
        setMensagemErro('Ocorreu um erro ao processar sua solicitação.');
      }
    } finally {
      setLoading(false);
    }
  }

  function alternarModo() {
    setModoCadastro((valorAtual) => !valorAtual);
    limparFormulario();
    limparMensagens();
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoBox}>
          <div style={styles.logoIcon}>✓</div>
          <h2 style={styles.logo}>
            <span style={styles.logoWhite}>Spot</span>CheckList
          </h2>
          <p style={styles.slogan}>Pronto para morar</p>
        </div>

        <h1 style={styles.title}>{modoCadastro ? 'Cadastrar' : 'Entrar'}</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          {modoCadastro && (
            <div style={styles.field}>
              <label style={styles.label}>Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Digite seu nome"
                style={styles.input}
                required={modoCadastro}
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Digite seu e-mail"
              style={styles.input}
              autoComplete="email"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Senha</label>

            <div style={styles.passwordWrapper}>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Digite sua senha"
                style={styles.passwordInput}
                autoComplete={modoCadastro ? 'new-password' : 'current-password'}
                required
              />

              <button
                type="button"
                onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                style={styles.toggleButton}
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
              : modoCadastro
              ? 'Cadastrar'
              : 'Entrar'}
          </button>
        </form>

        <button type="button" onClick={alternarModo} style={styles.switchButton}>
          {modoCadastro
            ? 'Já tem conta? Fazer login'
            : 'Ainda não tem conta? Cadastre-se'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(circle at top, #293241 0%, #151922 45%, #11151d 100%)',
    padding: '16px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    background: '#1f2530',
    border: '1px solid #343d4d',
    borderRadius: '24px',
    padding: '28px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
    boxSizing: 'border-box',
  },
  logoBox: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoIcon: {
    width: '70px',
    height: '70px',
    borderRadius: '20px',
    background: '#f4f66b',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.4rem',
    fontWeight: '900',
    margin: '0 auto 14px auto',
  },
  logo: {
    margin: 0,
    color: '#f4f66b',
    fontSize: '2.25rem',
    fontWeight: '900',
    letterSpacing: '-1px',
  },
  logoWhite: {
    color: '#ffffff',
  },
  slogan: {
    margin: '8px 0 0 0',
    color: '#b7c0cd',
    fontSize: '1rem',
  },
  title: {
    textAlign: 'center',
    margin: '0 0 24px 0',
    fontSize: '2.3rem',
    color: '#ffffff',
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
    fontSize: '1rem',
    fontWeight: '700',
    color: '#ffffff',
  },
  input: {
    width: '100%',
    height: '54px',
    padding: '0 16px',
    borderRadius: '14px',
    border: '1px solid #343d4d',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#151922',
    color: '#ffffff',
  },
  passwordWrapper: {
    display: 'flex',
    width: '100%',
    gap: '10px',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    height: '54px',
    padding: '0 16px',
    borderRadius: '14px',
    border: '1px solid #343d4d',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#151922',
    color: '#ffffff',
  },
  toggleButton: {
    width: '110px',
    minWidth: '110px',
    height: '54px',
    border: 'none',
    borderRadius: '14px',
    background: '#f4f66b',
    color: '#111827',
    fontWeight: '800',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  submitButton: {
    width: '100%',
    height: '56px',
    border: 'none',
    borderRadius: '14px',
    background: '#f4f66b',
    color: '#111827',
    fontSize: '1.15rem',
    fontWeight: '900',
    cursor: 'pointer',
    marginTop: '4px',
  },
  switchButton: {
    width: '100%',
    marginTop: '20px',
    border: 'none',
    background: 'transparent',
    color: '#f4f66b',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '1rem',
    textDecoration: 'underline',
  },
  errorBox: {
    background: '#3b1f25',
    color: '#fca5a5',
    border: '1px solid #7f1d1d',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '0.95rem',
  },
  successBox: {
    background: '#163323',
    color: '#86efac',
    border: '1px solid #166534',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '0.95rem',
  },
};