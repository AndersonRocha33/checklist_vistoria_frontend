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
    ctx.strokeStyle = '#000000';
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
      height={200}
      className="signature-canvas"
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

export default function InspectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState(null);
  const [draftItems, setDraftItems] = useState([]);
  const [savingItemId, setSavingItemId] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('CONFORME');
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState([]);
  const [inspectorPreview, setInspectorPreview] = useState('');
  const [clientPreview, setClientPreview] = useState('');
  const [savingInspectorSignature, setSavingInspectorSignature] = useState(false);
  const [savingClientSignature, setSavingClientSignature] = useState(false);

  const inspectorCanvasRef = useRef(null);
  const clientCanvasRef = useRef(null);

  useEffect(() => {
    loadInspection();
  }, [id]);

  async function loadInspection() {
    try {
      const response = await api.get(`/inspections/${id}`);
      const inspectionData = response.data;

      const sortedItems = [...inspectionData.items].sort((a, b) => {
        const locationCompare = a.checklistItem.location.localeCompare(
          b.checklistItem.location,
          'pt-BR'
        );

        if (locationCompare !== 0) return locationCompare;

        return a.checklistItem.itemName.localeCompare(
          b.checklistItem.itemName,
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

  function toggleItemSelection(itemId) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((currentId) => currentId !== itemId)
        : [...prev, itemId]
    );
  }

  function toggleSelectAllVisibleItems(checked, visibleItems) {
    if (checked) {
      setSelectedItemIds(visibleItems.map((item) => item.id));
      return;
    }

    setSelectedItemIds([]);
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

  async function handleSaveItem(itemId) {
    try {
      setSavingItemId(itemId);

      const draft = getDraftItem(itemId);
      if (!draft) throw new Error('Item não encontrado para salvar.');

      let finalPhotoUrl = draft.photoUrl || '';

      if (draft.selectedFile) {
        const formData = new FormData();
        formData.append('file', draft.selectedFile);

        const uploadResponse = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        finalPhotoUrl = uploadResponse.data.fileUrl;
      }

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

  async function handleApplyBulkStatus() {
    if (selectedItemIds.length === 0) {
      alert('Selecione ao menos um item.');
      return;
    }

    setApplyingBulk(true);

    try {
      setDraftItems((prev) =>
        prev.map((item) =>
          selectedItemIds.includes(item.id)
            ? { ...item, status: bulkStatus }
            : item
        )
      );
    } finally {
      setApplyingBulk(false);
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

        let finalPhotoUrl = draft.photoUrl || '';

        if (draft.selectedFile) {
          const formData = new FormData();
          formData.append('file', draft.selectedFile);

          const uploadResponse = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          finalPhotoUrl = uploadResponse.data.fileUrl;
        }

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
      console.error('Erro ao salvar assinatura do vistoriador:', error);
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
      console.error('Erro ao salvar assinatura do cliente:', error);
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

  const visibleItems = useMemo(() => {
    if (!inspection) return [];

    if (inspection.reopenedFromPending) {
      return inspection.items.filter(
        (item) => item.status === 'NAO_CONFORME' && !savedItemIds.includes(item.id)
      );
    }

    return inspection.items.filter(
      (item) => item.status === 'PENDENTE' && !savedItemIds.includes(item.id)
    );
  }, [inspection, savedItemIds]);

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
      <div className="page">
        <div className="card">
          <p>Carregando vistoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card inspection-header-card">
        <div>
          <h2>
            {inspection.apartment.enterprise.name} - Apto {inspection.apartment.number}
          </h2>
          <p>Responsável: {inspection.user.name}</p>
          <p>Status da vistoria: {inspection.status}</p>
          {inspection.reopenedFromPending && (
            <p>Modo de revisão: exibindo apenas itens com pendência.</p>
          )}
        </div>

        <div className="inspection-header-actions">
          <button onClick={handleDownloadReport}>Gerar relatório PDF</button>
          <button onClick={handleFinishInspection} disabled={finishing}>
            {finishing ? 'Finalizando...' : 'Finalizar vistoria'}
          </button>
        </div>
      </div>

      {visibleItems.length > 0 && (
        <div className="card bulk-actions-card">
          <div className="bulk-actions-row">
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => toggleSelectAllVisibleItems(e.target.checked, visibleItems)}
              />
              Selecionar todos os itens visíveis
            </label>
          </div>

          <div className="bulk-actions-row">
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
              <option value="CONFORME">Conforme</option>
              <option value="NAO_CONFORME">Não conforme</option>
              <option value="PENDENTE">Pendente</option>
            </select>

            <button onClick={handleApplyBulkStatus} disabled={applyingBulk}>
              {applyingBulk ? 'Aplicando...' : 'Aplicar status nos selecionados'}
            </button>

            <button onClick={handleSaveSelectedItems} disabled={savingBulk}>
              {savingBulk ? 'Salvando...' : 'Salvar itens selecionados'}
            </button>
          </div>

          <p>Itens selecionados: {selectedItemIds.length}</p>
        </div>
      )}

      {groupedItems.length === 0 && (
        <div className="card">
          <p>
            {inspection.reopenedFromPending
              ? 'Não há itens com pendência para exibir.'
              : 'Todos os itens desta etapa já foram tratados.'}
          </p>
        </div>
      )}

      {groupedItems.map((group) => (
        <div key={group.location} className="location-group">
          <div className="location-title">
            <h3>{group.location}</h3>
          </div>

          <div className="inspection-list">
            {group.items.map((item) => {
              const draft = getDraftItem(item.id);
              const previewToShow =
                draft?.localPreviewUrl || draft?.photoUrl || item.photoUrl || '';

              return (
                <div key={item.id} className="inspection-item-card">
                  <label className="checkbox-inline checkbox-top">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                    />
                    Selecionar item
                  </label>

                  <h3>{item.checklistItem.itemName}</h3>
                  <p>
                    <strong>Localização:</strong> {item.checklistItem.location}
                  </p>
                  <p>
                    <strong>Quantidade:</strong> {item.checklistItem.quantity}
                  </p>

                  <label className="field-label">Status</label>
                  <select
                    value={draft?.status || item.status}
                    onChange={(e) => updateDraftItem(item.id, 'status', e.target.value)}
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="CONFORME">Conforme</option>
                    <option value="NAO_CONFORME">Não conforme</option>
                  </select>

                  <label className="field-label">Observações</label>
                  <textarea
                    placeholder="Descreva a observação do item"
                    value={draft?.notes || ''}
                    onChange={(e) => updateDraftItem(item.id, 'notes', e.target.value)}
                  />

                  <label className="field-label">Foto do item</label>

                  <div className="photo-actions">
                    <label className="photo-button">
                      Tirar foto
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleSelectPhoto(item.id, e.target.files[0])}
                      />
                    </label>

                    <label className="photo-button photo-button-secondary">
                      Galeria
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSelectPhoto(item.id, e.target.files[0])}
                      />
                    </label>
                  </div>

                  {draft?.selectedFile && (
                    <p className="selected-file-name">
                      Foto selecionada: {draft.selectedFile.name}
                    </p>
                  )}

                  {previewToShow && (
                    <img
                      src={previewToShow}
                      alt="Item"
                      className="item-image"
                    />
                  )}

                  <button
                    onClick={() => handleSaveItem(item.id)}
                    disabled={savingItemId === item.id}
                  >
                    {savingItemId === item.id ? 'Salvando...' : 'Salvar item'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="card signature-card">
        <h3>Assinatura do vistoriador</h3>
        <div className="signature-box">
          <SignaturePad
            canvasRef={inspectorCanvasRef}
            onChangePreview={setInspectorPreview}
          />
        </div>

        {inspectorPreview && (
          <img
            src={inspectorPreview}
            alt="Assinatura do vistoriador"
            className="signature-preview"
          />
        )}

        <div className="signature-actions">
          <button
            onClick={handleSaveInspectorSignature}
            disabled={savingInspectorSignature}
          >
            {savingInspectorSignature
              ? 'Salvando...'
              : 'Salvar assinatura do vistoriador'}
          </button>

          <button onClick={() => clearCanvas(inspectorCanvasRef, setInspectorPreview)}>
            Limpar assinatura do vistoriador
          </button>
        </div>
      </div>

      <div className="card signature-card">
        <h3>Assinatura do cliente</h3>
        <div className="signature-box">
          <SignaturePad
            canvasRef={clientCanvasRef}
            onChangePreview={setClientPreview}
          />
        </div>

        {clientPreview && (
          <img
            src={clientPreview}
            alt="Assinatura do cliente"
            className="signature-preview"
          />
        )}

        <div className="signature-actions">
          <button
            onClick={handleSaveClientSignature}
            disabled={savingClientSignature}
          >
            {savingClientSignature
              ? 'Salvando...'
              : 'Salvar assinatura do cliente'}
          </button>

          <button onClick={() => clearCanvas(clientCanvasRef, setClientPreview)}>
            Limpar assinatura do cliente
          </button>
        </div>
      </div>
    </div>
  );
}