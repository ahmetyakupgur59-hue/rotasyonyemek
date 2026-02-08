import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

const UrunYonetimi = () => {
  // State tanımlamaları
  const [urunler, setUrunler] = useState([]);
  const [restoranlar, setRestoranlar] = useState([]);
  const [kategoriler, setKategoriler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRestoran, setFilterRestoran] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOnay, setFilterOnay] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUrun, setEditingUrun] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUrun, setDeletingUrun] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUrun, setSelectedUrun] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedUrunler, setSelectedUrunler] = useState([]);
  
  // Form state
  const [form, setForm] = useState({
    ad: '',
    aciklama: '',
    fiyat: '',
    indirimli_fiyat: '',
    restoran_id: '',
    kategori_id: '',
    gorsel_url: '',
    hazirlanma_suresi: '',
    kalori: '',
    icindekiler: '',
    alerjenler: '',
    aktif: true,
    onayli: true,
    one_cikan: false,
    stok_durumu: 'var'
  });

  // Toplu işlem formu
  const [bulkForm, setBulkForm] = useState({
    islem: 'aktif',
    deger: ''
  });

  // İstatistikler
  const [stats, setStats] = useState({
    toplam: 0,
    aktif: 0,
    pasif: 0,
    onayBekleyen: 0,
    stokYok: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Ürünleri çek
      const { data: urunData, error: urunError } = await supabase
        .from('urunler')
        .select(`
          *,
          restoran:restoran_id(id, ad),
          kategori:kategori_id(id, ad, ikon)
        `)
        .order('created_at', { ascending: false });

      if (urunError) throw urunError;
      setUrunler(urunData || []);

      // Restoranları çek
      const { data: restoranData } = await supabase
        .from('restoranlar')
        .select('id, ad')
        .eq('aktif', true)
        .order('ad');
      setRestoranlar(restoranData || []);

      // Kategorileri çek
      const { data: kategoriData } = await supabase
        .from('kategoriler')
        .select('id, ad, ikon')
        .eq('aktif', true)
        .order('sira');
      setKategoriler(kategoriData || []);

      // İstatistikleri hesapla
      const aktifler = urunData?.filter(u => u.aktif) || [];
      const pasifler = urunData?.filter(u => !u.aktif) || [];
      const onayBekleyenler = urunData?.filter(u => u.onayli === false) || [];
      const stokYoklar = urunData?.filter(u => u.stok_durumu === 'yok') || [];

      setStats({
        toplam: urunData?.length || 0,
        aktif: aktifler.length,
        pasif: pasifler.length,
        onayBekleyen: onayBekleyenler.length,
        stokYok: stokYoklar.length
      });

    } catch (error) {
      console.error('Veri çekme hatası:', error);
      showMessage('error', 'Veriler yüklenirken hata oluştu');
    }
    setLoading(false);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Ürün kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.ad.trim() || !form.fiyat || !form.restoran_id) {
      showMessage('error', 'Ürün adı, fiyat ve restoran zorunludur');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ad: form.ad.trim(),
        aciklama: form.aciklama?.trim() || null,
        fiyat: parseFloat(form.fiyat),
        indirimli_fiyat: form.indirimli_fiyat ? parseFloat(form.indirimli_fiyat) : null,
        restoran_id: form.restoran_id,
        kategori_id: form.kategori_id || null,
        gorsel_url: form.gorsel_url?.trim() || null,
        hazirlanma_suresi: form.hazirlanma_suresi ? parseInt(form.hazirlanma_suresi) : null,
        kalori: form.kalori ? parseInt(form.kalori) : null,
        icindekiler: form.icindekiler?.trim() || null,
        alerjenler: form.alerjenler?.trim() || null,
        aktif: form.aktif,
        onayli: form.onayli,
        one_cikan: form.one_cikan,
        stok_durumu: form.stok_durumu
      };

      if (editingUrun) {
        const { error } = await supabase
          .from('urunler')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingUrun.id);

        if (error) throw error;
        showMessage('success', 'Ürün başarıyla güncellendi');
      } else {
        const { error } = await supabase
          .from('urunler')
          .insert(payload);

        if (error) throw error;
        showMessage('success', 'Ürün başarıyla eklendi');
      }

      closeModal();
      fetchAllData();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showMessage('error', error.message || 'Kaydetme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Ürün sil
  const handleDelete = async () => {
    if (!deletingUrun) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('urunler')
        .delete()
        .eq('id', deletingUrun.id);

      if (error) throw error;
      
      showMessage('success', 'Ürün başarıyla silindi');
      setDeleteModalOpen(false);
      setDeletingUrun(null);
      fetchAllData();
    } catch (error) {
      console.error('Silme hatası:', error);
      showMessage('error', 'Silme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Hızlı durum değiştirme
  const quickToggle = async (urun, field) => {
    try {
      const newValue = !urun[field];
      const { error } = await supabase
        .from('urunler')
        .update({ [field]: newValue })
        .eq('id', urun.id);

      if (error) throw error;
      showMessage('success', `Ürün ${field === 'aktif' ? (newValue ? 'aktif' : 'pasif') : (newValue ? 'onaylandı' : 'onay kaldırıldı')}`);
      fetchAllData();
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      showMessage('error', 'İşlem başarısız');
    }
  };

  // Stok durumu değiştir
  const changeStokDurumu = async (urun, yeniDurum) => {
    try {
      const { error } = await supabase
        .from('urunler')
        .update({ stok_durumu: yeniDurum })
        .eq('id', urun.id);

      if (error) throw error;
      showMessage('success', 'Stok durumu güncellendi');
      fetchAllData();
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      showMessage('error', 'İşlem başarısız');
    }
  };

  // Toplu işlem
  const handleBulkAction = async () => {
    if (selectedUrunler.length === 0) {
      showMessage('error', 'Lütfen en az bir ürün seçin');
      return;
    }

    setSaving(true);
    try {
      let updateData = {};
      
      switch (bulkForm.islem) {
        case 'aktif':
          updateData = { aktif: true };
          break;
        case 'pasif':
          updateData = { aktif: false };
          break;
        case 'onayla':
          updateData = { onayli: true };
          break;
        case 'onay_kaldir':
          updateData = { onayli: false };
          break;
        case 'stok_var':
          updateData = { stok_durumu: 'var' };
          break;
        case 'stok_yok':
          updateData = { stok_durumu: 'yok' };
          break;
        case 'fiyat_artir':
          // Her ürün için ayrı güncelleme
          for (const urunId of selectedUrunler) {
            const urun = urunler.find(u => u.id === urunId);
            if (urun) {
              const yeniFiyat = urun.fiyat * (1 + parseFloat(bulkForm.deger) / 100);
              await supabase
                .from('urunler')
                .update({ fiyat: Math.round(yeniFiyat * 100) / 100 })
                .eq('id', urunId);
            }
          }
          showMessage('success', `${selectedUrunler.length} ürün fiyatı güncellendi`);
          setBulkModalOpen(false);
          setSelectedUrunler([]);
          fetchAllData();
          setSaving(false);
          return;
        case 'fiyat_azalt':
          for (const urunId of selectedUrunler) {
            const urun = urunler.find(u => u.id === urunId);
            if (urun) {
              const yeniFiyat = urun.fiyat * (1 - parseFloat(bulkForm.deger) / 100);
              await supabase
                .from('urunler')
                .update({ fiyat: Math.round(yeniFiyat * 100) / 100 })
                .eq('id', urunId);
            }
          }
          showMessage('success', `${selectedUrunler.length} ürün fiyatı güncellendi`);
          setBulkModalOpen(false);
          setSelectedUrunler([]);
          fetchAllData();
          setSaving(false);
          return;
        default:
          break;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('urunler')
          .update(updateData)
          .in('id', selectedUrunler);

        if (error) throw error;
        showMessage('success', `${selectedUrunler.length} ürün güncellendi`);
      }

      setBulkModalOpen(false);
      setSelectedUrunler([]);
      fetchAllData();
    } catch (error) {
      console.error('Toplu işlem hatası:', error);
      showMessage('error', 'Toplu işlem başarısız');
    }
    setSaving(false);
  };

  // Modal aç
  const openModal = (urun = null) => {
    if (urun) {
      setEditingUrun(urun);
      setForm({
        ad: urun.ad || '',
        aciklama: urun.aciklama || '',
        fiyat: urun.fiyat?.toString() || '',
        indirimli_fiyat: urun.indirimli_fiyat?.toString() || '',
        restoran_id: urun.restoran_id || '',
        kategori_id: urun.kategori_id || '',
        gorsel_url: urun.gorsel_url || '',
        hazirlanma_suresi: urun.hazirlanma_suresi?.toString() || '',
        kalori: urun.kalori?.toString() || '',
        icindekiler: urun.icindekiler || '',
        alerjenler: urun.alerjenler || '',
        aktif: urun.aktif !== false,
        onayli: urun.onayli !== false,
        one_cikan: urun.one_cikan || false,
        stok_durumu: urun.stok_durumu || 'var'
      });
    } else {
      setEditingUrun(null);
      setForm({
        ad: '',
        aciklama: '',
        fiyat: '',
        indirimli_fiyat: '',
        restoran_id: '',
        kategori_id: '',
        gorsel_url: '',
        hazirlanma_suresi: '',
        kalori: '',
        icindekiler: '',
        alerjenler: '',
        aktif: true,
        onayli: true,
        one_cikan: false,
        stok_durumu: 'var'
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUrun(null);
  };

  // Seçim işlemleri
  const toggleSelectUrun = (urunId) => {
    setSelectedUrunler(prev => 
      prev.includes(urunId) 
        ? prev.filter(id => id !== urunId)
        : [...prev, urunId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUrunler.length === filteredUrunler.length) {
      setSelectedUrunler([]);
    } else {
      setSelectedUrunler(filteredUrunler.map(u => u.id));
    }
  };

  // Filtrelenmiş ürünler
  const filteredUrunler = urunler.filter(u => {
    if (searchTerm && !u.ad.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterRestoran && u.restoran_id !== filterRestoran) return false;
    if (filterKategori && u.kategori_id !== filterKategori) return false;
    if (filterStatus === 'aktif' && !u.aktif) return false;
    if (filterStatus === 'pasif' && u.aktif) return false;
    if (filterOnay === 'onayli' && !u.onayli) return false;
    if (filterOnay === 'bekleyen' && u.onayli !== false) return false;
    return true;
  });

  // Sayfalama
  const totalPages = Math.ceil(filteredUrunler.length / itemsPerPage);
  const paginatedUrunler = filteredUrunler.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Styles
  const styles = {
    container: { padding: '24px', maxWidth: '1600px', margin: '0 auto' },
    header: { marginBottom: '24px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' },
    subtitle: { color: '#666', fontSize: '14px' },
    message: { padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },
    successMessage: { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
    errorMessage: { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
    statValue: { fontSize: '32px', fontWeight: 'bold', color: '#1a1a2e' },
    statLabel: { fontSize: '13px', color: '#666', marginTop: '4px' },
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', backgroundColor: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    filterGroup: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
    searchInput: { padding: '10px 16px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', width: '200px' },
    select: { padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white', cursor: 'pointer' },
    button: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px' },
    primaryButton: { backgroundColor: '#667eea', color: 'white' },
    successButton: { backgroundColor: '#28a745', color: 'white' },
    dangerButton: { backgroundColor: '#dc3545', color: 'white' },
    warningButton: { backgroundColor: '#ffc107', color: '#333' },
    outlineButton: { backgroundColor: 'white', border: '1px solid #e0e0e0', color: '#333' },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '14px 12px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0', fontWeight: '600', fontSize: '12px', color: '#555', whiteSpace: 'nowrap' },
    td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px', verticalAlign: 'middle' },
    urunInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
    urunImage: { width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', backgroundColor: '#f5f5f5' },
    urunName: { fontWeight: '600', color: '#1a1a2e', marginBottom: '2px' },
    urunRestoran: { fontSize: '11px', color: '#888' },
    badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', display: 'inline-block' },
    successBadge: { backgroundColor: '#d4edda', color: '#155724' },
    dangerBadge: { backgroundColor: '#f8d7da', color: '#721c24' },
    warningBadge: { backgroundColor: '#fff3cd', color: '#856404' },
    infoBadge: { backgroundColor: '#cce5ff', color: '#004085' },
    grayBadge: { backgroundColor: '#e9ecef', color: '#495057' },
    price: { fontWeight: '600', color: '#28a745' },
    oldPrice: { textDecoration: 'line-through', color: '#999', fontSize: '11px', marginLeft: '6px' },
    actions: { display: 'flex', gap: '4px' },
    actionButton: { width: '32px', height: '32px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'all 0.2s' },
    checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
    emptyState: { textAlign: 'center', padding: '60px 20px' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '20px' },
    pageButton: { padding: '8px 14px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px' },
    pageButtonActive: { backgroundColor: '#667eea', color: 'white', borderColor: '#667eea' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modal: { backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 },
    modalTitle: { fontSize: '20px', fontWeight: '600', color: '#1a1a2e' },
    modalBody: { padding: '24px' },
    modalFooter: { padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' },
    closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' },
    formSection: { marginBottom: '24px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px' },
    formSectionTitle: { fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    inputGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '14px' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' },
    row: { display: 'flex', gap: '16px' },
    col: { flex: 1 },
    toggle: { display: 'flex', alignItems: 'center', gap: '12px' },
    toggleSwitch: { width: '50px', height: '26px', backgroundColor: '#ccc', borderRadius: '13px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.3s' },
    toggleSwitchActive: { backgroundColor: '#28a745' },
    toggleKnob: { width: '22px', height: '22px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
    toggleKnobActive: { left: '26px' },
    imagePreview: { marginTop: '12px', borderRadius: '8px', overflow: 'hidden', maxWidth: '200px' },
    previewImg: { width: '100%', height: '120px', objectFit: 'cover' },
    deleteModalContent: { textAlign: 'center', padding: '24px' },
    selectedCount: { backgroundColor: '#e3f2fd', color: '#1565c0', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500' }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Ürünler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span>📋</span>
          Ürün/Menü Yönetimi
        </h1>
        <p style={styles.subtitle}>
          Tüm restoranların ürünlerini görüntüleyin, düzenleyin ve onaylayın
        </p>
      </div>

      {/* Mesaj */}
      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === 'success' ? styles.successMessage : styles.errorMessage)
        }}>
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
          {message.text}
        </div>
      )}

      {/* İstatistikler */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.toplam}</div>
          <div style={styles.statLabel}>Toplam Ürün</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#28a745' }}>{stats.aktif}</div>
          <div style={styles.statLabel}>Aktif</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#6c757d' }}>{stats.pasif}</div>
          <div style={styles.statLabel}>Pasif</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#ffc107' }}>{stats.onayBekleyen}</div>
          <div style={styles.statLabel}>Onay Bekleyen</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#dc3545' }}>{stats.stokYok}</div>
          <div style={styles.statLabel}>Stok Yok</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <input
            type="text"
            placeholder="🔍 Ürün ara..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={styles.searchInput}
          />
          <select value={filterRestoran} onChange={(e) => { setFilterRestoran(e.target.value); setCurrentPage(1); }} style={styles.select}>
            <option value="">🏪 Tüm Restoranlar</option>
            {restoranlar.map(r => (
              <option key={r.id} value={r.id}>{r.ad}</option>
            ))}
          </select>
          <select value={filterKategori} onChange={(e) => { setFilterKategori(e.target.value); setCurrentPage(1); }} style={styles.select}>
            <option value="">🏷️ Tüm Kategoriler</option>
            {kategoriler.map(k => (
              <option key={k.id} value={k.id}>{k.ikon} {k.ad}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={styles.select}>
            <option value="all">Tüm Durumlar</option>
            <option value="aktif">✅ Aktif</option>
            <option value="pasif">⏸️ Pasif</option>
          </select>
          <select value={filterOnay} onChange={(e) => { setFilterOnay(e.target.value); setCurrentPage(1); }} style={styles.select}>
            <option value="all">Tüm Onaylar</option>
            <option value="onayli">✅ Onaylı</option>
            <option value="bekleyen">⏳ Bekleyen</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {selectedUrunler.length > 0 && (
            <>
              <span style={styles.selectedCount}>{selectedUrunler.length} ürün seçili</span>
              <button
                style={{ ...styles.button, ...styles.warningButton }}
                onClick={() => setBulkModalOpen(true)}
              >
                ⚡ Toplu İşlem
              </button>
            </>
          )}
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => openModal()}
          >
            ➕ Yeni Ürün
          </button>
        </div>
      </div>

      {/* Ürün Tablosu */}
      <div style={styles.card}>
        {paginatedUrunler.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
            <h3>Ürün Bulunamadı</h3>
            <p style={{ color: '#666' }}>Arama kriterlerine uygun ürün yok</p>
          </div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={selectedUrunler.length === filteredUrunler.length && filteredUrunler.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th style={styles.th}>Ürün</th>
                  <th style={styles.th}>Kategori</th>
                  <th style={styles.th}>Fiyat</th>
                  <th style={styles.th}>Stok</th>
                  <th style={styles.th}>Onay</th>
                  <th style={styles.th}>Durum</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUrunler.map(urun => (
                  <tr key={urun.id}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={selectedUrunler.includes(urun.id)}
                        onChange={() => toggleSelectUrun(urun.id)}
                      />
                    </td>
                    <td style={styles.td}>
                      <div style={styles.urunInfo}>
                        {urun.gorsel_url ? (
                          <img src={urun.gorsel_url} alt={urun.ad} style={styles.urunImage} />
                        ) : (
                          <div style={{ ...styles.urunImage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍽️</div>
                        )}
                        <div>
                          <div style={styles.urunName}>
                            {urun.ad}
                            {urun.one_cikan && <span style={{ marginLeft: '6px' }}>⭐</span>}
                          </div>
                          <div style={styles.urunRestoran}>🏪 {urun.restoran?.ad || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...styles.infoBadge }}>
                        {urun.kategori?.ikon} {urun.kategori?.ad || 'Yok'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.price}>₺{urun.fiyat}</span>
                      {urun.indirimli_fiyat && (
                        <span style={styles.oldPrice}>₺{urun.indirimli_fiyat}</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <select
                        value={urun.stok_durumu || 'var'}
                        onChange={(e) => changeStokDurumu(urun, e.target.value)}
                        style={{ ...styles.select, padding: '4px 8px', fontSize: '12px' }}
                      >
                        <option value="var">✅ Var</option>
                        <option value="az">⚠️ Az</option>
                        <option value="yok">❌ Yok</option>
                      </select>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(urun.onayli ? styles.successBadge : styles.warningBadge),
                          cursor: 'pointer'
                        }}
                        onClick={() => quickToggle(urun, 'onayli')}
                      >
                        {urun.onayli ? '✅ Onaylı' : '⏳ Bekliyor'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(urun.aktif ? styles.successBadge : styles.grayBadge),
                          cursor: 'pointer'
                        }}
                        onClick={() => quickToggle(urun, 'aktif')}
                      >
                        {urun.aktif ? '✅ Aktif' : '⏸️ Pasif'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => { setSelectedUrun(urun); setDetailModalOpen(true); }}
                          title="Detay"
                        >
                          👁️
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => openModal(urun)}
                          title="Düzenle"
                        >
                          ✏️
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => { setDeletingUrun(urun); setDeleteModalOpen(true); }}
                          title="Sil"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Sayfalama */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  style={{ ...styles.pageButton, opacity: currentPage === 1 ? 0.5 : 1 }}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Önceki
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    style={{
                      ...styles.pageButton,
                      ...(currentPage === i + 1 ? styles.pageButtonActive : {})
                    }}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                <button
                  style={{ ...styles.pageButton, opacity: currentPage === totalPages ? 0.5 : 1 }}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sonraki →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* EKLEME/DÜZENLEME MODAL */}
      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingUrun ? '✏️ Ürün Düzenle' : '➕ Yeni Ürün Ekle'}
              </h3>
              <button style={styles.closeButton} onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
                {/* Temel Bilgiler */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>📝</span> Temel Bilgiler
                  </div>
                  
                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Ürün Adı *</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={form.ad}
                          onChange={(e) => setForm({ ...form, ad: e.target.value })}
                          placeholder="Örn: Karışık Pizza"
                          required
                        />
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Restoran *</label>
                        <select
                          style={styles.input}
                          value={form.restoran_id}
                          onChange={(e) => setForm({ ...form, restoran_id: e.target.value })}
                          required
                        >
                          <option value="">-- Seçin --</option>
                          {restoranlar.map(r => (
                            <option key={r.id} value={r.id}>{r.ad}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Açıklama</label>
                    <textarea
                      style={styles.textarea}
                      value={form.aciklama}
                      onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                      placeholder="Ürün açıklaması..."
                    />
                  </div>

                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Kategori</label>
                        <select
                          style={styles.input}
                          value={form.kategori_id}
                          onChange={(e) => setForm({ ...form, kategori_id: e.target.value })}
                        >
                          <option value="">-- Seçin --</option>
                          {kategoriler.map(k => (
                            <option key={k.id} value={k.id}>{k.ikon} {k.ad}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Görsel URL</label>
                        <input
                          type="url"
                          style={styles.input}
                          value={form.gorsel_url}
                          onChange={(e) => setForm({ ...form, gorsel_url: e.target.value })}
                          placeholder="https://..."
                        />
                        {form.gorsel_url && (
                          <div style={styles.imagePreview}>
                            <img src={form.gorsel_url} alt="Önizleme" style={styles.previewImg} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fiyat Bilgileri */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>💰</span> Fiyat Bilgileri
                  </div>
                  
                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Fiyat (₺) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          style={styles.input}
                          value={form.fiyat}
                          onChange={(e) => setForm({ ...form, fiyat: e.target.value })}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>İndirimli Fiyat (₺)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          style={styles.input}
                          value={form.indirimli_fiyat}
                          onChange={(e) => setForm({ ...form, indirimli_fiyat: e.target.value })}
                          placeholder="Opsiyonel"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ek Bilgiler */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>📊</span> Ek Bilgiler
                  </div>
                  
                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Hazırlanma Süresi (dk)</label>
                        <input
                          type="number"
                          min="0"
                          style={styles.input}
                          value={form.hazirlanma_suresi}
                          onChange={(e) => setForm({ ...form, hazirlanma_suresi: e.target.value })}
                          placeholder="Örn: 30"
                        />
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Kalori (kcal)</label>
                        <input
                          type="number"
                          min="0"
                          style={styles.input}
                          value={form.kalori}
                          onChange={(e) => setForm({ ...form, kalori: e.target.value })}
                          placeholder="Örn: 450"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>İçindekiler</label>
                    <textarea
                      style={{ ...styles.textarea, minHeight: '60px' }}
                      value={form.icindekiler}
                      onChange={(e) => setForm({ ...form, icindekiler: e.target.value })}
                      placeholder="Malzemeler virgülle ayrılmış..."
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Alerjenler</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={form.alerjenler}
                      onChange={(e) => setForm({ ...form, alerjenler: e.target.value })}
                      placeholder="Örn: Gluten, Süt, Fıstık"
                    />
                  </div>
                </div>

                {/* Durum Ayarları */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>⚙️</span> Durum Ayarları
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                    <div style={styles.toggle}>
                      <div 
                        style={{ ...styles.toggleSwitch, ...(form.aktif ? styles.toggleSwitchActive : {}) }}
                        onClick={() => setForm({ ...form, aktif: !form.aktif })}
                      >
                        <div style={{ ...styles.toggleKnob, ...(form.aktif ? styles.toggleKnobActive : {}) }} />
                      </div>
                      <span>Aktif</span>
                    </div>

                    <div style={styles.toggle}>
                      <div 
                        style={{ ...styles.toggleSwitch, ...(form.onayli ? styles.toggleSwitchActive : {}) }}
                        onClick={() => setForm({ ...form, onayli: !form.onayli })}
                      >
                        <div style={{ ...styles.toggleKnob, ...(form.onayli ? styles.toggleKnobActive : {}) }} />
                      </div>
                      <span>Onaylı</span>
                    </div>

                    <div style={styles.toggle}>
                      <div 
                        style={{ ...styles.toggleSwitch, ...(form.one_cikan ? styles.toggleSwitchActive : {}) }}
                        onClick={() => setForm({ ...form, one_cikan: !form.one_cikan })}
                      >
                        <div style={{ ...styles.toggleKnob, ...(form.one_cikan ? styles.toggleKnobActive : {}) }} />
                      </div>
                      <span>Öne Çıkan ⭐</span>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Stok Durumu</label>
                      <select
                        style={{ ...styles.input, width: 'auto' }}
                        value={form.stok_durumu}
                        onChange={(e) => setForm({ ...form, stok_durumu: e.target.value })}
                      >
                        <option value="var">✅ Stokta Var</option>
                        <option value="az">⚠️ Az Kaldı</option>
                        <option value="yok">❌ Stokta Yok</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" style={{ ...styles.button, ...styles.outlineButton }} onClick={closeModal}>
                  İptal
                </button>
                <button type="submit" style={{ ...styles.button, ...styles.successButton }} disabled={saving}>
                  {saving ? '⏳ Kaydediliyor...' : (editingUrun ? '💾 Güncelle' : '➕ Ekle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAY MODAL */}
      {detailModalOpen && selectedUrun && (
        <div style={styles.modalOverlay} onClick={() => setDetailModalOpen(false)}>
          <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📋 Ürün Detayı</h3>
              <button style={styles.closeButton} onClick={() => setDetailModalOpen(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              {selectedUrun.gorsel_url && (
                <img 
                  src={selectedUrun.gorsel_url} 
                  alt={selectedUrun.ad}
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '20px' }}
                />
              )}
              
              <h2 style={{ margin: '0 0 8px' }}>{selectedUrun.ad}</h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>{selectedUrun.aciklama || 'Açıklama yok'}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><strong>Restoran:</strong> {selectedUrun.restoran?.ad || '-'}</div>
                <div><strong>Kategori:</strong> {selectedUrun.kategori?.ad || '-'}</div>
                <div><strong>Fiyat:</strong> ₺{selectedUrun.fiyat}</div>
                <div><strong>İndirimli:</strong> {selectedUrun.indirimli_fiyat ? `₺${selectedUrun.indirimli_fiyat}` : '-'}</div>
                <div><strong>Süre:</strong> {selectedUrun.hazirlanma_suresi ? `${selectedUrun.hazirlanma_suresi} dk` : '-'}</div>
                <div><strong>Kalori:</strong> {selectedUrun.kalori ? `${selectedUrun.kalori} kcal` : '-'}</div>
                <div><strong>Stok:</strong> {selectedUrun.stok_durumu || 'var'}</div>
                <div><strong>Durum:</strong> {selectedUrun.aktif ? '✅ Aktif' : '⏸️ Pasif'}</div>
              </div>
              
              {selectedUrun.icindekiler && (
                <div style={{ marginTop: '16px' }}>
                  <strong>İçindekiler:</strong>
                  <p style={{ color: '#666' }}>{selectedUrun.icindekiler}</p>
                </div>
              )}
              
              {selectedUrun.alerjenler && (
                <div style={{ marginTop: '12px' }}>
                  <strong>Alerjenler:</strong>
                  <p style={{ color: '#dc3545' }}>{selectedUrun.alerjenler}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SİLME MODAL */}
      {deleteModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setDeleteModalOpen(false)}>
          <div style={{ ...styles.modal, maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.deleteModalContent}>
              <div style={{ fontSize: '60px', marginBottom: '16px' }}>🗑️</div>
              <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Ürünü Sil</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                <strong>"{deletingUrun?.ad}"</strong> ürününü silmek istediğinize emin misiniz?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button style={{ ...styles.button, ...styles.outlineButton }} onClick={() => setDeleteModalOpen(false)}>
                  Vazgeç
                </button>
                <button style={{ ...styles.button, ...styles.dangerButton }} onClick={handleDelete} disabled={saving}>
                  {saving ? '⏳ Siliniyor...' : '🗑️ Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOPLU İŞLEM MODAL */}
      {bulkModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setBulkModalOpen(false)}>
          <div style={{ ...styles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>⚡ Toplu İşlem ({selectedUrunler.length} ürün)</h3>
              <button style={styles.closeButton} onClick={() => setBulkModalOpen(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>İşlem Seçin</label>
                <select
                  style={styles.input}
                  value={bulkForm.islem}
                  onChange={(e) => setBulkForm({ ...bulkForm, islem: e.target.value })}
                >
                  <option value="aktif">✅ Aktif Yap</option>
                  <option value="pasif">⏸️ Pasif Yap</option>
                  <option value="onayla">✅ Onayla</option>
                  <option value="onay_kaldir">❌ Onay Kaldır</option>
                  <option value="stok_var">📦 Stok Var</option>
                  <option value="stok_yok">📦 Stok Yok</option>
                  <option value="fiyat_artir">💰 Fiyat Artır (%)</option>
                  <option value="fiyat_azalt">💰 Fiyat Azalt (%)</option>
                </select>
              </div>

              {(bulkForm.islem === 'fiyat_artir' || bulkForm.islem === 'fiyat_azalt') && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Yüzde (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    style={styles.input}
                    value={bulkForm.deger}
                    onChange={(e) => setBulkForm({ ...bulkForm, deger: e.target.value })}
                    placeholder="Örn: 10"
                  />
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.button, ...styles.outlineButton }} onClick={() => setBulkModalOpen(false)}>
                İptal
              </button>
              <button style={{ ...styles.button, ...styles.warningButton }} onClick={handleBulkAction} disabled={saving}>
                {saving ? '⏳ İşleniyor...' : '⚡ Uygula'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrunYonetimi;
