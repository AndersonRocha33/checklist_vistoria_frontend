import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Apartments() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarApartamentos() {
      try {
        setErro('');
        setLoading(true);

        const response = await api.get('/apartments');

        if (Array.isArray(response.data)) {
          setApartments(response.data);
        } else if (Array.isArray(response.data.apartments)) {
          setApartments(response.data.apartments);
        } else {
          setApartments([]);
        }
      } catch (error) {
        console.error('Erro ao carregar apartamentos:', error);

        if (error.response?.data?.message) {
          setErro(error.response.data.message);
        } else {
          setErro('Não foi possível carregar os apartamentos.');
        }
      } finally {
        setLoading(false);
      }
    }

    carregarApartamentos();
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Apartamentos</h1>
        <button style={styles.logoutButton} onClick={handleLogout}>
          Sair
        </button>
      </div>

      {loading ? <p>Carregando apartamentos...</p> : null}

      {erro ? <div style={styles.errorBox}>{erro}</div> : null}

      {!loading && !erro && apartments.length === 0 ? (
        <div style={styles.emptyBox}>Nenhum apartamento encontrado.</div>
      ) : null}

      {!loading && !erro && apartments.length > 0 ? (
        <div style={styles.list}>
          {apartments.map((apartment) => (
            <div key={apartment.id} style={styles.card}>
              <strong>
                Apartamento {apartment.number || apartment.numero || 'Sem número'}
              </strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f3f4f6',
    padding: '24px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '12px',
  },
  title: {
    margin: 0,
  },
  logoutButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
  },
  list: {
    display: 'grid',
    gap: '12px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '12px',
    padding: '12px 14px',
  },
  emptyBox: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
  },
};