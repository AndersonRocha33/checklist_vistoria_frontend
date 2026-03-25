import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();

  const [modoCadastro, setModoCadastro] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMensagemErro('');
    setMensagemSucesso('');
    setLoading(true);

    try {
      if (modoCadastro) {
        const payload = {
          nome: formData.nome.trim(),
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha,
        };

        console.log('PAYLOAD CADASTRO:', payload);

        await api.post('/auth/register', payload);

        setMensagemSucesso('Cadastro realizado com sucesso. Faça login para continuar.');
        setModoCadastro(false);
        setFormData({
          nome: '',
          email: formData.email.trim().toLowerCase(),
          senha: '',
        });
      } else {
        const payload = {
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha,
        };

        console.log('PAYLOAD LOGIN:', payload);

        const response = await api.post('/auth/login', payload);

        console.log('RESPOSTA LOGIN:', response.data);

        const token = response.data.token;
        const user = response.data.user || response.data.usuario || null;

        if (token) {
          localStorage.setItem('token', token);
        }

        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        navigate('/');
      }
    } catch (error) {
      console.error('ERRO COMPLETO:', error);

      const status = error.response?.status;
      const data = error.response?.data;

      if (data?.message) {
        setMensagemErro(data.message);
      } else if (error.code === 'ECONNABORTED') {
        setMensagemErro('O servidor demorou para responder. Tente novamente.');
      } else if (error.message === 'Network Error') {
        setMensagemErro('Erro de conexão com o servidor.');
      } else {
        setMensagemErro('Ocorreu um erro ao processar sua solicitação.');
      }

      alert(
        JSON.stringify({
          message: error.message,
          code: error.code,
          status,
          data,
        })
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          {modoCadastro ? 'Criar conta' : 'Entrar'}
        </h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          {modoCadastro && (
            <div style={styles.field}>
              <label style={styles.label}>Nome</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Digite seu nome"
                style={styles.input}
                required
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

        <button
          type="button"
          style={styles.switchButton}
          onClick={() => {
            setModoCadastro((prev) => !prev);
            setMensagemErro('');
            setMensagemSucesso('');
            setFormData({
              nome: '',
              email: '',
              senha: '',
            });
          }}
        >
          {modoCadastro
            ? 'Já tem conta? Entrar'
            : 'Ainda não tem conta? Cadastrar'}
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
    backgroundColor: '#f5f5f5',
    padding: '16px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
  },
  title: {
    textAlign: 'center',
    marginBottom: '24px',
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
    border: '1px solid #d0d0d0',
    padding: '0 12px',
    fontSize: '16px',
    outline: 'none',
  },
  passwordWrapper: {
    display: 'flex',
    gap: '8px',
  },
  inputPassword: {
    flex: 1,
    height: '44px',
    borderRadius: '10px',
    border: '1px solid #d0d0d0',
    padding: '0 12px',
    fontSize: '16px',
    outline: 'none',
  },
  showButton: {
    minWidth: '84px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    padding: '0 12px',
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
    width: '100%',
    marginTop: '16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  errorBox: {
    backgroundColor: '#ffe7e7',
    color: '#b00020',
    padding: '10px 12px',
    borderRadius: '10px',
    fontSize: '14px',
  },
  successBox: {
    backgroundColor: '#e8f7ea',
    color: '#1b5e20',
    padding: '10px 12px',
    borderRadius: '10px',
    fontSize: '14px',
  },
};