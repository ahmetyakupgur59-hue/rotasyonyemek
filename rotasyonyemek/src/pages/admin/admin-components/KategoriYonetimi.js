import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

const KategoriYonetimi = () => {
  // State tanımlamaları
  const [kategoriler, setKategoriler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, passive
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKategori, setEditingKategori] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingKategori, setDeletingKategori] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    ad: '',
    ikon: '🍽️',
    aciklama: '',
    renk: '#ff6b35',
    aktif: true
  });

  // İstatistikler
  const [stats, setStats] = useState({
    toplam: 0,
    aktif: 0,
    pasif: 0,
    enPopuler: null
  });

  // Emoji listesi
  const emojiList = [
    { category: 'Yemek', emojis: ['🍽️', '🍕', '🍔', '🌮', '🌯', '🥙', '🥗', '🍜', '🍝', '🍲', '🍛', '🍣', '🍱', '🥡', '🍚', '🍙', '🍘', '🥟', '🍢', '🍡'] },
    { category: 'Fast Food', emojis: ['🍟', '🌭', '🥪', '🥨', '🧇', '🥞', '🧈', '🥐', '🥖', '🥯', '🍞', '🫓', '🥜', '🌰', '🫘', '🍿'] },
    { category: 'Et & Tavuk', emojis: ['🍖', '🍗', '🥩', '🥓', '🦴', '🐔', '🐄', '🐑', '🐖'] },
    { category: 'Deniz Ürünleri', emojis: ['🦐', '🦞', '🦀', '🦑', '🦪', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚'] },
    { category: 'Tatlı & Pasta', emojis: ['🍰', '🎂', '🧁', '🥧', '🍮', '🍯', '🍫', '🍬', '🍭', '🍪', '🍩', '🧆', '🥮', '🧋'] },
    { category: 'İçecek', emojis: ['☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🍸', '🍹', '🧊', '💧', '🥛'] },
    { category: 'Meyve & Sebze', emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍆', '🥜'] },
    { category: 'Dünya Mutfakları', emojis: ['🇹🇷', '🇮🇹', '🇯🇵', '🇨🇳', '🇰🇷', '🇮🇳', '🇲🇽', '🇹🇭', '🇻🇳', '🇬🇷', '🇫🇷', '🇪🇸', '🇺🇸'] },
    { category: 'Diğer', emojis: ['⭐', '🔥', '💯', '✨', '🎉', '💝', '🏆', '👑', '🎯', '💫', '🌟', '❤️', '💚', '💙', '💛', '🧡', '💜', '🖤', '🤍', '💖'] }
  ];

  // Renk seçenekleri
  const colorOptions = [
    { name: 'Turuncu', value: '#ff6b35' },
    { name: 'Kırmızı', value: '#e53935' },
    { name: 'Pembe', value: '#e91e63' },
    { name: 'Mor', value: '#9c27b0' },
    { name: 'Lacivert', value: '#673ab7' },
    { name: 'Mavi', value: '#2196f3' },
    { name: 'Turkuaz', value: '#00bcd4' },
    { name: 'Yeşil', value: '#4caf50' },
    { name: 'Lime', value: '#8bc34a' },
    { name: 'Sarı', value: '#ffc107' },
    { name: 'Kahverengi', value: '#795548' },
    { name: 'Gri', value: '#607d8b' }
  ];

  // Verileri çek
  useEffect(() => {
    fetchKategoriler();
  }, []);

  const fetchKategoriler = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kategoriler')
        .select('*')
        .order('sira', { ascending: true });

      if (error) throw error;

      setKategoriler(data || []);
      
      // İstatistikleri hesapla
      const aktifSayisi = data?.filter(k => k.aktif).length || 0;
      setStats({
        toplam: data?.length || 0,
        aktif: aktifSayisi,
        pasif: (data?.length || 0) - aktifSayisi,
        enPopuler: data?.[0] || null
      });

    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
      showMessage('error', 'Kategoriler yüklenirken hata oluştu');
    }
    setLoading(false);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Yeni kategori ekle veya düzenle
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.ad.trim()) {
      showMessage('error', 'Kategori adı zorunludur');
      return;
    }

    setSaving(true);
    try {
      if (editingKategori) {
        // Güncelleme
        const { error } = await supabase
          .from('kategoriler')
          .update({
            ad: form.ad.trim(),
            ikon: form.ikon,
            aciklama: form.aciklama?.trim() || null,
            renk: form.renk,
            aktif: form.aktif,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingKategori.id);

        if (error) throw error;
        showMessage('success', 'Kategori başarıyla güncellendi');
      } else {
        // Yeni ekleme
        const maxSira = Math.max(...kategoriler.map(k => k.sira || 0), 0);
        
        const { error } = await supabase
          .from('kategoriler')
          .insert({
            ad: form.ad.trim(),
            ikon: form.ikon,
            aciklama: form.aciklama?.trim() || null,
            renk: form.renk,
            aktif: form.aktif,
            sira: maxSira + 1
          });

        if (error) throw error;
        showMessage('success', 'Kategori başarıyla eklendi');
      }

      closeModal();
      fetchKategoriler();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showMessage('error', error.message || 'Kaydetme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Kategori sil
  const handleDelete = async () => {
    if (!deletingKategori) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('kategoriler')
        .delete()
        .eq('id', deletingKategori.id);

      if (error) throw error;
      
      showMessage('success', 'Kategori başarıyla silindi');
      setDeleteModalOpen(false);
      setDeletingKategori(null);
      fetchKategoriler();
    } catch (error) {
      console.error('Silme hatası:', error);
      showMessage('error', 'Silme sırasında hata oluştu. Bu kategoriye bağlı ürünler olabilir.');
    }
    setSaving(false);
  };

  // Aktif/Pasif değiştir
  const toggleAktif = async (kategori) => {
    try {
      const { error } = await supabase
        .from('kategoriler')
        .update({ aktif: !kategori.aktif })
        .eq('id', kategori.id);

      if (error) throw error;
      
      showMessage('success', `Kategori ${!kategori.aktif ? 'aktif' : 'pasif'} yapıldı`);
      fetchKategoriler();
    } catch (error) {
      console.error('Durum değiştirme hatası:', error);
      showMessage('error', 'Durum değiştirilemedi');
    }
  };

  // Sıralama - Yukarı taşı
  const moveUp = async (index) => {
    if (index === 0) return;
    
    const newKategoriler = [...kategoriler];
    const current = newKategoriler[index];
    const prev = newKategoriler[index - 1];
    
    try {
      // Sıraları değiştir
      await supabase.from('kategoriler').update({ sira: prev.sira }).eq('id', current.id);
      await supabase.from('kategoriler').update({ sira: current.sira }).eq('id', prev.id);
      
      fetchKategoriler();
    } catch (error) {
      console.error('Sıralama hatası:', error);
    }
  };

  // Sıralama - Aşağı taşı
  const moveDown = async (index) => {
    if (index === kategoriler.length - 1) return;
    
    const newKategoriler = [...kategoriler];
    const current = newKategoriler[index];
    const next = newKategoriler[index + 1];
    
    try {
      await supabase.from('kategoriler').update({ sira: next.sira }).eq('id', current.id);
      await supabase.from('kategoriler').update({ sira: current.sira }).eq('id', next.id);
      
      fetchKategoriler();
    } catch (error) {
      console.error('Sıralama hatası:', error);
    }
  };

  // Modal aç
  const openModal = (kategori = null) => {
    if (kategori) {
      setEditingKategori(kategori);
      setForm({
        ad: kategori.ad || '',
        ikon: kategori.ikon || '🍽️',
        aciklama: kategori.aciklama || '',
        renk: kategori.renk || '#ff6b35',
        aktif: kategori.aktif !== false
      });
    } else {
      setEditingKategori(null);
      setForm({
        ad: '',
        ikon: '🍽️',
        aciklama: '',
        renk: '#ff6b35',
        aktif: true
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingKategori(null);
  };

  // Filtrelenmiş kategoriler
  const filteredKategoriler = kategoriler.filter(k => {
    const matchesSearch = k.ad?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'active' && k.aktif) || 
                          (filterStatus === 'passive' && !k.aktif);
    return matchesSearch && matchesStatus;
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
      gap: '8px',
      animation: 'slideIn 0.3s ease'
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
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
      width: '50px',
      height: '50px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px'
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
      color: '#666'
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
    searchBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1,
      maxWidth: '500px'
    },
    searchInput: {
      flex: 1,
      padding: '10px 16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    select: {
      padding: '10px 16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer',
      minWidth: '150px'
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
    smallButton: {
      padding: '6px 12px',
      fontSize: '13px'
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
      color: '#555',
      whiteSpace: 'nowrap'
    },
    td: {
      padding: '14px 16px',
      borderBottom: '1px solid #eee',
      fontSize: '14px',
      verticalAlign: 'middle'
    },
    kategoriRow: {
      transition: 'background-color 0.2s'
    },
    kategoriIcon: {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px'
    },
    kategoriInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    kategoriName: {
      fontWeight: '600',
      color: '#1a1a2e'
    },
    kategoriDesc: {
      fontSize: '12px',
      color: '#888',
      marginTop: '2px',
      maxWidth: '250px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500'
    },
    activeBadge: {
      backgroundColor: '#d4edda',
      color: '#155724'
    },
    passiveBadge: {
      backgroundColor: '#f8d7da',
      color: '#721c24'
    },
    orderButtons: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    orderButton: {
      width: '28px',
      height: '28px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      transition: 'all 0.2s'
    },
    actions: {
      display: 'flex',
      gap: '8px'
    },
    actionButton: {
      width: '36px',
      height: '36px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      transition: 'all 0.2s'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px'
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
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
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
      gap: '12px'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#666',
      padding: '4px'
    },
    inputGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '500',
      color: '#333',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '12px 14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '80px',
      resize: 'vertical',
      outline: 'none',
      boxSizing: 'border-box'
    },
    emojiPicker: {
      marginTop: '12px'
    },
    emojiCategory: {
      marginBottom: '16px'
    },
    emojiCategoryTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#888',
      marginBottom: '8px',
      textTransform: 'uppercase'
    },
    emojiGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px'
    },
    emojiButton: {
      width: '38px',
      height: '38px',
      border: '2px solid transparent',
      borderRadius: '8px',
      backgroundColor: '#f5f5f5',
      cursor: 'pointer',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    },
    emojiButtonSelected: {
      borderColor: '#667eea',
      backgroundColor: '#e3f2fd',
      transform: 'scale(1.1)'
    },
    colorPicker: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '8px'
    },
    colorButton: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      border: '3px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    colorButtonSelected: {
      borderColor: '#333',
      transform: 'scale(1.15)'
    },
    previewCard: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '12px',
      marginTop: '20px'
    },
    previewTitle: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#666',
      marginBottom: '12px'
    },
    previewContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    previewIcon: {
      width: '60px',
      height: '60px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px'
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
    deleteModalContent: {
      textAlign: 'center',
      padding: '20px'
    },
    deleteIcon: {
      fontSize: '60px',
      marginBottom: '16px'
    },
    deleteTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '12px',
      color: '#1a1a2e'
    },
    deleteText: {
      color: '#666',
      marginBottom: '24px',
      lineHeight: '1.6'
    }
  };

  // Loading durumu
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Kategoriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span>🏷️</span>
          Kategori Yönetimi
        </h1>
        <p style={styles.subtitle}>
          Yemek kategorilerini ekleyin, düzenleyin ve sıralayın
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
          <div style={{ ...styles.statIcon, backgroundColor: '#e3f2fd' }}>📊</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.toplam}</div>
            <div style={styles.statLabel}>Toplam Kategori</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#e8f5e9' }}>✅</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#28a745' }}>{stats.aktif}</div>
            <div style={styles.statLabel}>Aktif Kategori</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#ffebee' }}>⏸️</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#dc3545' }}>{stats.pasif}</div>
            <div style={styles.statLabel}>Pasif Kategori</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fff3e0' }}>
            {stats.enPopuler?.ikon || '🏆'}
          </div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, fontSize: '18px' }}>
              {stats.enPopuler?.ad || '-'}
            </div>
            <div style={styles.statLabel}>İlk Sıradaki</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="🔍 Kategori ara..."
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
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
        </div>
        <button
          style={{ ...styles.button, ...styles.primaryButton }}
          onClick={() => openModal()}
        >
          <span>➕</span>
          Yeni Kategori Ekle
        </button>
      </div>

      {/* Kategori Listesi */}
      <div style={styles.card}>
        {filteredKategoriler.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📂</div>
            <h3 style={{ marginBottom: '8px', color: '#333' }}>Kategori Bulunamadı</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {searchTerm || filterStatus !== 'all' 
                ? 'Arama kriterlerine uygun kategori yok' 
                : 'Henüz kategori eklenmemiş'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <button
                style={{ ...styles.button, ...styles.primaryButton }}
                onClick={() => openModal()}
              >
                ➕ İlk Kategoriyi Ekle
              </button>
            )}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sıra</th>
                <th style={styles.th}>Kategori</th>
                <th style={styles.th}>Açıklama</th>
                <th style={styles.th}>Durum</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Sıralama</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredKategoriler.map((kategori, index) => (
                <tr 
                  key={kategori.id} 
                  style={styles.kategoriRow}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={styles.td}>
                    <span style={{
                      backgroundColor: '#f0f0f0',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}>
                      #{index + 1}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.kategoriInfo}>
                      <div 
                        style={{ 
                          ...styles.kategoriIcon, 
                          backgroundColor: kategori.renk ? `${kategori.renk}20` : '#f5f5f5'
                        }}
                      >
                        {kategori.ikon || '🍽️'}
                      </div>
                      <div>
                        <div style={styles.kategoriName}>{kategori.ad}</div>
                        {kategori.aciklama && (
                          <div style={styles.kategoriDesc}>{kategori.aciklama}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ color: '#666', fontSize: '13px' }}>
                      {kategori.aciklama || '-'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span 
                      style={{
                        ...styles.badge,
                        ...(kategori.aktif ? styles.activeBadge : styles.passiveBadge),
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleAktif(kategori)}
                    >
                      {kategori.aktif ? '✅ Aktif' : '⏸️ Pasif'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <div style={styles.orderButtons}>
                      <button
                        style={{
                          ...styles.orderButton,
                          opacity: index === 0 ? 0.3 : 1,
                          cursor: index === 0 ? 'not-allowed' : 'pointer'
                        }}
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        title="Yukarı Taşı"
                      >
                        ⬆️
                      </button>
                      <button
                        style={{
                          ...styles.orderButton,
                          opacity: index === filteredKategoriler.length - 1 ? 0.3 : 1,
                          cursor: index === filteredKategoriler.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                        onClick={() => moveDown(index)}
                        disabled={index === filteredKategoriler.length - 1}
                        title="Aşağı Taşı"
                      >
                        ⬇️
                      </button>
                    </div>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <div style={styles.actions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => openModal(kategori)}
                        title="Düzenle"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        ✏️
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => {
                          setDeletingKategori(kategori);
                          setDeleteModalOpen(true);
                        }}
                        title="Sil"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ekleme/Düzenleme Modal */}
      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingKategori ? '✏️ Kategori Düzenle' : '➕ Yeni Kategori Ekle'}
              </h3>
              <button style={styles.closeButton} onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
                {/* Kategori Adı */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Kategori Adı *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={form.ad}
                    onChange={(e) => setForm({ ...form, ad: e.target.value })}
                    placeholder="Örn: Pizza, Burger, Tatlılar..."
                    required
                  />
                </div>

                {/* Açıklama */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Açıklama (Opsiyonel)</label>
                  <textarea
                    style={styles.textarea}
                    value={form.aciklama}
                    onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                    placeholder="Kategori hakkında kısa açıklama..."
                  />
                </div>

                {/* İkon Seçimi */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    İkon Seçin: 
                    <span style={{ fontSize: '24px', marginLeft: '8px' }}>{form.ikon}</span>
                  </label>
                  <div style={styles.emojiPicker}>
                    {emojiList.map((group, groupIndex) => (
                      <div key={groupIndex} style={styles.emojiCategory}>
                        <div style={styles.emojiCategoryTitle}>{group.category}</div>
                        <div style={styles.emojiGrid}>
                          {group.emojis.map((emoji, emojiIndex) => (
                            <button
                              key={emojiIndex}
                              type="button"
                              style={{
                                ...styles.emojiButton,
                                ...(form.ikon === emoji ? styles.emojiButtonSelected : {})
                              }}
                              onClick={() => setForm({ ...form, ikon: emoji })}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Renk Seçimi */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Tema Rengi</label>
                  <div style={styles.colorPicker}>
                    {colorOptions.map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        style={{
                          ...styles.colorButton,
                          backgroundColor: color.value,
                          ...(form.renk === color.value ? styles.colorButtonSelected : {})
                        }}
                        onClick={() => setForm({ ...form, renk: color.value })}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Aktif/Pasif */}
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
                      {form.aktif ? 'Aktif - Kullanıcılar görebilir' : 'Pasif - Gizli'}
                    </span>
                  </div>
                </div>

                {/* Önizleme */}
                <div style={styles.previewCard}>
                  <div style={styles.previewTitle}>📱 Önizleme</div>
                  <div style={styles.previewContent}>
                    <div 
                      style={{ 
                        ...styles.previewIcon, 
                        backgroundColor: form.renk ? `${form.renk}20` : '#f5f5f5'
                      }}
                    >
                      {form.ikon}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '4px' }}>
                        {form.ad || 'Kategori Adı'}
                      </div>
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        {form.aciklama || 'Açıklama metni buraya gelecek...'}
                      </div>
                    </div>
                  </div>
                </div>
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
                  {saving ? '⏳ Kaydediliyor...' : (editingKategori ? '💾 Güncelle' : '➕ Ekle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {deleteModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setDeleteModalOpen(false)}>
          <div 
            style={{ ...styles.modal, maxWidth: '400px' }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.deleteModalContent}>
              <div style={styles.deleteIcon}>🗑️</div>
              <h3 style={styles.deleteTitle}>Kategoriyi Sil</h3>
              <p style={styles.deleteText}>
                <strong>"{deletingKategori?.ad}"</strong> kategorisini silmek istediğinize emin misiniz?
                <br /><br />
                <span style={{ color: '#dc3545' }}>
                  ⚠️ Bu işlem geri alınamaz!
                </span>
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

export default KategoriYonetimi;