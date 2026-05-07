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
  const [showSavedItems, setShowSavedItems] = useState(false);
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
        if (Array.isArray(item.localPreviewUrls)) {
          item.localPreviewUrls.forEach((url) => {
            if (url && url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
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
          photoUrls: Array.isArray(item.photoUrls)
            ? item.photoUrls
            : item.photoUrl
            ? [item.photoUrl]
            : [],
          selectedFiles: [],
          localPreviewUrls: [],
          isEditingNaoConforme: false,
          queuedAsConforme: false,
          forceEdit: false,
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

  function toggleItemSelection(itemId) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((currentId) => currentId !== itemId)
        : [...prev, itemId]
    );
  }

  function selectAllVisibleItems(itemsToSelect) {
    setSelectedItemIds(itemsToSelect.map((item) => item.id));
  }

  function clearAllSelectedItems() {
    setSelectedItemIds([]);
  }

  function toggleSelectAllVisibleItems(checked, itemsToSelect) {
    if (checked) {
      selectAllVisibleItems(itemsToSelect);
      return;
    }

    clearAllSelectedItems();
  }

  function clearDraftPhotos(item) {
    if (Array.isArray(item.localPreviewUrls)) {
      item.localPreviewUrls.forEach((url) => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
  }

  function markSelectedAsConforme() {
    if (selectedItemIds.length === 0) {
      alert('Selecione ao menos um item.');
      return;
    }

    setDraftItems((prev) =>
      prev.map((item) => {
        if (!selectedItemIds.includes(item.id)) return item;

        clearDraftPhotos(item);

        return {
          ...item,
          status: 'CONFORME',
          notes: '',
          photoUrl: '',
          photoUrls: [],
          selectedFiles: [],
          localPreviewUrls: [],
          isEditingNaoConforme: false,
          queuedAsConforme: true,
          forceEdit: item.forceEdit || false,
        };
      })
    );
  }

  function handleEditSavedItem(itemId) {
    setSavedItemIds((prev) => prev.filter((currentId) => currentId !== itemId));

    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              forceEdit: true,
              isEditingNaoConforme: item.status === 'NAO_CONFORME',
              queuedAsConforme: false,
            }
          : item
      )
    );

    setShowSavedItems(false);
  }

  async function handleDeleteChecklistItem(itemId, itemName) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o item "${itemName}" do checklist?\n\nEle será removido da vistoria, do checklist do apartamento e não aparecerá no relatório.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/inspections/item/${itemId}/checklist`);

      setInspection((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      }));

      setDraftItems((prev) => prev.filter((item) => item.id !== itemId));

      setSavedItemIds((prev) => prev.filter((currentId) => currentId !== itemId));

      setSelectedItemIds((prev) =>
        prev.filter((currentId) => currentId !== itemId)
      );

      alert('Item excluído do checklist com sucesso.');
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Erro ao excluir item do checklist.'
      );
    }
  }

  function handleSelectPhoto(itemId, file) {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const currentFiles = Array.isArray(item.selectedFiles)
          ? [...item.selectedFiles]
          : [];
        const currentPreviewUrls = Array.isArray(item.localPreviewUrls)
          ? [...item.localPreviewUrls]
          : [];

        if (currentFiles.length >= 2) {
          URL.revokeObjectURL(previewUrl);
          alert('Você pode adicionar no máximo 2 fotos por item.');
          return item;
        }

        currentFiles.push(file);
        currentPreviewUrls.push(previewUrl);

        return {
          ...item,
          selectedFiles: currentFiles,
          localPreviewUrls: currentPreviewUrls,
          isEditingNaoConforme: true,
          queuedAsConforme: false,
          forceEdit: true,
        };
      })
    );
  }

  async function resolveFinalPhotoValue(draft) {
    if (!draft) {
      return {
        photoUrl: '',
        photoUrls: [],
      };
    }

    let finalPhotos = [];

    if (Array.isArray(draft.selectedFiles) && draft.selectedFiles.length > 0) {
      for (const file of draft.selectedFiles) {
        const compressed = await compressImageToDataUrl(file);
        finalPhotos.push(compressed);
      }
    } else if (Array.isArray(draft.photoUrls) && draft.photoUrls.length > 0) {
      finalPhotos = draft.photoUrls;
    } else if (draft.photoUrl) {
      finalPhotos = [draft.photoUrl];
    }

    return {
      photoUrl: finalPhotos[0] || '',
      photoUrls: finalPhotos,
    };
  }

  function updateAfterSave(itemId, draft, finalPhotoData) {
    setInspection((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: draft.status,
              notes: draft.notes,
              photoUrl: finalPhotoData.photoUrl,
              photoUrls: finalPhotoData.photoUrls,
            }
          : item
      ),
    }));

    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        clearDraftPhotos(item);

        return {
          ...item,
          status: draft.status,
          notes: draft.notes,
          photoUrl: finalPhotoData.photoUrl,
          photoUrls: finalPhotoData.photoUrls,
          selectedFiles: [],
          localPreviewUrls: [],
          isEditingNaoConforme: false,
          queuedAsConforme: false,
          forceEdit: false,
        };
      })
    );

    setSavedItemIds((prev) => [...new Set([...prev, itemId])]);
    setSelectedItemIds((prev) =>
      prev.filter((currentId) => currentId !== itemId)
    );
  }

  async function persistItem(itemId, customDraft = null) {
    const draft = customDraft || getDraftItem(itemId);

    if (!draft) {
      throw new Error('Item não encontrado para salvar.');
    }

    const finalPhotoData = await resolveFinalPhotoValue(draft);

    const response = await api.put(`/inspections/item/${itemId}`, {
      status: draft.status,
      notes: draft.notes,
      photoUrl: finalPhotoData.photoUrl,
      photoUrls: finalPhotoData.photoUrls,
    });

    const savedItem = response.data;

    updateAfterSave(
      itemId,
      {
        ...draft,
        status: savedItem.status,
        notes: savedItem.notes || '',
      },
      {
        photoUrl: savedItem.photoUrl || finalPhotoData.photoUrl || '',
        photoUrls: Array.isArray(savedItem.photoUrls)
          ? savedItem.photoUrls
          : savedItem.photoUrl
          ? [savedItem.photoUrl]
          : finalPhotoData.photoUrls,
      }
    );
  }

  async function handleStatusChange(itemId, status) {
    if (savingItemId || savingBulk) {
      return;
    }

    if (status === 'CONFORME') {
      const currentDraft = getDraftItem(itemId);
      if (!currentDraft) return;

      const nextDraft = {
        ...currentDraft,
        status: 'CONFORME',
        notes: '',
        photoUrl: '',
        photoUrls: [],
        selectedFiles: [],
        localPreviewUrls: [],
        isEditingNaoConforme: false,
        queuedAsConforme: false,
        forceEdit: currentDraft.forceEdit || false,
      };

      try {
        setSavingItemId(itemId);

        setDraftItems((prev) =>
          prev.map((item) => {
            if (item.id !== itemId) return item;
            clearDraftPhotos(item);
            return nextDraft;
          })
        );

        await persistItem(itemId, nextDraft);
      } catch (error) {
        console.error(error);
        alert(
          error.response?.data?.error ||
            error.response?.data?.message ||
            'Erro ao salvar item como conforme.'
        );
        await loadInspection();
      } finally {
        setSavingItemId(null);
      }

      return;
    }

    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: 'NAO_CONFORME',
              isEditingNaoConforme: true,
              queuedAsConforme: false,
              forceEdit: true,
            }
          : item
      )
    );
  }

  async function handleSaveItem(itemId) {
    try {
      setSavingItemId(itemId);
      await persistItem(itemId);
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
        await persistItem(itemId, draft);
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

  const mergedItems = useMemo(() => {
    if (!inspection) return [];

    return inspection.items.map((item) => {
      const draft = draftItems.find((draftItem) => draftItem.id === item.id);

      const mergedPhotoUrls =
        draft?.localPreviewUrls?.length > 0
          ? draft.localPreviewUrls
          : draft?.photoUrls?.length > 0
          ? draft.photoUrls
          : Array.isArray(item.photoUrls) && item.photoUrls.length > 0
          ? item.photoUrls
          : item.photoUrl
          ? [item.photoUrl]
          : [];

      return {
        ...item,
        status: draft?.status ?? item.status,
        notes: draft?.notes ?? item.notes,
        photoUrl: mergedPhotoUrls[0] || item.photoUrl || '',
        photoUrls: mergedPhotoUrls,
        forceEdit: Boolean(draft?.forceEdit),
      };
    });
  }, [inspection, draftItems]);

  const isReadOnlyFinishedWithoutPending =
    inspection?.status === 'CONCLUIDA' && !inspection?.reopenedFromPending;

  const displayItems = useMemo(() => {
    if (!inspection) return [];

    if (showSavedItems) {
      return mergedItems;
    }

    if (isReadOnlyFinishedWithoutPending) {
      return mergedItems;
    }

    return mergedItems.filter((item) => {
      const draft = draftItems.find((draftItem) => draftItem.id === item.id);

      if (draft?.forceEdit) {
        return true;
      }

      if (inspection.reopenedFromPending) {
        const isPendingNotSaved =
          item.status === 'PENDENTE' && !savedItemIds.includes(item.id);

        const isNaoConformeNotSaved =
          item.status === 'NAO_CONFORME' && !savedItemIds.includes(item.id);

        const isEditingNaoConforme = Boolean(draft?.isEditingNaoConforme);
        const isQueuedAsConforme = Boolean(draft?.queuedAsConforme);

        return (
          isPendingNotSaved ||
          isNaoConformeNotSaved ||
          isEditingNaoConforme ||
          isQueuedAsConforme
        );
      }

      const isPendingAndNotSaved =
        item.status === 'PENDENTE' && !savedItemIds.includes(item.id);

      const isEditingNaoConforme = Boolean(draft?.isEditingNaoConforme);
      const isQueuedAsConforme = Boolean(draft?.queuedAsConforme);

      return isPendingAndNotSaved || isEditingNaoConforme || isQueuedAsConforme;
    });
  }, [
    inspection,
    mergedItems,
    savedItemIds,
    isReadOnlyFinishedWithoutPending,
    draftItems,
    showSavedItems,
  ]);

  const locations = useMemo(() => {
    const uniqueLocations = [
      ...new Set(
        displayItems.map(
          (item) => item.checklistItem.location || 'Sem localização'
        )
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return ['TODOS', ...uniqueLocations];
  }, [displayItems]);

  const visibleItems = useMemo(() => {
    if (selectedLocation === 'TODOS') {
      return displayItems;
    }

    return displayItems.filter(
      (item) =>
        (item.checklistItem.location || 'Sem localização') === selectedLocation
    );
  }, [displayItems, selectedLocation]);

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
    !isReadOnlyFinishedWithoutPending &&
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
              Modo de revisão: exibindo itens pendentes e não conformes.
            </p>
          )}

          {isReadOnlyFinishedWithoutPending && (
            <p style={styles.successNotice}>
              Esta vistoria já foi concluída. Os itens estão sendo exibidos para consulta e geração de relatório.
            </p>
          )}
        </div>

        <div style={styles.headerButtons}>
          <button style={styles.secondaryButton} onClick={handleDownloadReport}>
            Gerar relatório PDF
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => {
              setShowSavedItems((prev) => !prev);
              setSelectedItemIds([]);
            }}
          >
            {showSavedItems ? 'Voltar para pendentes' : 'Revisar itens salvos'}
          </button>

          {!isReadOnlyFinishedWithoutPending && (
            <button
              style={styles.primaryButton}
              onClick={handleFinishInspection}
              disabled={finishing}
            >
              {finishing ? 'Finalizando...' : 'Finalizar vistoria'}
            </button>
          )}
        </div>
      </div>

      {displayItems.length > 0 && (
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
      )}

      {!isReadOnlyFinishedWithoutPending && !showSavedItems && displayItems.length > 0 && (
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
              onClick={() => selectAllVisibleItems(visibleItems)}
            >
              Selecionar todos
            </button>

            <button style={styles.secondaryButton} onClick={clearAllSelectedItems}>
              Desmarcar todos
            </button>

            <button style={styles.secondaryButton} onClick={markSelectedAsConforme}>
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
      )}

      {showSavedItems && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Itens já salvos</h2>
          <p style={styles.emptyText}>
            Para corrigir um item salvo, clique em <strong>Editar item</strong>.
          </p>
        </div>
      )}

      {groupedItems.length === 0 && (
        <div style={styles.card}>
          <p style={styles.emptyText}>
            {isReadOnlyFinishedWithoutPending
              ? 'Esta vistoria já foi concluída e não possui itens para editar.'
              : inspection.reopenedFromPending
              ? 'Não há itens pendentes ou não conformes para exibir.'
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

              const previewList =
                draft?.localPreviewUrls?.length > 0
                  ? draft.localPreviewUrls
                  : draft?.photoUrls?.length > 0
                  ? draft.photoUrls
                  : item.photoUrls?.length > 0
                  ? item.photoUrls
                  : item.photoUrl
                  ? [item.photoUrl]
                  : [];

              const isNaoConforme =
                currentStatus === 'NAO_CONFORME' &&
                (draft?.isEditingNaoConforme ||
                  Boolean(draft?.notes) ||
                  (Array.isArray(draft?.photoUrls) && draft.photoUrls.length > 0) ||
                  (Array.isArray(draft?.localPreviewUrls) &&
                    draft.localPreviewUrls.length > 0));

              const isSavingThisItem = savingItemId === item.id;
              const isConforme = currentStatus === 'CONFORME';

              return (
                <div
                  key={item.id}
                  style={{
                    ...styles.itemCard,
                    ...(isConforme ? styles.itemCardCompact : {}),
                    ...(isNaoConforme ? styles.itemCardExpanded : {}),
                  }}
                >
                  {!isReadOnlyFinishedWithoutPending && !showSavedItems && (
                    <div style={styles.itemTopRow}>
                      <label style={styles.checkboxRowNoMargin}>
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          disabled={isSavingThisItem || savingBulk}
                        />
                        <span>Selecionar</span>
                      </label>
                    </div>
                  )}

                  <div style={styles.itemHeaderCompact}>
                    <div style={styles.itemMainInfo}>
                      <h3 style={styles.itemTitleCompact}>{item.checklistItem.itemName}</h3>
                      <p style={styles.itemSubInfo}>
                        Quantidade: {item.checklistItem.quantity}
                      </p>
                    </div>

                    <div
                      style={{
                        ...styles.statusInlineBadge,
                        ...(isConforme
                          ? styles.statusInlineConforme
                          : currentStatus === 'NAO_CONFORME'
                          ? styles.statusInlineNaoConforme
                          : styles.statusInlinePendente),
                      }}
                    >
                      {currentStatus === 'CONFORME'
                        ? 'Conforme'
                        : currentStatus === 'NAO_CONFORME'
                        ? 'Não conforme'
                        : 'Pendente'}
                    </div>
                  </div>

                  {showSavedItems && (
                    <button
                      style={styles.secondaryButton}
                      onClick={() => handleEditSavedItem(item.id)}
                    >
                      Editar item
                    </button>
                  )}

                  {selectedItemIds.includes(item.id) && (
                      <button
                         style={styles.dangerButton}
                          onClick={() =>
                            handleDeleteChecklistItem(item.id, item.checklistItem.itemName)
                          }
                        >
                           Excluir item do checklist
                       </button>
                  )}

                  {!isReadOnlyFinishedWithoutPending && !showSavedItems ? (
                    <>
                      <div style={styles.statusButtonRow}>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'CONFORME')}
                          disabled={isSavingThisItem || savingBulk}
                          style={{
                            ...styles.statusButton,
                            ...(currentStatus === 'CONFORME'
                              ? styles.statusButtonActiveConforme
                              : styles.statusButtonInactive),
                            ...((isSavingThisItem || savingBulk)
                              ? styles.disabledButton
                              : {}),
                          }}
                        >
                          {isSavingThisItem && currentStatus === 'CONFORME'
                            ? 'Salvando...'
                            : 'Conforme'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'NAO_CONFORME')}
                          disabled={isSavingThisItem || savingBulk}
                          style={{
                            ...styles.statusButton,
                            ...(currentStatus === 'NAO_CONFORME'
                              ? styles.statusButtonActiveNaoConforme
                              : styles.statusButtonInactive),
                            ...((isSavingThisItem || savingBulk)
                              ? styles.disabledButton
                              : {}),
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
                            <label style={styles.fieldLabel}>
                              Fotos do item (máximo 2)
                            </label>

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

                            <p style={styles.fileName}>
                              Você pode adicionar até 2 fotos.
                            </p>

                            <div style={styles.previewGrid}>
                              {previewList.map((photo, index) => (
                                <img
                                  key={index}
                                  src={photo}
                                  alt={`Foto ${index + 1}`}
                                  style={styles.imagePreview}
                                />
                              ))}
                            </div>
                          </div>

                          <button
                            style={styles.primaryButton}
                            onClick={() => handleSaveItem(item.id)}
                            disabled={isSavingThisItem}
                          >
                            {isSavingThisItem ? 'Salvando...' : 'Salvar item'}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {(item.notes ||
                        (item.photoUrls && item.photoUrls.length > 0) ||
                        item.photoUrl) && (
                        <div style={styles.readOnlyBlock}>
                          {item.notes ? (
                            <p style={styles.readOnlyText}>
                              <strong>Observações:</strong> {item.notes}
                            </p>
                          ) : null}

                          <div style={styles.previewGrid}>
                            {(Array.isArray(item.photoUrls) &&
                            item.photoUrls.length > 0
                              ? item.photoUrls
                              : item.photoUrl
                              ? [item.photoUrl]
                              : []
                            ).map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Foto ${index + 1}`}
                                style={styles.imagePreview}
                              />
                            ))}
                          </div>
                        </div>
                      )}
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
    background: '#151922',
    padding: '16px',
    paddingBottom: '32px',
  },

  card: {
    background: '#1f2530',
    borderRadius: '20px',
    padding: '18px',
    border: '1px solid #343d4d',
    marginBottom: '16px',
  },

  headerCard: {
    background: '#1f2530',
    borderRadius: '20px',
    padding: '20px',
    border: '1px solid #343d4d',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  title: {
    fontSize: '2rem',
    lineHeight: 1.15,
    marginBottom: '12px',
    color: '#ffffff',
    fontWeight: '800',
  },

  metaText: {
    fontSize: '1rem',
    color: '#d1d5db',
    marginBottom: '8px',
  },

  reviewText: {
    fontSize: '0.95rem',
    color: '#f4f66b',
    background: '#3b3018',
    borderRadius: '12px',
    padding: '10px 12px',
    marginTop: '8px',
  },

  successNotice: {
    fontSize: '0.95rem',
    color: '#4ade80',
    background: '#163323',
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
    minHeight: '50px',
    border: 'none',
    borderRadius: '14px',
    background: '#f4f66b',
    color: '#111827',
    fontWeight: '800',
    fontSize: '1rem',
    padding: '12px 16px',
    cursor: 'pointer',
  },

  secondaryButton: {
    width: '100%',
    minHeight: '50px',
    border: '1px solid #343d4d',
    borderRadius: '14px',
    background: '#222938',
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '1rem',
    padding: '12px 16px',
    cursor: 'pointer',
  },

  dangerButton: {
    width: '100%',
    minHeight: '50px',
    border: 'none',
    borderRadius: '14px',
    background: '#ef4444',
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '1rem',
    padding: '12px 16px',
    cursor: 'pointer',
    marginTop: '10px',
    marginBottom: '12px',
  },

  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  sectionTitle: {
    fontSize: '1.35rem',
    marginBottom: '14px',
    color: '#ffffff',
  },

  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '700',
    fontSize: '1rem',
    color: '#ffffff',
    marginBottom: '12px',
  },

  checkboxRowNoMargin: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '700',
    fontSize: '0.95rem',
    color: '#ffffff',
    margin: 0,
  },

  bulkColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  selectedInfo: {
    marginTop: '10px',
    color: '#b7c0cd',
    fontWeight: '700',
  },

  groupSection: {
    marginBottom: '18px',
  },

  groupTitle: {
    fontSize: '1.6rem',
    color: '#f4f66b',
    marginBottom: '12px',
    paddingLeft: '4px',
    fontWeight: '800',
  },

  itemsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },

  itemCard: {
    background: '#1f2530',
    borderRadius: '20px',
    padding: '18px',
    border: '1px solid #343d4d',
  },

  itemCardCompact: {
    paddingBottom: '14px',
  },

  itemCardExpanded: {
    border: '1px solid #7f1d1d',
    background: '#2a1f25',
  },

  itemTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },

  itemHeaderCompact: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },

  itemMainInfo: {
    flex: 1,
    minWidth: '220px',
  },

  itemTitleCompact: {
    fontSize: '1.08rem',
    lineHeight: 1.3,
    margin: 0,
    color: '#ffffff',
    fontWeight: '700',
  },

  itemSubInfo: {
    margin: '6px 0 0 0',
    color: '#b7c0cd',
    fontSize: '0.95rem',
  },

  statusInlineBadge: {
    borderRadius: '999px',
    padding: '8px 14px',
    fontSize: '0.88rem',
    fontWeight: '800',
    whiteSpace: 'nowrap',
  },

  statusInlineConforme: {
    background: '#16a34a',
    color: '#ffffff',
  },

  statusInlineNaoConforme: {
    background: '#ef4444',
    color: '#ffffff',
  },

  statusInlinePendente: {
    background: '#f59e0b',
    color: '#ffffff',
  },

  fieldBlock: {
    marginBottom: '14px',
  },

  fieldLabel: {
    display: 'block',
    fontWeight: '800',
    marginBottom: '8px',
    color: '#ffffff',
  },

  input: {
    width: '100%',
    minHeight: '50px',
    borderRadius: '14px',
    border: '1px solid #343d4d',
    padding: '12px 14px',
    fontSize: '1rem',
    background: '#151922',
    color: '#ffffff',
  },

  statusButtonRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '14px',
  },

  statusButton: {
    minHeight: '50px',
    borderRadius: '14px',
    border: 'none',
    fontWeight: '800',
    fontSize: '1rem',
    padding: '12px 16px',
    cursor: 'pointer',
  },

  statusButtonInactive: {
    background: '#293241',
    color: '#ffffff',
  },

  statusButtonActiveConforme: {
    background: '#16a34a',
    color: '#ffffff',
  },

  statusButtonActiveNaoConforme: {
    background: '#ef4444',
    color: '#ffffff',
  },

  textarea: {
    width: '100%',
    minHeight: '100px',
    borderRadius: '14px',
    border: '1px solid #343d4d',
    padding: '12px 14px',
    fontSize: '1rem',
    resize: 'vertical',
    background: '#151922',
    color: '#ffffff',
  },

  photoButtonsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  photoButton: {
    width: '100%',
    minHeight: '50px',
    borderRadius: '14px',
    background: '#f4f66b',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    padding: '12px 16px',
    cursor: 'pointer',
  },

  photoButtonSecondary: {
    width: '100%',
    minHeight: '50px',
    borderRadius: '14px',
    background: '#374151',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    padding: '12px 16px',
    cursor: 'pointer',
  },

  fileName: {
    marginTop: '10px',
    color: '#b7c0cd',
    fontSize: '0.95rem',
  },

  previewGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginTop: '12px',
  },

  imagePreview: {
    width: '100%',
    maxHeight: '260px',
    objectFit: 'cover',
    borderRadius: '14px',
    border: '1px solid #343d4d',
  },

  readOnlyBlock: {
    marginTop: '8px',
  },

  readOnlyText: {
    margin: '0 0 8px 0',
    color: '#d1d5db',
  },

  signatureBox: {
    border: '2px dashed #343d4d',
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
    border: '1px solid #343d4d',
  },

  signatureButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
  },

  loadingText: {
    color: '#d1d5db',
    fontSize: '1rem',
  },

  emptyText: {
    color: '#b7c0cd',
    fontSize: '1rem',
  },
};