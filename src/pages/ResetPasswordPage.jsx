import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api.js';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!token) {
      setError('Link inválido. Solicite uma nova redefinição de senha.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/reset-password', {
        token,
        password
      });

      setMessage(response.data.message || 'Senha redefinida com sucesso.');

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Erro ao redefinir senha.'
      );
    } finally {
      setLoading(false);
    }
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

        <h1 style={styles.title}>Redefinir senha</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Nova senha</label>

            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite a nova senha"
                style={styles.passwordInput}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                style={styles.toggleButton}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirmar senha</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirme a nova senha"
              style={styles.input}
              required
            />
          </div>

          {error ? <div style={styles.errorBox}>{error}</div> : null}
          {message ? <div style={styles.successBox}>{message}</div> : null}

          <button type="submit" style={styles.submitButton} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/login')}
          style={styles.switchButton}
        >
          Voltar para login
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
    fontSize: '2rem',
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