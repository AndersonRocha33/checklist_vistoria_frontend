import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api.js';

function SignaturePad({ canvasRef, onChangePreview }) {
  const isDrawingRef = useRef(false);

  function getPosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();

    const clientX =
      event.touches && event.touches.length > 0
        ? event.touches[0].clientX
        : event.clientX;

    const clientY =
      event.touches && event.touches.length > 0
        ? event.touches[0].clientY
        : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function startDrawing(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const pos = getPosition(event, canvas);

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(event) {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingRef.current) return;

    const ctx = canvas.getContext('2d');
    const pos = getPosition(event, canvas);

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDrawing() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isDrawingRef.current = false;
    onChangePreview(canvas.toDataURL('image/png'));
  }

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={220}
      style={styles.signatureCanvas}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={endDrawing}
    />
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function compressImageToDataUrl(file, maxWidth = 1280, quality = 0.72) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);

  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, maxWidth / image.width);
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

export default function InspectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState(null);
  const [draftItems, setDraftItems] = useState([]);
  const [savingItemId, setSavingItemId] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [savingBulk, setSavingBulk] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('TODOS');
  const [inspectorPreview, setInspectorPreview] = useState('');
  const [clientPreview, setClientPreview] = useState('');
  const [savingInspectorSignature, setSavingInspectorSignature] = useState(false);
  const [savingClientSignature, setSavingClientSignature] = useState(false);

  const inspectorCanvasRef = useRef(null);
  const clientCanvasRef = useRef(null);

  useEffect(() => {
    loadInspection();
  }, [id]);

  useEffect(() => {
    return () => {
      draftItems.forEach((item) => {
        if (item.localPreviewUrl) {
          URL.revokeObjectURL(item.localPreviewUrl);
        }
      });
    };
  }, [draftItems]);

  async function loadInspection() {
    try {
      const response = await api.get(`/inspections/${id}`);
      const inspectionData = response.data;

      const sortedItems = [...inspectionData.items].sort((a, b) => {
        const locationCompare = (a.checklistItem.location || '').localeCompare(
          b.checklistItem.location || '',
          'pt-BR'
        );

        if (locationCompare !== 0) return locationCompare;

        return (a.checklistItem.itemName || '').localeCompare(
          b.checklistItem.itemName || '',
          'pt-BR'
        );
      });

      setInspection({
        ...inspectionData,
        items: sortedItems,
      });

      setDraftItems(
        sortedItems.map((item) => ({
          id: item.id,
          status: item.status,
          notes: item.notes || '',
          photoUrl: item.photoUrl || '',
          selectedFile: null,
          localPreviewUrl: '',
        }))
      );

      setSelectedItemIds([]);
      setSelectedLocation('TODOS');

      if (inspectionData.reopenedFromPending) {
        setSavedItemIds(
          sortedItems
            .filter((item) => item.status === 'CONFORME')
            .map((item) => item.id)
        );
      } else {
        setSavedItemIds(
          sortedItems
            .filter((item) => item.status !== 'PENDENTE')
            .map((item) => item.id)
        );
      }

      setInspectorPreview(inspectionData.inspectorSignature || '');
      setClientPreview(inspectionData.clientSignature || '');
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar vistoria.');
    }
  }

  function updateDraftItem(itemId, field, value) {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  }

  function getDraftItem(itemId) {
    return draftItems.find((item) => item.id === itemId);
  }

  function handleStatusChange(itemId, status) {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        if (status === 'CONFORME') {
          if (item.localPreviewUrl) {
            URL.revokeObjectURL(item.localPreviewUrl);
          }

          return {
            ...item,
            status,
            notes: '',
            photoUrl: '',
            selectedFile: null,
            localPreviewUrl: '',
          };
        }

        return {
          ...item,
          status,
        };
      })
    );
  }

  function toggleItemSelection(itemId) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((currentId) => currentId !== itemId)
        : [...prev, itemId]
    );
  }

  function toggleSelectAllVisibleItems(checked, itemsToSelect) {
    if (checked) {
      const visibleIds = itemsToSelect.map((item) => item.id);
      setSelectedItemIds(visibleIds);
      return;
    }

    setSelectedItemIds([]);
  }

  function markSelectedAsConforme() {
    if (selectedItemIds.length === 0) {
      alert('Selecione ao menos um item.');
      return;
    }

    setDraftItems((prev) =>
      prev.map((item) => {
        if (!selectedItemIds.includes(item.id)) return item;

        if (item.localPreviewUrl) {
          URL.revokeObjectURL(item.localPreviewUrl);
        }

        return {
          ...item,
          status: 'CONFORME',
          notes: '',
          photoUrl: '',
          selectedFile: null,
          localPreviewUrl: '',
        };
      })
    );
  }

  function handleSelectPhoto(itemId, file) {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        if (item.localPreviewUrl) {
          URL.revokeObjectURL(item.localPreviewUrl);
        }

        return {
          ...item,
          selectedFile: file,
          localPreviewUrl: previewUrl,
        };
      })
    );
  }

  async function resolveFinalPhotoValue(draft) {
    if (!draft) return '';

    if (draft.selectedFile) {
      return compressImageToDataUrl(draft.selectedFile);
    }

    return draft.photoUrl || '';
  }

  async function handleSaveItem(itemId) {
    try {
      setSavingItemId(itemId);

      const draft = getDraftItem(itemId);
      if (!draft) throw new Error('Item não encontrado para salvar.');

      const finalPhotoUrl = await resolveFinalPhotoValue(draft);

      await api.put(`/inspections/item/${itemId}`, {
        status: draft.status,
        notes: draft.notes,
        photoUrl: finalPhotoUrl,
      });

      setInspection((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: draft.status,
                notes: draft.notes,
                photoUrl: finalPhotoUrl,
              }
            : item
        ),
      }));

      setDraftItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;

          if (item.localPreviewUrl) {
            URL.revokeObjectURL(item.localPreviewUrl);
          }

          return {
            ...item,
            status: draft.status,
            notes: draft.notes,
            photoUrl: finalPhotoUrl,
            selectedFile: null,
            localPreviewUrl: '',
          };
        })
      );

      setSavedItemIds((prev) => [...new Set([...prev, itemId])]);
      setSelectedItemIds((prev) =>
        prev.filter((currentId) => currentId !== itemId)
      );
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Erro ao salvar item.'
      );
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleSaveSelectedItems() {
    try {
      if (selectedItemIds.length === 0) {
        alert('Selecione ao menos um item.');
        return;
      }

      setSavingBulk(true);

      for (const itemId of selectedItemIds) {
        const draft = getDraftItem(itemId);
        if (!draft) continue;

        const finalPhotoUrl = await resolveFinalPhotoValue(draft);

        await api.put(`/inspections/item/${itemId}`, {
          status: draft.status,
          notes: draft.notes,
          photoUrl: finalPhotoUrl,
        });

        setInspection((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: draft.status,
                  notes: draft.notes,
                  photoUrl: finalPhotoUrl,
                }
              : item
          ),
        }));

        setDraftItems((prev) =>
          prev.map((item) => {
            if (item.id !== itemId) return item;

            if (item.localPreviewUrl) {
              URL.revokeObjectURL(item.localPreviewUrl);
            }

            return {
              ...item,
              status: draft.status,
              notes: draft.notes,
              photoUrl: finalPhotoUrl,
              selectedFile: null,
              localPreviewUrl: '',
            };
          })
        );

        setSavedItemIds((prev) => [...new Set([...prev, itemId])]);
      }

      setSelectedItemIds([]);
      alert('Itens selecionados salvos com sucesso.');
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Erro ao salvar itens selecionados.'
      );
    } finally {
      setSavingBulk(false);
    }
  }

  function buildCompressedSignatureData(canvasRef) {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const targetCanvas = document.createElement('canvas');
    const targetWidth = 500;
    const targetHeight = 180;

    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;

    const ctx = targetCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

    return targetCanvas.toDataURL('image/jpeg', 0.75);
  }

  async function handleSaveInspectorSignature() {
    try {
      const signatureData = buildCompressedSignatureData(inspectorCanvasRef);

      if (!inspectorPreview || !signatureData) {
        alert('Assine no campo do vistoriador antes de salvar.');
        return;
      }

      setSavingInspectorSignature(true);

      await api.put(`/inspections/${id}/signatures`, {
        inspectorSignature: signatureData,
      });

      setInspectorPreview(signatureData);
      setInspection((prev) => ({
        ...prev,
        inspectorSignature: signatureData,
      }));

      alert('Assinatura do vistoriador salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Erro ao salvar assinatura do vistoriador.'
      );
    } finally {
      setSavingInspectorSignature(false);
    }
  }

  async function handleSaveClientSignature() {
    try {
      const signatureData = buildCompressedSignatureData(clientCanvasRef);

      if (!clientPreview || !signatureData) {
        alert('Assine no campo do cliente antes de salvar.');
        return;
      }

      setSavingClientSignature(true);

      await api.put(`/inspections/${id}/signatures`, {
        clientSignature: signatureData,
      });

      setClientPreview(signatureData);
      setInspection((prev) => ({
        ...prev,
        clientSignature: signatureData,
      }));

      alert('Assinatura do cliente salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Erro ao salvar assinatura do cliente.'
      );
    } finally {
      setSavingClientSignature(false);
    }
  }

  async function handleFinishInspection() {
    try {
      setFinishing(true);

      await api.put(`/inspections/${id}/finish`);

      alert('Vistoria finalizada com sucesso.');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Erro ao finalizar vistoria.'
      );
    } finally {
      setFinishing(false);
    }
  }

  async function handleDownloadReport() {
    try {
      const response = await api.get(`/inspections/${id}/report`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `vistoria-${inspection.apartment.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar relatório.');
    }
  }

  function clearCanvas(canvasRef, setPreview) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPreview('');
  }

  const baseVisibleItems = useMemo(() => {
    if (!inspection) return [];

    if (inspection.reopenedFromPending) {
      return inspection.items.filter(
        (item) =>
          item.status === 'NAO_CONFORME' && !savedItemIds.includes(item.id)
      );
    }

    return inspection.items.filter(
      (item) => item.status === 'PENDENTE' && !savedItemIds.includes(item.id)
    );
  }, [inspection, savedItemIds]);

  const locations = useMemo(() => {
    const uniqueLocations = [
      ...new Set(
        baseVisibleItems.map(
          (item) => item.checklistItem.location || 'Sem localização'
        )
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return ['TODOS', ...uniqueLocations];
  }, [baseVisibleItems]);

  const visibleItems = useMemo(() => {
    if (selectedLocation === 'TODOS') {
      return baseVisibleItems;
    }

    return baseVisibleItems.filter(
      (item) =>
        (item.checklistItem.location || 'Sem localização') === selectedLocation
    );
  }, [baseVisibleItems, selectedLocation]);

  const groupedItems = useMemo(() => {
    const groups = {};

    visibleItems.forEach((item) => {
      const location = item.checklistItem.location || 'Sem localização';
      if (!groups[location]) groups[location] = [];
      groups[location].push(item);
    });

    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((location) => ({
        location,
        items: groups[location],
      }));
  }, [visibleItems]);

  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedItemIds.includes(item.id));

  if (!inspection) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.loadingText}>Carregando vistoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerCard}>
        <div>
          <h1 style={styles.title}>
            {inspection.apartment.enterprise.name} - Apto {inspection.apartment.number}
          </h1>
          <p style={styles.metaText}>
            <strong>Responsável:</strong> {inspection.user.name}
          </p>
          <p style={styles.metaText}>
            <strong>Status da vistoria:</strong> {inspection.status}
          </p>
          {inspection.reopenedFromPending && (
            <p style={styles.reviewText}>
              Modo de revisão: exibindo apenas itens com pendência.
            </p>
          )}
        </div>

        <div style={styles.headerButtons}>
          <button style={styles.secondaryButton} onClick={handleDownloadReport}>
            Gerar relatório PDF
          </button>

          <button
            style={styles.primaryButton}
            onClick={handleFinishInspection}
            disabled={finishing}
          >
            {finishing ? 'Finalizando...' : 'Finalizar vistoria'}
          </button>
        </div>
      </div>

      {baseVisibleItems.length > 0 && (
        <>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Filtro</h2>

            <div style={styles.fieldBlock}>
              <label style={styles.fieldLabel}>Filtrar por ambiente</label>
              <select
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  setSelectedItemIds([]);
                }}
                style={styles.input}
              >
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Ações em massa</h2>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) =>
                  toggleSelectAllVisibleItems(e.target.checked, visibleItems)
                }
              />
              <span>Selecionar todos os itens visíveis</span>
            </label>

            <div style={styles.bulkColumn}>
              <button
                style={styles.secondaryButton}
                onClick={markSelectedAsConforme}
              >
                Marcar selecionados como conforme
              </button>

              <button
                style={styles.primaryButton}
                onClick={handleSaveSelectedItems}
                disabled={savingBulk}
              >
                {savingBulk ? 'Salvando...' : 'Salvar itens selecionados'}
              </button>
            </div>

            <p style={styles.selectedInfo}>
              Itens visíveis: {visibleItems.length} | Selecionados: {selectedItemIds.length}
            </p>
          </div>
        </>
      )}

      {groupedItems.length === 0 && (
        <div style={styles.card}>
          <p style={styles.emptyText}>
            {inspection.reopenedFromPending
              ? 'Não há itens com pendência para exibir.'
              : 'Todos os itens desta etapa já foram tratados.'}
          </p>
        </div>
      )}

      {groupedItems.map((group) => (
        <div key={group.location} style={styles.groupSection}>
          <h2 style={styles.groupTitle}>{group.location}</h2>

          <div style={styles.itemsColumn}>
            {group.items.map((item) => {
              const draft = getDraftItem(item.id);
              const currentStatus = draft?.status || item.status;
              const previewToShow =
                draft?.localPreviewUrl || draft?.photoUrl || item.photoUrl || '';
              const isNaoConforme = currentStatus === 'NAO_CONFORME';

              return (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.itemTopRow}>
                    <label style={styles.checkboxRowNoMargin}>
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                      />
                      <span>Selecionar</span>
                    </label>
                  </div>

                  <h3 style={styles.itemTitle}>{item.checklistItem.itemName}</h3>

                  <div style={styles.infoCompactRow}>
                    <p style={styles.infoBadge}>
                      <strong>Qtd:</strong> {item.checklistItem.quantity}
                    </p>
                    <p style={styles.infoBadge}>
                      <strong>Status:</strong>{' '}
                      {currentStatus === 'PENDENTE'
                        ? 'Pendente'
                        : currentStatus === 'CONFORME'
                        ? 'Conforme'
                        : 'Não conforme'}
                    </p>
                  </div>

                  <div style={styles.statusButtonRow}>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'CONFORME')}
                      style={{
                        ...styles.statusButton,
                        ...(currentStatus === 'CONFORME'
                          ? styles.statusButtonActiveConforme
                          : styles.statusButtonInactive),
                      }}
                    >
                      Conforme
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'NAO_CONFORME')}
                      style={{
                        ...styles.statusButton,
                        ...(currentStatus === 'NAO_CONFORME'
                          ? styles.statusButtonActiveNaoConforme
                          : styles.statusButtonInactive),
                      }}
                    >
                      Não conforme
                    </button>
                  </div>

                  {isNaoConforme && (
                    <>
                      <div style={styles.fieldBlock}>
                        <label style={styles.fieldLabel}>Observações</label>
                        <textarea
                          placeholder="Descreva a observação do item"
                          value={draft?.notes || ''}
                          onChange={(e) =>
                            updateDraftItem(item.id, 'notes', e.target.value)
                          }
                          style={styles.textarea}
                        />
                      </div>

                      <div style={styles.fieldBlock}>
                        <label style={styles.fieldLabel}>Foto do item</label>

                        <div style={styles.photoButtonsColumn}>
                          <label style={styles.photoButton}>
                            Tirar foto
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) =>
                                handleSelectPhoto(item.id, e.target.files[0])
                              }
                              style={{ display: 'none' }}
                            />
                          </label>

                          <label style={styles.photoButtonSecondary}>
                            Escolher da galeria
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleSelectPhoto(item.id, e.target.files[0])
                              }
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>

                        {draft?.selectedFile && (
                          <p style={styles.fileName}>
                            Foto selecionada: {draft.selectedFile.name}
                          </p>
                        )}

                        {previewToShow && (
                          <img
                            src={previewToShow}
                            alt="Item"
                            style={styles.imagePreview}
                          />
                        )}
                      </div>

                      <button
                        style={styles.primaryButton}
                        onClick={() => handleSaveItem(item.id)}
                        disabled={savingItemId === item.id}
                      >
                        {savingItemId === item.id ? 'Salvando...' : 'Salvar item'}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Assinatura do vistoriador</h2>

        <div style={styles.signatureBox}>
          <SignaturePad
            canvasRef={inspectorCanvasRef}
            onChangePreview={setInspectorPreview}
          />
        </div>

        {inspectorPreview && (
          <img
            src={inspectorPreview}
            alt="Assinatura do vistoriador"
            style={styles.signaturePreview}
          />
        )}

        <div style={styles.signatureButtons}>
          <button
            style={styles.primaryButton}
            onClick={handleSaveInspectorSignature}
            disabled={savingInspectorSignature}
          >
            {savingInspectorSignature
              ? 'Salvando...'
              : 'Salvar assinatura do vistoriador'}
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => clearCanvas(inspectorCanvasRef, setInspectorPreview)}
          >
            Limpar assinatura do vistoriador
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Assinatura do cliente</h2>

        <div style={styles.signatureBox}>
          <SignaturePad
            canvasRef={clientCanvasRef}
            onChangePreview={setClientPreview}
          />
        </div>

        {clientPreview && (
          <img
            src={clientPreview}
            alt="Assinatura do cliente"
            style={styles.signaturePreview}
          />
        )}

        <div style={styles.signatureButtons}>
          <button
            style={styles.primaryButton}
            onClick={handleSaveClientSignature}
            disabled={savingClientSignature}
          >
            {savingClientSignature
              ? 'Salvando...'
              : 'Salvar assinatura do cliente'}
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => clearCanvas(clientCanvasRef, setClientPreview)}
          >
            Limpar assinatura do cliente
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f3f4f6',
    padding: '16px',
    paddingBottom: '32px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '18px',
    padding: '16px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
    marginBottom: '16px',
  },
  headerCard: {
    background: '#ffffff',
    borderRadius: '18px',
    padding: '18px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    fontSize: '1.9rem',
    lineHeight: 1.15,
    marginBottom: '12px',
    color: '#0f172a',
  },
  metaText: {
    fontSize: '1rem',
    color: '#334155',
    marginBottom: '8px',
  },
  reviewText: {
    fontSize: '0.95rem',
    color: '#b45309',
    background: '#fef3c7',
    borderRadius: '12px',
    padding: '10px 12px',
    marginTop: '8px',
  },
  headerButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  primaryButton: {
    width: '100%',
    minHeight: '48px',
    border: 'none',
    borderRadius: '14px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '1rem',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  secondaryButton: {
    width: '100%',
    minHeight: '48px',
    border: 'none',
    borderRadius: '14px',
    background: '#e2e8f0',
    color: '#0f172a',
    fontWeight: '700',
    fontSize: '1rem',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: '1.3rem',
    marginBottom: '12px',
    color: '#0f172a',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '600',
    fontSize: '1rem',
    color: '#0f172a',
    marginBottom: '12px',
  },
  checkboxRowNoMargin: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '600',
    fontSize: '0.95rem',
    color: '#0f172a',
    margin: 0,
  },
  bulkColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  selectedInfo: {
    marginTop: '10px',
    color: '#475569',
    fontWeight: '600',
  },
  groupSection: {
    marginBottom: '18px',
  },
  groupTitle: {
    fontSize: '1.5rem',
    color: '#111827',
    marginBottom: '10px',
    paddingLeft: '4px',
  },
  itemsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  itemCard: {
    background: '#ffffff',
    borderRadius: '18px',
    padding: '16px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
  },
  itemTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  itemTitle: {
    fontSize: '1.25rem',
    lineHeight: 1.25,
    marginBottom: '12px',
    color: '#0f172a',
  },
  infoCompactRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '14px',
  },
  infoBadge: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '999px',
    padding: '8px 12px',
    color: '#334155',
    fontSize: '0.95rem',
    margin: 0,
  },
  fieldBlock: {
    marginBottom: '14px',
  },
  fieldLabel: {
    display: 'block',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#0f172a',
  },
  input: {
    width: '100%',
    minHeight: '48px',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    padding: '12px 14px',
    fontSize: '1rem',
    background: '#ffffff',
    color: '#111827',
  },
  statusButtonRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '14px',
  },
  statusButton: {
    minHeight: '48px',
    borderRadius: '14px',
    border: 'none',
    fontWeight: '700',
    fontSize: '0.98rem',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  statusButtonInactive: {
    background: '#e2e8f0',
    color: '#0f172a',
  },
  statusButtonActiveConforme: {
    background: '#16a34a',
    color: '#ffffff',
  },
  statusButtonActiveNaoConforme: {
    background: '#dc2626',
    color: '#ffffff',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    padding: '12px 14px',
    fontSize: '1rem',
    resize: 'vertical',
    background: '#ffffff',
    color: '#111827',
  },
  photoButtonsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  photoButton: {
    width: '100%',
    minHeight: '48px',
    borderRadius: '14px',
    background: '#2563eb',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  photoButtonSecondary: {
    width: '100%',
    minHeight: '48px',
    borderRadius: '14px',
    background: '#475569',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  fileName: {
    marginTop: '10px',
    color: '#475569',
    fontSize: '0.95rem',
  },
  imagePreview: {
    width: '100%',
    maxHeight: '260px',
    objectFit: 'cover',
    borderRadius: '14px',
    marginTop: '12px',
    border: '1px solid #e2e8f0',
  },
  signatureBox: {
    border: '2px dashed #cbd5e1',
    borderRadius: '16px',
    overflow: 'hidden',
    background: '#ffffff',
  },
  signatureCanvas: {
    width: '100%',
    height: '220px',
    display: 'block',
    background: '#ffffff',
    touchAction: 'none',
  },
  signaturePreview: {
    width: '100%',
    borderRadius: '14px',
    marginTop: '12px',
    border: '1px solid #e2e8f0',
  },
  signatureButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
  },
  loadingText: {
    color: '#334155',
    fontSize: '1rem',
  },
  emptyText: {
    color: '#475569',
    fontSize: '1rem',
  },
};