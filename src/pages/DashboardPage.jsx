import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function DashboardPage() {
  const navigate = useNavigate();

  const [enterprises, setEnterprises] = useState([]);
  const [apartments, setApartments] = useState([]);

  const [selectedEnterprise, setSelectedEnterprise] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingEnterpriseId, setDeletingEnterpriseId] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NUMBER');

  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;

  useEffect(() => {
    loadEnterprises();
    loadAllApartments();
  }, []);

  async function loadEnterprises() {
    try {
      const response = await api.get('/enterprises');
      setEnterprises(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setUploadError('Erro ao carregar empreendimentos.');
    }
  }

  async function loadAllApartments() {
    try {
      const response = await api.get('/apartments');
      setApartments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setUploadError('Erro ao carregar apartamentos.');
    }
  }

  async function reloadDashboardData() {
    await loadEnterprises();
    await loadAllApartments();
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  async function handleStartInspection(apartmentId) {
    try {
      const response = await api.post('/inspections/start', { apartmentId });
      navigate(`/inspection/${response.data.id}`);
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Erro ao iniciar vistoria.'
      );
    }
  }

  async function handleCsvUpload(e) {
    e.preventDefault();
    setUploadMessage('');
    setUploadError('');

    if (!csvFile) {
      setUploadError('Selecione um arquivo CSV.');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await api.post('/upload/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadMessage(
        `${response.data.message} Linhas: ${response.data.totalLinhasProcessadas}, empreendimentos criados: ${response.data.totalEmpreendimentosCriados}, apartamentos criados: ${response.data.totalApartamentosCriados}, itens criados: ${response.data.totalItensCriados}, linhas ignoradas: ${response.data.totalLinhasIgnoradas}.`
      );

      setCsvFile(null);
      const input = document.getElementById('csv-input');
      if (input) input.value = '';

      await reloadDashboardData();
    } catch (error) {
      console.error(error);
      setUploadError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Erro ao importar CSV.'
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteEnterprise(enterprise) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o empreendimento "${enterprise.name}"?\n\nEssa ação apagará também apartamentos, itens e vistorias vinculadas a ele.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUploadMessage('');
      setUploadError('');
      setDeletingEnterpriseId(enterprise.id);

      const wasSelected = selectedEnterprise === enterprise.id;

      await api.delete(`/enterprises/${enterprise.id}`);

      if (wasSelected) {
        setSelectedEnterprise('');
      }

      setUploadMessage(`Empreendimento "${enterprise.name}" excluído com sucesso.`);

      await reloadDashboardData();
    } catch (error) {
      console.error(error);
      setUploadError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Erro ao excluir empreendimento.'
      );
    } finally {
      setDeletingEnterpriseId('');
    }
  }

  function getStatusLabel(status) {
    const labels = {
      NAO_VISTORIADO: 'Não vistoriado',
      EM_VISTORIA: 'Em vistoria',
      VISTORIADO: 'Vistoriado',
      VISTORIADO_COM_PENDENCIA: 'Com pendência',
    };

    return labels[status] || status;
  }

  function getStatusStyle(status) {
    const stylesByStatus = {
      NAO_VISTORIADO: {
        background: '#e5e7eb',
        color: '#374151',
      },
      EM_VISTORIA: {
        background: '#dbeafe',
        color: '#1d4ed8',
      },
      VISTORIADO: {
        background: '#dcfce7',
        color: '#166534',
      },
      VISTORIADO_COM_PENDENCIA: {
        background: '#fef3c7',
        color: '#92400e',
      },
    };

    return stylesByStatus[status] || stylesByStatus.NAO_VISTORIADO;
  }

  const filteredApartments = useMemo(() => {
    let result = [...apartments];

    if (selectedEnterprise) {
      result = result.filter((a) => a.enterpriseId === selectedEnterprise);
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (a) =>
          String(a.number).toLowerCase().includes(term) ||
          String(a.enterpriseName || '').toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((a) => a.inspectionStatus === statusFilter);
    }

    if (sortBy === 'PENDENCY') {
      result.sort((a, b) => {
        if (b.naoConformeCount !== a.naoConformeCount) {
          return b.naoConformeCount - a.naoConformeCount;
        }

        return String(a.number).localeCompare(String(b.number), 'pt-BR', {
          numeric: true,
        });
      });
    } else if (sortBy === 'ENTERPRISE') {
      result.sort((a, b) => {
        const enterpriseCompare = String(a.enterpriseName || '').localeCompare(
          String(b.enterpriseName || ''),
          'pt-BR'
        );

        if (enterpriseCompare !== 0) return enterpriseCompare;

        return String(a.number).localeCompare(String(b.number), 'pt-BR', {
          numeric: true,
        });
      });
    } else {
      result.sort((a, b) =>
        String(a.number).localeCompare(String(b.number), 'pt-BR', {
          numeric: true,
        })
      );
    }

    return result;
  }, [apartments, selectedEnterprise, search, statusFilter, sortBy]);

  const metrics = useMemo(() => {
    return {
      total: filteredApartments.length,
      itensDistintos: filteredApartments.reduce(
        (acc, item) => acc + (item.totalDistinctItems || 0),
        0
      ),
      conforme: filteredApartments.reduce(
        (acc, item) => acc + (item.conformeCount || 0),
        0
      ),
      naoConforme: filteredApartments.reduce(
        (acc, item) => acc + (item.naoConformeCount || 0),
        0
      ),
      pendente: filteredApartments.reduce(
        (acc, item) => acc + (item.pendenteCount || 0),
        0
      ),
    };
  }, [filteredApartments]);

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div>
          <h1 style={styles.pageTitle}>Checklist de Entrega</h1>
          <p style={styles.pageSubtitle}>
            Usuário responsável: {user?.nome || user?.name || 'Usuário'}
          </p>
        </div>

        <button onClick={logout} style={styles.secondaryButton}>
          Sair
        </button>
      </header>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Importar checklist via CSV</h2>

        <form onSubmit={handleCsvUpload} style={styles.form}>
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files[0])}
          />

          <button type="submit" disabled={uploading} style={styles.primaryButton}>
            {uploading ? 'Importando...' : 'Importar CSV'}
          </button>
        </form>

        {uploadMessage ? <p style={styles.successText}>{uploadMessage}</p> : null}
        {uploadError ? <p style={styles.errorText}>{uploadError}</p> : null}
      </div>

      <div style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitleNoMargin}>Empreendimentos cadastrados</h2>
          <span style={styles.enterpriseCount}>
            Total: {enterprises.length}
          </span>
        </div>

        {enterprises.length === 0 ? (
          <p style={styles.emptyText}>Nenhum empreendimento cadastrado.</p>
        ) : (
          <div style={styles.enterpriseList}>
            {enterprises.map((enterprise) => {
              const apartmentCount = apartments.filter(
                (apartment) => apartment.enterpriseId === enterprise.id
              ).length;

              const isDeleting = deletingEnterpriseId === enterprise.id;

              return (
                <div key={enterprise.id} style={styles.enterpriseRow}>
                  <div style={styles.enterpriseInfo}>
                    <p style={styles.enterpriseName}>{enterprise.name}</p>
                    <p style={styles.enterpriseMeta}>
                      Apartamentos: {apartmentCount}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteEnterprise(enterprise)}
                    disabled={isDeleting}
                    style={styles.dangerButton}
                  >
                    {isDeleting ? 'Excluindo...' : 'Excluir empreendimento'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Filtros</h2>

        <div style={styles.filtersGrid}>
          <select
            value={selectedEnterprise}
            onChange={(e) => setSelectedEnterprise(e.target.value)}
            style={styles.input}
          >
            <option value="">Todos os empreendimentos</option>
            {enterprises.map((enterprise) => (
              <option key={enterprise.id} value={enterprise.id}>
                {enterprise.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Buscar por apartamento ou empreendimento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.input}
          >
            <option value="ALL">Todos os status</option>
            <option value="NAO_VISTORIADO">Não vistoriado</option>
            <option value="EM_VISTORIA">Em vistoria</option>
            <option value="VISTORIADO">Vistoriado</option>
            <option value="VISTORIADO_COM_PENDENCIA">Com pendência</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.input}
          >
            <option value="NUMBER">Ordenar por número</option>
            <option value="ENTERPRISE">Ordenar por empreendimento</option>
            <option value="PENDENCY">Mais pendências primeiro</option>
          </select>
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <h3 style={styles.metricTitle}>Apartamentos</h3>
          <p style={styles.metricValue}>{metrics.total}</p>
        </div>

        <div style={styles.metricCard}>
          <h3 style={styles.metricTitle}>Itens distintos</h3>
          <p style={styles.metricValue}>{metrics.itensDistintos}</p>
        </div>

        <div style={styles.metricCard}>
          <h3 style={styles.metricTitle}>Conformes</h3>
          <p style={styles.metricValue}>{metrics.conforme}</p>
        </div>

        <div style={styles.metricCard}>
          <h3 style={styles.metricTitle}>Não conformes</h3>
          <p style={styles.metricValue}>{metrics.naoConforme}</p>
        </div>

        <div style={styles.metricCard}>
          <h3 style={styles.metricTitle}>Pendentes</h3>
          <p style={styles.metricValue}>{metrics.pendente}</p>
        </div>
      </div>

      {filteredApartments.length === 0 ? (
        <div style={styles.card}>
          <p style={{ margin: 0 }}>
            Nenhum apartamento encontrado com os filtros atuais.
          </p>
        </div>
      ) : null}

      <div style={styles.apartmentGrid}>
        {filteredApartments.map((apartment) => (
          <div key={apartment.id} style={styles.apartmentCard}>
            <p style={styles.enterpriseLabel}>{apartment.enterpriseName}</p>
            <h3 style={styles.apartmentTitle}>Apto {apartment.number}</h3>
            <p style={styles.infoText}>
              Itens distintos: {apartment.totalDistinctItems}
            </p>
            <p style={styles.infoText}>Conformes: {apartment.conformeCount}</p>
            <p style={styles.infoText}>
              Não conformes: {apartment.naoConformeCount}
            </p>
            <p style={styles.infoText}>Pendentes: {apartment.pendenteCount}</p>

            <div
              style={{
                ...styles.statusBadge,
                ...getStatusStyle(apartment.inspectionStatus),
              }}
            >
              {getStatusLabel(apartment.inspectionStatus)}
            </div>

            <button
              onClick={() => handleStartInspection(apartment.id)}
              style={styles.primaryButton}
            >
              Abrir vistoria
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// SUBSTITUA SOMENTE ESTE BLOCO no DashboardPage.jsx

const styles = {
  page: {
    minHeight: '100vh',
    background: '#151922',
    padding: '24px',
    boxSizing: 'border-box',
  },

  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    background: '#1f2530',
    border: '1px solid #343d4d',
    borderRadius: '20px',
    padding: '20px',
  },

  pageTitle: {
    margin: 0,
    fontSize: '2.2rem',
    color: '#ffffff',
    fontWeight: '800',
  },

  pageSubtitle: {
    margin: '8px 0 0 0',
    color: '#b7c0cd',
  },

  card: {
    background: '#1f2530',
    borderRadius: '20px',
    padding: '22px',
    border: '1px solid #343d4d',
    marginBottom: '20px',
  },

  sectionTitle: {
    margin: '0 0 18px 0',
    color: '#ffffff',
    fontSize: '1.4rem',
  },

  sectionTitleNoMargin: {
    margin: 0,
    color: '#ffffff',
    fontSize: '1.4rem',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },

  enterpriseCount: {
    color: '#b7c0cd',
    fontWeight: '700',
  },

  enterpriseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },

  enterpriseRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid #343d4d',
    background: '#222938',
    flexWrap: 'wrap',
  },

  enterpriseInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  enterpriseName: {
    margin: 0,
    fontWeight: '800',
    color: '#ffffff',
    fontSize: '1.05rem',
  },

  enterpriseMeta: {
    margin: 0,
    color: '#b7c0cd',
    fontSize: '0.95rem',
  },

  emptyText: {
    margin: 0,
    color: '#b7c0cd',
  },

  form: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },

  input: {
    width: '100%',
    height: '50px',
    padding: '0 14px',
    borderRadius: '14px',
    border: '1px solid #343d4d',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#151922',
    color: '#ffffff',
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },

  metricCard: {
    background: '#1f2530',
    borderRadius: '20px',
    padding: '22px',
    border: '1px solid #343d4d',
  },

  metricTitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#b7c0cd',
  },

  metricValue: {
    margin: '10px 0 0 0',
    fontSize: '2.3rem',
    fontWeight: '800',
    color: '#f4f66b',
  },

  apartmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '18px',
  },

  apartmentCard: {
    background: '#1f2530',
    borderRadius: '20px',
    padding: '22px',
    border: '1px solid #343d4d',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  enterpriseLabel: {
    margin: 0,
    color: '#b7c0cd',
    fontSize: '0.95rem',
  },

  apartmentTitle: {
    margin: 0,
    color: '#ffffff',
    fontSize: '1.5rem',
    fontWeight: '800',
  },

  infoText: {
    margin: 0,
    color: '#d1d5db',
    fontSize: '0.96rem',
  },

  statusBadge: {
    display: 'inline-block',
    borderRadius: '999px',
    padding: '10px 14px',
    fontSize: '0.9rem',
    fontWeight: '800',
    width: 'fit-content',
    marginTop: '6px',
    marginBottom: '8px',
  },

  primaryButton: {
    height: '48px',
    border: 'none',
    borderRadius: '14px',
    background: '#f4f66b',
    color: '#111827',
    fontWeight: '800',
    cursor: 'pointer',
    padding: '0 18px',
    fontSize: '1rem',
  },

  secondaryButton: {
    height: '48px',
    border: '1px solid #343d4d',
    borderRadius: '14px',
    background: '#222938',
    color: '#ffffff',
    fontWeight: '800',
    cursor: 'pointer',
    padding: '0 18px',
  },

  dangerButton: {
    minHeight: '46px',
    border: 'none',
    borderRadius: '14px',
    background: '#ef4444',
    color: '#ffffff',
    fontWeight: '800',
    cursor: 'pointer',
    padding: '0 18px',
  },

  successText: {
    marginTop: '14px',
    color: '#4ade80',
    fontWeight: '700',
  },

  errorText: {
    marginTop: '14px',
    color: '#f87171',
    fontWeight: '700',
  },
};