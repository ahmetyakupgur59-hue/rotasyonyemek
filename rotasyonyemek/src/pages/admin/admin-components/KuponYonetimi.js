import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

const KuponYonetimi = () => {
  // State tanımlamaları
  const [kuponlar, setKuponlar] = useState([]);
  const [restoranlar, setRestoranlar] = useState([]);
  const [kategoriler, setKategoriler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKupon, setEditingKupon] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingKupon, setDeletingKupon] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedKupon, setSelectedKupon] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    kod: '',
    aciklama: '',
    indirim_tipi: 'yuzde', // yuzde, tutar
    indirim_degeri: '',
    min_siparis_tutari: '',
    max_indirim_tutari: '',
    kullanim_limiti: '',
    kisi_basi_limit: '1',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    sadece_ilk_siparis: false,
    hedef_tipi: 'hepsi', // hepsi, restoran, kategori
    hedef_restoranlar: [],
    hedef_kategoriler: [],
    aktif: true
  });

  // İstatistikler
  const [stats, setStats] = useState({
    toplam: 0,
    aktif: 0,
    kullanilanToplam: 0,
    toplamIndirim: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Kuponları çek
      const { data: kuponData, error: kuponError } = await supabase
        .from('kuponlar')
        .select('*')
        .order('created_at', { ascending: false });

      if (kuponError) throw kuponError;
      setKuponlar(kuponData || []);

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
      const now = new Date();
      const aktifler = kuponData?.filter(k => {
        if (!k.aktif) return false;
        const bitis = k.bitis_tarihi ? new Date(k.bitis_tarihi) : null;
        if (bitis && bitis < now) return false;
        return true;
      }) || [];

      const toplamKullanim = kuponData?.reduce((acc, k) => acc + (k.kullanim_sayisi || 0), 0) || 0;
      const toplamIndirim = kuponData?.reduce((acc, k) => acc + (k.toplam_indirim || 0), 0) || 0;

      setStats({
        toplam: kuponData?.length || 0,
        aktif: aktifler.length,
        kullanilanToplam: toplamKullanim,
        toplamIndirim: toplamIndirim
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

  // Rastgele kupon kodu oluştur
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, kod: code });
  };

  // Kupon kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.kod.trim()) {
      showMessage('error', 'Kupon kodu zorunludur');
      return;
    }

    if (!form.indirim_degeri || parseFloat(form.indirim_degeri) <= 0) {
      showMessage('error', 'Geçerli bir indirim değeri girin');
      return;
    }

    if (form.indirim_tipi === 'yuzde' && parseFloat(form.indirim_degeri) > 100) {
      showMessage('error', 'Yüzde indirimi 100\'den büyük olamaz');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        kod: form.kod.toUpperCase().trim(),
        aciklama: form.aciklama?.trim() || null,
        indirim_tipi: form.indirim_tipi,
        indirim_degeri: parseFloat(form.indirim_degeri),
        min_siparis_tutari: form.min_siparis_tutari ? parseFloat(form.min_siparis_tutari) : null,
        max_indirim_tutari: form.max_indirim_tutari ? parseFloat(form.max_indirim_tutari) : null,
        kullanim_limiti: form.kullanim_limiti ? parseInt(form.kullanim_limiti) : null,
        kisi_basi_limit: form.kisi_basi_limit ? parseInt(form.kisi_basi_limit) : 1,
        baslangic_tarihi: form.baslangic_tarihi || null,
        bitis_tarihi: form.bitis_tarihi || null,
        sadece_ilk_siparis: form.sadece_ilk_siparis,
        hedef_tipi: form.hedef_tipi,
        hedef_restoranlar: form.hedef_tipi === 'restoran' ? form.hedef_restoranlar : [],
        hedef_kategoriler: form.hedef_tipi === 'kategori' ? form.hedef_kategoriler : [],
        aktif: form.aktif
      };

      if (editingKupon) {
        const { error } = await supabase
          .from('kuponlar')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingKupon.id);

        if (error) throw error;
        showMessage('success', 'Kupon başarıyla güncellendi');
      } else {
        // Kod benzersiz mi kontrol et
        const { data: existing } = await supabase
          .from('kuponlar')
          .select('id')
          .eq('kod', payload.kod)
          .single();

        if (existing) {
          showMessage('error', 'Bu kupon kodu zaten kullanılıyor');
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('kuponlar')
          .insert({ ...payload, kullanim_sayisi: 0, toplam_indirim: 0 });

        if (error) throw error;
        showMessage('success', 'Kupon başarıyla oluşturuldu');
      }

      closeModal();
      fetchAllData();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showMessage('error', error.message || 'Kaydetme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Kupon sil
  const handleDelete = async () => {
    if (!deletingKupon) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('kuponlar')
        .delete()
        .eq('id', deletingKupon.id);

      if (error) throw error;
      
      showMessage('success', 'Kupon başarıyla silindi');
      setDeleteModalOpen(false);
      setDeletingKupon(null);
      fetchAllData();
    } catch (error) {
      console.error('Silme hatası:', error);
      showMessage('error', 'Silme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Aktif/Pasif toggle
  const toggleAktif = async (kupon) => {
    try {
      const { error } = await supabase
        .from('kuponlar')
        .update({ aktif: !kupon.aktif })
        .eq('id', kupon.id);

      if (error) throw error;
      showMessage('success', `Kupon ${!kupon.aktif ? 'aktif' : 'pasif'} yapıldı`);
      fetchAllData();
    } catch (error) {
      console.error('Durum değiştirme hatası:', error);
      showMessage('error', 'Durum değiştirilemedi');
    }
  };

  // Kupon kopyala
  const duplicateKupon = async (kupon) => {
    const newCode = kupon.kod + '_KOPYA';
    
    try {
      const { error } = await supabase
        .from('kuponlar')
        .insert({
          kod: newCode,
          aciklama: kupon.aciklama,
          indirim_tipi: kupon.indirim_tipi,
          indirim_degeri: kupon.indirim_degeri,
          min_siparis_tutari: kupon.min_siparis_tutari,
          max_indirim_tutari: kupon.max_indirim_tutari,
          kullanim_limiti: kupon.kullanim_limiti,
          kisi_basi_limit: kupon.kisi_basi_limit,
          baslangic_tarihi: null,
          bitis_tarihi: null,
          sadece_ilk_siparis: kupon.sadece_ilk_siparis,
          hedef_tipi: kupon.hedef_tipi,
          hedef_restoranlar: kupon.hedef_restoranlar,
          hedef_kategoriler: kupon.hedef_kategoriler,
          aktif: false,
          kullanim_sayisi: 0,
          toplam_indirim: 0
        });

      if (error) throw error;
      showMessage('success', 'Kupon kopyalandı');
      fetchAllData();
    } catch (error) {
      console.error('Kopyalama hatası:', error);
      showMessage('error', 'Kopyalama sırasında hata oluştu');
    }
  };

  // Modal aç
  const openModal = (kupon = null) => {
    if (kupon) {
      setEditingKupon(kupon);
      setForm({
        kod: kupon.kod || '',
        aciklama: kupon.aciklama || '',
        indirim_tipi: kupon.indirim_tipi || 'yuzde',
        indirim_degeri: kupon.indirim_degeri?.toString() || '',
        min_siparis_tutari: kupon.min_siparis_tutari?.toString() || '',
        max_indirim_tutari: kupon.max_indirim_tutari?.toString() || '',
        kullanim_limiti: kupon.kullanim_limiti?.toString() || '',
        kisi_basi_limit: kupon.kisi_basi_limit?.toString() || '1',
        baslangic_tarihi: kupon.baslangic_tarihi?.split('T')[0] || '',
        bitis_tarihi: kupon.bitis_tarihi?.split('T')[0] || '',
        sadece_ilk_siparis: kupon.sadece_ilk_siparis || false,
        hedef_tipi: kupon.hedef_tipi || 'hepsi',
        hedef_restoranlar: kupon.hedef_restoranlar || [],
        hedef_kategoriler: kupon.hedef_kategoriler || [],
        aktif: kupon.aktif !== false
      });
    } else {
      setEditingKupon(null);
      setForm({
        kod: '',
        aciklama: '',
        indirim_tipi: 'yuzde',
        indirim_degeri: '',
        min_siparis_tutari: '',
        max_indirim_tutari: '',
        kullanim_limiti: '',
        kisi_basi_limit: '1',
        baslangic_tarihi: '',
        bitis_tarihi: '',
        sadece_ilk_siparis: false,
        hedef_tipi: 'hepsi',
        hedef_restoranlar: [],
        hedef_kategoriler: [],
        aktif: true
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingKupon(null);
  };

  // Kupon durumunu belirle
  const getKuponStatus = (kupon) => {
    const now = new Date();
    const baslangic = kupon.baslangic_tarihi ? new Date(kupon.baslangic_tarihi) : null;
    const bitis = kupon.bitis_tarihi ? new Date(kupon.bitis_tarihi) : null;

    if (!kupon.aktif) {
      return { status: 'pasif', label: '⏸️ Pasif', color: '#6c757d', bgColor: '#e9ecef' };
    }
    if (kupon.kullanim_limiti && kupon.kullanim_sayisi >= kupon.kullanim_limiti) {
      return { status: 'tukendi', label: '🚫 Limit Doldu', color: '#dc3545', bgColor: '#f8d7da' };
    }
    if (bitis && bitis < now) {
      return { status: 'bitmis', label: '⏰ Süresi Dolmuş', color: '#dc3545', bgColor: '#f8d7da' };
    }
    if (baslangic && baslangic > now) {
      return { status: 'planli', label: '📅 Planlandı', color: '#fd7e14', bgColor: '#fff3cd' };
    }
    return { status: 'aktif', label: '✅ Aktif', color: '#28a745', bgColor: '#d4edda' };
  };

  // Filtrelenmiş kuponlar
  const filteredKuponlar = kuponlar.filter(k => {
    const status = getKuponStatus(k);
    
    // Arama
    if (searchTerm && !k.kod.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !k.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Durum filtresi
    if (filterStatus !== 'all' && status.status !== filterStatus) {
      return false;
    }
    
    // Tip filtresi
    if (filterType !== 'all' && k.indirim_tipi !== filterType) {
      return false;
    }
    
    return true;
  });

  // Styles
  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '24px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a1a2e',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    subtitle: {
      color: '#666',
      fontSize: '14px'
    },
    message: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    successMessage: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    },
    errorMessage: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    statIcon: {
      width: '56px',
      height: '56px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '26px'
    },
    statInfo: {
      flex: 1
    },
    statValue: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1a1a2e'
    },
    statLabel: {
      fontSize: '13px',
      color: '#666',
      marginTop: '2px'
    },
    toolbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px',
      marginBottom: '20px',
      backgroundColor: 'white',
      padding: '16px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    filterGroup: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    searchInput: {
      padding: '10px 16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '14px',
      width: '220px'
    },
    select: {
      padding: '10px 16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    },
    primaryButton: {
      backgroundColor: '#667eea',
      color: 'white'
    },
    successButton: {
      backgroundColor: '#28a745',
      color: 'white'
    },
    dangerButton: {
      backgroundColor: '#dc3545',
      color: 'white'
    },
    outlineButton: {
      backgroundColor: 'white',
      border: '1px solid #e0e0e0',
      color: '#333'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '14px 16px',
      backgroundColor: '#f8f9fa',
      borderBottom: '2px solid #e0e0e0',
      fontWeight: '600',
      fontSize: '13px',
      color: '#555'
    },
    td: {
      padding: '14px 16px',
      borderBottom: '1px solid #eee',
      fontSize: '14px',
      verticalAlign: 'middle'
    },
    kuponCode: {
      fontFamily: 'monospace',
      fontSize: '15px',
      fontWeight: '600',
      backgroundColor: '#f8f9fa',
      padding: '6px 12px',
      borderRadius: '6px',
      letterSpacing: '1px'
    },
    badge: {
      padding: '5px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block'
    },
    indirimBadge: {
      backgroundColor: '#e8f5e9',
      color: '#2e7d32',
      fontWeight: '600',
      fontSize: '14px'
    },
    actions: {
      display: 'flex',
      gap: '6px'
    },
    actionButton: {
      width: '34px',
      height: '34px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      transition: 'all 0.2s'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px'
    },
    progressBar: {
      height: '6px',
      backgroundColor: '#e9ecef',
      borderRadius: '3px',
      overflow: 'hidden',
      marginTop: '4px'
    },
    progressFill: {
      height: '100%',
      borderRadius: '3px',
      transition: 'width 0.3s'
    },
    // Modal
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '700px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      backgroundColor: 'white',
      zIndex: 1
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1a1a2e'
    },
    modalBody: {
      padding: '24px'
    },
    modalFooter: {
      padding: '16px 24px',
      borderTop: '1px solid #eee',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      position: 'sticky',
      bottom: 0,
      backgroundColor: 'white'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#666'
    },
    formSection: {
      marginBottom: '24px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px'
    },
    formSectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    inputGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: '500',
      color: '#333',
      fontSize: '14px'
    },
    labelHint: {
      fontWeight: 'normal',
      color: '#888',
      fontSize: '12px',
      marginLeft: '6px'
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    inputWithButton: {
      display: 'flex',
      gap: '8px'
    },
    textarea: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '60px',
      resize: 'vertical',
      boxSizing: 'border-box'
    },
    row: {
      display: 'flex',
      gap: '16px'
    },
    col: {
      flex: 1
    },
    radioGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '8px'
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      padding: '10px 16px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      transition: 'all 0.2s',
      flex: 1,
      justifyContent: 'center'
    },
    radioLabelSelected: {
      borderColor: '#667eea',
      backgroundColor: '#f8f9ff'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer'
    },
    checkboxInput: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    toggle: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    toggleSwitch: {
      width: '50px',
      height: '26px',
      backgroundColor: '#ccc',
      borderRadius: '13px',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    toggleSwitchActive: {
      backgroundColor: '#28a745'
    },
    toggleKnob: {
      width: '22px',
      height: '22px',
      backgroundColor: 'white',
      borderRadius: '50%',
      position: 'absolute',
      top: '2px',
      left: '2px',
      transition: 'left 0.3s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    toggleKnobActive: {
      left: '26px'
    },
    multiSelect: {
      border: '1px solid #ddd',
      borderRadius: '8px',
      maxHeight: '150px',
      overflowY: 'auto',
      marginTop: '8px'
    },
    multiSelectItem: {
      padding: '10px 12px',
      borderBottom: '1px solid #eee',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    multiSelectItemSelected: {
      backgroundColor: '#e3f2fd'
    },
    previewCard: {
      backgroundColor: '#fff',
      border: '2px dashed #667eea',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      marginTop: '16px'
    },
    previewCode: {
      fontFamily: 'monospace',
      fontSize: '28px',
      fontWeight: 'bold',
      letterSpacing: '3px',
      color: '#667eea',
      marginBottom: '12px'
    },
    previewIndirim: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#28a745'
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid #eee'
    },
    detailLabel: {
      color: '#666',
      fontSize: '14px'
    },
    detailValue: {
      fontWeight: '500',
      fontSize: '14px'
    },
    deleteModalContent: {
      textAlign: 'center',
      padding: '24px'
    }
  };

  // Loading durumu
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Kuponlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span>🎟️</span>
          Kupon Yönetimi
        </h1>
        <p style={styles.subtitle}>
          İndirim kuponları oluşturun, düzenleyin ve takip edin
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
          <div style={{ ...styles.statIcon, backgroundColor: '#e3f2fd' }}>🎟️</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.toplam}</div>
            <div style={styles.statLabel}>Toplam Kupon</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#e8f5e9' }}>✅</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#28a745' }}>{stats.aktif}</div>
            <div style={styles.statLabel}>Aktif Kupon</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fff3e0' }}>📊</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#ff9800' }}>{stats.kullanilanToplam}</div>
            <div style={styles.statLabel}>Toplam Kullanım</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fce4ec' }}>💰</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#e91e63' }}>₺{stats.toplamIndirim.toLocaleString()}</div>
            <div style={styles.statLabel}>Toplam İndirim</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <input
            type="text"
            placeholder="🔍 Kupon kodu ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.select}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="aktif">✅ Aktif</option>
            <option value="planli">📅 Planlandı</option>
            <option value="pasif">⏸️ Pasif</option>
            <option value="bitmis">⏰ Süresi Dolmuş</option>
            <option value="tukendi">🚫 Limit Doldu</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.select}
          >
            <option value="all">Tüm Tipler</option>
            <option value="yuzde">% Yüzde</option>
            <option value="tutar">₺ Sabit Tutar</option>
          </select>
        </div>
        <button
          style={{ ...styles.button, ...styles.primaryButton }}
          onClick={() => openModal()}
        >
          <span>➕</span>
          Yeni Kupon Oluştur
        </button>
      </div>

      {/* Kupon Tablosu */}
      <div style={styles.card}>
        {filteredKuponlar.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎟️</div>
            <h3 style={{ marginBottom: '8px', color: '#333' }}>Kupon Bulunamadı</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? 'Arama kriterlerine uygun kupon yok'
                : 'Henüz kupon oluşturulmamış'}
            </p>
            {!searchTerm && filterStatus === 'all' && filterType === 'all' && (
              <button
                style={{ ...styles.button, ...styles.primaryButton }}
                onClick={() => openModal()}
              >
                ➕ İlk Kuponu Oluştur
              </button>
            )}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Kupon Kodu</th>
                <th style={styles.th}>İndirim</th>
                <th style={styles.th}>Koşullar</th>
                <th style={styles.th}>Kullanım</th>
                <th style={styles.th}>Tarih</th>
                <th style={styles.th}>Durum</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredKuponlar.map(kupon => {
                const status = getKuponStatus(kupon);
                const kullanimOran = kupon.kullanim_limiti 
                  ? (kupon.kullanim_sayisi / kupon.kullanim_limiti) * 100 
                  : 0;
                
                return (
                  <tr key={kupon.id}>
                    <td style={styles.td}>
                      <div>
                        <span style={styles.kuponCode}>{kupon.kod}</span>
                        {kupon.aciklama && (
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                            {kupon.aciklama}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...styles.indirimBadge }}>
                        {kupon.indirim_tipi === 'yuzde' 
                          ? `%${kupon.indirim_degeri}` 
                          : `₺${kupon.indirim_degeri}`}
                      </span>
                      {kupon.max_indirim_tutari && kupon.indirim_tipi === 'yuzde' && (
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                          Max: ₺{kupon.max_indirim_tutari}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {kupon.min_siparis_tutari && (
                          <div>Min: ₺{kupon.min_siparis_tutari}</div>
                        )}
                        {kupon.hedef_tipi !== 'hepsi' && (
                          <div>
                            {kupon.hedef_tipi === 'restoran' ? '🏪' : '📂'} {' '}
                            {kupon.hedef_tipi === 'restoran' 
                              ? `${kupon.hedef_restoranlar?.length || 0} restoran`
                              : `${kupon.hedef_kategoriler?.length || 0} kategori`}
                          </div>
                        )}
                        {kupon.sadece_ilk_siparis && (
                          <div>🆕 İlk sipariş</div>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div>
                        <span style={{ fontWeight: '600' }}>
                          {kupon.kullanim_sayisi || 0}
                          {kupon.kullanim_limiti && ` / ${kupon.kullanim_limiti}`}
                        </span>
                        {kupon.kullanim_limiti && (
                          <div style={styles.progressBar}>
                            <div style={{
                              ...styles.progressFill,
                              width: `${Math.min(kullanimOran, 100)}%`,
                              backgroundColor: kullanimOran >= 100 ? '#dc3545' : kullanimOran >= 80 ? '#ffc107' : '#28a745'
                            }} />
                          </div>
                        )}
                        {kupon.toplam_indirim > 0 && (
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                            ₺{kupon.toplam_indirim.toLocaleString()} indirim
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {kupon.baslangic_tarihi || kupon.bitis_tarihi ? (
                          <>
                            {kupon.baslangic_tarihi && new Date(kupon.baslangic_tarihi).toLocaleDateString('tr-TR')}
                            {kupon.baslangic_tarihi && kupon.bitis_tarihi && ' - '}
                            {kupon.bitis_tarihi && new Date(kupon.bitis_tarihi).toLocaleDateString('tr-TR')}
                          </>
                        ) : (
                          'Süresiz'
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span 
                        style={{
                          ...styles.badge,
                          backgroundColor: status.bgColor,
                          color: status.color,
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleAktif(kupon)}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => {
                            setSelectedKupon(kupon);
                            setDetailModalOpen(true);
                          }}
                          title="Detay"
                        >
                          👁️
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => openModal(kupon)}
                          title="Düzenle"
                        >
                          ✏️
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => duplicateKupon(kupon)}
                          title="Kopyala"
                        >
                          📋
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => {
                            setDeletingKupon(kupon);
                            setDeleteModalOpen(true);
                          }}
                          title="Sil"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* EKLEME/DÜZENLEME MODAL */}
      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingKupon ? '✏️ Kupon Düzenle' : '➕ Yeni Kupon Oluştur'}
              </h3>
              <button style={styles.closeButton} onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
                {/* Temel Bilgiler */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>🏷️</span> Temel Bilgiler
                  </div>
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Kupon Kodu *
                      <span style={styles.labelHint}>Benzersiz olmalı</span>
                    </label>
                    <div style={styles.inputWithButton}>
                      <input
                        type="text"
                        style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}
                        value={form.kod}
                        onChange={(e) => setForm({ ...form, kod: e.target.value.toUpperCase() })}
                        placeholder="Örn: INDIRIM20"
                        maxLength={20}
                        required
                        disabled={!!editingKupon}
                      />
                      {!editingKupon && (
                        <button
                          type="button"
                          style={{ ...styles.button, ...styles.outlineButton, whiteSpace: 'nowrap' }}
                          onClick={generateCode}
                        >
                          🎲 Oluştur
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Açıklama (Opsiyonel)</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={form.aciklama}
                      onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                      placeholder="Örn: Yeni yıl kampanyası"
                    />
                  </div>
                </div>

                {/* İndirim Ayarları */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>💰</span> İndirim Ayarları
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>İndirim Tipi *</label>
                    <div style={styles.radioGroup}>
                      <label style={{
                        ...styles.radioLabel,
                        ...(form.indirim_tipi === 'yuzde' ? styles.radioLabelSelected : {})
                      }}>
                        <input
                          type="radio"
                          checked={form.indirim_tipi === 'yuzde'}
                          onChange={() => setForm({ ...form, indirim_tipi: 'yuzde' })}
                        />
                        <span>% Yüzde</span>
                      </label>
                      <label style={{
                        ...styles.radioLabel,
                        ...(form.indirim_tipi === 'tutar' ? styles.radioLabelSelected : {})
                      }}>
                        <input
                          type="radio"
                          checked={form.indirim_tipi === 'tutar'}
                          onChange={() => setForm({ ...form, indirim_tipi: 'tutar' })}
                        />
                        <span>₺ Sabit Tutar</span>
                      </label>
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>
                          İndirim Değeri *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={form.indirim_tipi === 'yuzde' ? 100 : undefined}
                          style={styles.input}
                          value={form.indirim_degeri}
                          onChange={(e) => setForm({ ...form, indirim_degeri: e.target.value })}
                          placeholder={form.indirim_tipi === 'yuzde' ? 'Örn: 20' : 'Örn: 50'}
                          required
                        />
                      </div>
                    </div>
                    {form.indirim_tipi === 'yuzde' && (
                      <div style={styles.col}>
                        <div style={styles.inputGroup}>
                          <label style={styles.label}>
                            Max İndirim (₺)
                            <span style={styles.labelHint}>Opsiyonel</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            style={styles.input}
                            value={form.max_indirim_tutari}
                            onChange={(e) => setForm({ ...form, max_indirim_tutari: e.target.value })}
                            placeholder="Örn: 100"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Minimum Sipariş Tutarı (₺)
                      <span style={styles.labelHint}>Opsiyonel</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={styles.input}
                      value={form.min_siparis_tutari}
                      onChange={(e) => setForm({ ...form, min_siparis_tutari: e.target.value })}
                      placeholder="Örn: 100 (boş = sınırsız)"
                    />
                  </div>
                </div>

                {/* Kullanım Limitleri */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>🔢</span> Kullanım Limitleri
                  </div>

                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>
                          Toplam Kullanım Limiti
                          <span style={styles.labelHint}>Boş = Sınırsız</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          style={styles.input}
                          value={form.kullanim_limiti}
                          onChange={(e) => setForm({ ...form, kullanim_limiti: e.target.value })}
                          placeholder="Örn: 100"
                        />
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>
                          Kişi Başı Limit
                        </label>
                        <input
                          type="number"
                          min="1"
                          style={styles.input}
                          value={form.kisi_basi_limit}
                          onChange={(e) => setForm({ ...form, kisi_basi_limit: e.target.value })}
                          placeholder="Örn: 1"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        style={styles.checkboxInput}
                        checked={form.sadece_ilk_siparis}
                        onChange={(e) => setForm({ ...form, sadece_ilk_siparis: e.target.checked })}
                      />
                      <span>🆕 Sadece ilk siparişte geçerli</span>
                    </label>
                  </div>
                </div>

                {/* Tarih Aralığı */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>📅</span> Geçerlilik Tarihi
                  </div>

                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Başlangıç Tarihi</label>
                        <input
                          type="date"
                          style={styles.input}
                          value={form.baslangic_tarihi}
                          onChange={(e) => setForm({ ...form, baslangic_tarihi: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Bitiş Tarihi</label>
                        <input
                          type="date"
                          style={styles.input}
                          value={form.bitis_tarihi}
                          onChange={(e) => setForm({ ...form, bitis_tarihi: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hedef Kısıtlaması */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>🎯</span> Hedef Kısıtlaması
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Kupon Nerede Geçerli?</label>
                    <div style={styles.radioGroup}>
                      <label style={{
                        ...styles.radioLabel,
                        ...(form.hedef_tipi === 'hepsi' ? styles.radioLabelSelected : {})
                      }}>
                        <input
                          type="radio"
                          checked={form.hedef_tipi === 'hepsi'}
                          onChange={() => setForm({ ...form, hedef_tipi: 'hepsi' })}
                        />
                        <span>🌍 Her Yerde</span>
                      </label>
                      <label style={{
                        ...styles.radioLabel,
                        ...(form.hedef_tipi === 'restoran' ? styles.radioLabelSelected : {})
                      }}>
                        <input
                          type="radio"
                          checked={form.hedef_tipi === 'restoran'}
                          onChange={() => setForm({ ...form, hedef_tipi: 'restoran' })}
                        />
                        <span>🏪 Belirli Restoranlar</span>
                      </label>
                      <label style={{
                        ...styles.radioLabel,
                        ...(form.hedef_tipi === 'kategori' ? styles.radioLabelSelected : {})
                      }}>
                        <input
                          type="radio"
                          checked={form.hedef_tipi === 'kategori'}
                          onChange={() => setForm({ ...form, hedef_tipi: 'kategori' })}
                        />
                        <span>📂 Belirli Kategoriler</span>
                      </label>
                    </div>
                  </div>

                  {form.hedef_tipi === 'restoran' && (
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>
                        Restoranlar Seçin
                        <span style={styles.labelHint}>({form.hedef_restoranlar.length} seçili)</span>
                      </label>
                      <div style={styles.multiSelect}>
                        {restoranlar.map(r => (
                          <div
                            key={r.id}
                            style={{
                              ...styles.multiSelectItem,
                              ...(form.hedef_restoranlar.includes(r.id) ? styles.multiSelectItemSelected : {})
                            }}
                            onClick={() => {
                              const newList = form.hedef_restoranlar.includes(r.id)
                                ? form.hedef_restoranlar.filter(id => id !== r.id)
                                : [...form.hedef_restoranlar, r.id];
                              setForm({ ...form, hedef_restoranlar: newList });
                            }}
                          >
                            <input type="checkbox" checked={form.hedef_restoranlar.includes(r.id)} readOnly />
                            <span>🏪 {r.ad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.hedef_tipi === 'kategori' && (
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>
                        Kategoriler Seçin
                        <span style={styles.labelHint}>({form.hedef_kategoriler.length} seçili)</span>
                      </label>
                      <div style={styles.multiSelect}>
                        {kategoriler.map(k => (
                          <div
                            key={k.id}
                            style={{
                              ...styles.multiSelectItem,
                              ...(form.hedef_kategoriler.includes(k.id) ? styles.multiSelectItemSelected : {})
                            }}
                            onClick={() => {
                              const newList = form.hedef_kategoriler.includes(k.id)
                                ? form.hedef_kategoriler.filter(id => id !== k.id)
                                : [...form.hedef_kategoriler, k.id];
                              setForm({ ...form, hedef_kategoriler: newList });
                            }}
                          >
                            <input type="checkbox" checked={form.hedef_kategoriler.includes(k.id)} readOnly />
                            <span>{k.ikon} {k.ad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Durum */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Durum</label>
                  <div style={styles.toggle}>
                    <div 
                      style={{
                        ...styles.toggleSwitch,
                        ...(form.aktif ? styles.toggleSwitchActive : {})
                      }}
                      onClick={() => setForm({ ...form, aktif: !form.aktif })}
                    >
                      <div style={{
                        ...styles.toggleKnob,
                        ...(form.aktif ? styles.toggleKnobActive : {})
                      }} />
                    </div>
                    <span style={{ color: form.aktif ? '#28a745' : '#666' }}>
                      {form.aktif ? '✅ Aktif - Kullanılabilir' : '⏸️ Pasif - Devre dışı'}
                    </span>
                  </div>
                </div>

                {/* Önizleme */}
                {form.kod && form.indirim_degeri && (
                  <div style={styles.previewCard}>
                    <div style={styles.previewCode}>{form.kod || 'KUPONKODU'}</div>
                    <div style={styles.previewIndirim}>
                      {form.indirim_tipi === 'yuzde' 
                        ? `%${form.indirim_degeri} İndirim`
                        : `₺${form.indirim_degeri} İndirim`}
                    </div>
                    {form.min_siparis_tutari && (
                      <div style={{ color: '#666', marginTop: '8px' }}>
                        Min. ₺{form.min_siparis_tutari} sipariş
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={{ ...styles.button, ...styles.outlineButton }}
                  onClick={closeModal}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{ ...styles.button, ...styles.successButton }}
                  disabled={saving}
                >
                  {saving ? '⏳ Kaydediliyor...' : (editingKupon ? '💾 Güncelle' : '➕ Oluştur')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAY MODAL */}
      {detailModalOpen && selectedKupon && (
        <div style={styles.modalOverlay} onClick={() => setDetailModalOpen(false)}>
          <div style={{ ...styles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🎟️ Kupon Detayı</h3>
              <button style={styles.closeButton} onClick={() => setDetailModalOpen(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ ...styles.previewCard, marginBottom: '24px' }}>
                <div style={styles.previewCode}>{selectedKupon.kod}</div>
                <div style={styles.previewIndirim}>
                  {selectedKupon.indirim_tipi === 'yuzde' 
                    ? `%${selectedKupon.indirim_degeri} İndirim`
                    : `₺${selectedKupon.indirim_degeri} İndirim`}
                </div>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Durum</span>
                <span style={styles.detailValue}>{getKuponStatus(selectedKupon).label}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Kullanım</span>
                <span style={styles.detailValue}>
                  {selectedKupon.kullanim_sayisi || 0}
                  {selectedKupon.kullanim_limiti && ` / ${selectedKupon.kullanim_limiti}`}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Toplam İndirim</span>
                <span style={styles.detailValue}>₺{(selectedKupon.toplam_indirim || 0).toLocaleString()}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Min Sipariş</span>
                <span style={styles.detailValue}>
                  {selectedKupon.min_siparis_tutari ? `₺${selectedKupon.min_siparis_tutari}` : 'Yok'}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Max İndirim</span>
                <span style={styles.detailValue}>
                  {selectedKupon.max_indirim_tutari ? `₺${selectedKupon.max_indirim_tutari}` : 'Sınırsız'}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Kişi Başı Limit</span>
                <span style={styles.detailValue}>{selectedKupon.kisi_basi_limit || 1}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Sadece İlk Sipariş</span>
                <span style={styles.detailValue}>{selectedKupon.sadece_ilk_siparis ? 'Evet' : 'Hayır'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Hedef</span>
                <span style={styles.detailValue}>
                  {selectedKupon.hedef_tipi === 'hepsi' ? 'Tüm Restoranlar' :
                   selectedKupon.hedef_tipi === 'restoran' ? `${selectedKupon.hedef_restoranlar?.length || 0} Restoran` :
                   `${selectedKupon.hedef_kategoriler?.length || 0} Kategori`}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Tarih Aralığı</span>
                <span style={styles.detailValue}>
                  {selectedKupon.baslangic_tarihi || selectedKupon.bitis_tarihi
                    ? `${selectedKupon.baslangic_tarihi ? new Date(selectedKupon.baslangic_tarihi).toLocaleDateString('tr-TR') : '∞'} - ${selectedKupon.bitis_tarihi ? new Date(selectedKupon.bitis_tarihi).toLocaleDateString('tr-TR') : '∞'}`
                    : 'Süresiz'}
                </span>
              </div>
              {selectedKupon.aciklama && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Açıklama</span>
                  <span style={styles.detailValue}>{selectedKupon.aciklama}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODAL */}
      {deleteModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setDeleteModalOpen(false)}>
          <div 
            style={{ ...styles.modal, maxWidth: '420px' }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.deleteModalContent}>
              <div style={{ fontSize: '60px', marginBottom: '16px' }}>🗑️</div>
              <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Kuponu Sil</h3>
              <p style={{ color: '#666', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '18px' }}>
                  {deletingKupon?.kod}
                </span>
              </p>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Bu kuponu silmek istediğinize emin misiniz?
                <br/><br/>
                <span style={{ color: '#dc3545' }}>⚠️ Bu işlem geri alınamaz!</span>
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  style={{ ...styles.button, ...styles.outlineButton }}
                  onClick={() => setDeleteModalOpen(false)}
                >
                  Vazgeç
                </button>
                <button
                  style={{ ...styles.button, ...styles.dangerButton }}
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {saving ? '⏳ Siliniyor...' : '🗑️ Evet, Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KuponYonetimi;