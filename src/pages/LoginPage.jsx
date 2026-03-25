import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
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

  function resetarFormulario() {
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
          senha: senha,
        };

        console.log('PAYLOAD CADASTRO:', payloadCadastro);

        await api.post('/auth/register', payloadCadastro);

        setMensagemSucesso('Cadastro realizado com sucesso. Agora faça login.');
        setModoCadastro(false);
        setNome('');
        setSenha('');
      } else {
        const payloadLogin = {
          email: email.trim().toLowerCase(),
          senha: senha,
        };

        console.log('PAYLOAD LOGIN:', payloadLogin);

        const response = await api.post('/auth/login', payloadLogin);

        console.log('RESPOSTA LOGIN:', response.data);

        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        if (response.data.usuario) {
          localStorage.setItem('user', JSON.stringify(response.data.usuario));
        }

        navigate('/');
      }
    } catch (error) {
      console.error('ERRO COMPLETO:', error);

      const erroDetalhado = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      };

      console.log('DETALHE ERRO:', erroDetalhado);

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
    resetarFormulario();
    limparMensagens();
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
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
            <div style={styles.passwordRow}>
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
                style={styles.showButton}
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
    background: '#f2f2f2',
    padding: '16px',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    background: '#ffffff',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
  },
  title: {
    textAlign: 'center',
    margin: '0 0 24px 0',
    fontSize: '2rem',
    color: '#111827',
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
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    width: '100%',
    height: '48px',
    padding: '0 14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  passwordRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'stretch',
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    height: '48px',
    padding: '0 14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  showButton: {
    minWidth: '96px',
    height: '48px',
    border: 'none',
    borderRadius: '12px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '0 14px',
  },
  submitButton: {
    width: '100%',
    height: '50px',
    border: 'none',
    borderRadius: '12px',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  switchButton: {
    width: '100%',
    marginTop: '16px',
    border: 'none',
    background: 'transparent',
    color: '#2563eb',
    cursor: 'pointer',
    fontWeight: '600',
    textDecoration: 'underline',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '0.95rem',
  },
  successBox: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '0.95rem',
  },
};