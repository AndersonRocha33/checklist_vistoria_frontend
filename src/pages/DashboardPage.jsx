import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [enterprises, setEnterprises] = useState([]);
  const [apartments, setApartments] = useState([]);

  const [selectedEnterprise, setSelectedEnterprise] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NUMBER');

  useEffect(() => {
    loadEnterprises();
    loadAllApartments();
  }, []);

  async function loadEnterprises() {
    try {
      const response = await api.get('/enterprises');
      setEnterprises(response.data);
    } catch (error) {
      console.error(error);
      setUploadError('Erro ao carregar empreendimentos.');
    }
  }

  async function loadAllApartments() {
    try {
      const response = await api.get('/apartments');
      setApartments(response.data);
    } catch (error) {
      console.error(error);
      setUploadError('Erro ao carregar apartamentos.');
    }
  }

  async function handleStartInspection(apartmentId) {
    try {
      const response = await api.post('/inspections/start', { apartmentId });
      navigate(`/inspection/${response.data.id}`);
    } catch (error) {
      console.error(error);
      alert('Erro ao iniciar vistoria.');
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
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadMessage(
        `${response.data.message} Linhas: ${response.data.totalLinhasProcessadas}, empreendimentos criados: ${response.data.totalEmpreendimentosCriados}, apartamentos criados: ${response.data.totalApartamentosCriados}, itens criados: ${response.data.totalItensCriados}, linhas ignoradas: ${response.data.totalLinhasIgnoradas}.`
      );

      setCsvFile(null);
      const input = document.getElementById('csv-input');
      if (input) input.value = '';

      await loadEnterprises();
      await loadAllApartments();
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

  function getStatusLabel(status) {
    const labels = {
      NAO_VISTORIADO: 'Não vistoriado',
      EM_VISTORIA: 'Em vistoria',
      VISTORIADO: 'Vistoriado',
      VISTORIADO_COM_PENDENCIA: 'Com pendência'
    };

    return labels[status] || status;
  }

  function getStatusClass(status) {
    const classes = {
      NAO_VISTORIADO: 'status-badge status-gray',
      EM_VISTORIA: 'status-badge status-blue',
      VISTORIADO: 'status-badge status-green',
      VISTORIADO_COM_PENDENCIA: 'status-badge status-yellow'
    };

    return classes[status] || 'status-badge status-gray';
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
          String(a.enterpriseName).toLowerCase().includes(term)
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
        return String(a.number).localeCompare(String(b.number), 'pt-BR', { numeric: true });
      });
    } else if (sortBy === 'ENTERPRISE') {
      result.sort((a, b) => {
        const enterpriseCompare = String(a.enterpriseName).localeCompare(
          String(b.enterpriseName),
          'pt-BR'
        );

        if (enterpriseCompare !== 0) return enterpriseCompare;

        return String(a.number).localeCompare(String(b.number), 'pt-BR', { numeric: true });
      });
    } else {
      result.sort((a, b) =>
        String(a.number).localeCompare(String(b.number), 'pt-BR', { numeric: true })
      );
    }

    return result;
  }, [apartments, selectedEnterprise, search, statusFilter, sortBy]);

  const metrics = useMemo(() => {
    return {
      total: filteredApartments.length,
      naoVistoriado: filteredApartments.filter((a) => a.inspectionStatus === 'NAO_VISTORIADO').length,
      emVistoria: filteredApartments.filter((a) => a.inspectionStatus === 'EM_VISTORIA').length,
      vistoriado: filteredApartments.filter((a) => a.inspectionStatus === 'VISTORIADO').length,
      comPendencia: filteredApartments.filter((a) => a.inspectionStatus === 'VISTORIADO_COM_PENDENCIA').length
    };
  }, [filteredApartments]);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h2>Checklist de Entrega</h2>
          <p>Usuário responsável: {user?.name}</p>
        </div>
        <button onClick={logout}>Sair</button>
      </header>

      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>Importar checklist via CSV</h3>

        <form onSubmit={handleCsvUpload} className="form">
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files[0])}
          />

          <button type="submit" disabled={uploading}>
            {uploading ? 'Importando...' : 'Importar CSV'}
          </button>

          {uploadMessage && <p className="success">{uploadMessage}</p>}
          {uploadError && <p className="error">{uploadError}</p>}
        </form>
      </div>

      <div className="card filters">
        <select
          value={selectedEnterprise}
          onChange={(e) => setSelectedEnterprise(e.target.value)}
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
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">Todos os status</option>
          <option value="NAO_VISTORIADO">Não vistoriado</option>
          <option value="EM_VISTORIA">Em vistoria</option>
          <option value="VISTORIADO">Vistoriado</option>
          <option value="VISTORIADO_COM_PENDENCIA">Com pendência</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="NUMBER">Ordenar por número</option>
          <option value="ENTERPRISE">Ordenar por empreendimento</option>
          <option value="PENDENCY">Mais pendências primeiro</option>
        </select>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Total</h4>
          <p>{metrics.total}</p>
        </div>

        <div className="metric-card">
          <h4>Não vistoriados</h4>
          <p>{metrics.naoVistoriado}</p>
        </div>

        <div className="metric-card">
          <h4>Em vistoria</h4>
          <p>{metrics.emVistoria}</p>
        </div>

        <div className="metric-card">
          <h4>Vistoriados</h4>
          <p>{metrics.vistoriado}</p>
        </div>

        <div className="metric-card">
          <h4>Com pendência</h4>
          <p>{metrics.comPendencia}</p>
        </div>
      </div>

      {filteredApartments.length === 0 && (
        <div className="card">
          <p>Nenhum apartamento encontrado com os filtros atuais.</p>
        </div>
      )}

      <div className="apartment-grid">
        {filteredApartments.map((apartment) => (
          <div key={apartment.id} className="apartment-card">
            <p className="enterprise-label">{apartment.enterpriseName}</p>
            <h3>Apto {apartment.number}</h3>
            <p>Itens distintos: {apartment.totalDistinctItems}</p>
            <p>Conformes: {apartment.conformeCount}</p>
            <p>Não conformes: {apartment.naoConformeCount}</p>
            <p>Pendentes: {apartment.pendenteCount}</p>

            <p>
              <span className={getStatusClass(apartment.inspectionStatus)}>
                {getStatusLabel(apartment.inspectionStatus)}
              </span>
            </p>

            <button onClick={() => handleStartInspection(apartment.id)}>
              Abrir vistoria
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}