import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

const BannerYonetimi = () => {
  // State tanımlamaları
  const [bannerlar, setBannerlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filtreler
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');
  
  // Form state
  const [form, setForm] = useState({
    baslik: '',
    alt_baslik: '',
    gorsel_url: '',
    link: '',
    link_tipi: 'dahili',
    buton_metni: '',
    pozisyon: 'ana_sayfa',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    sira: 1,
    aktif: true,
    arka_plan_rengi: '#667eea',
    metin_rengi: '#ffffff'
  });

  // İstatistikler
  const [stats, setStats] = useState({
    toplam: 0,
    aktif: 0,
    planli: 0,
    bitmis: 0
  });

  // Pozisyon seçenekleri
  const pozisyonlar = [
    { value: 'ana_sayfa', label: 'Ana Sayfa Slider', icon: '🏠', aciklama: 'Ana sayfada büyük slider banner' },
    { value: 'ana_sayfa_alt', label: 'Ana Sayfa Alt Banner', icon: '📍', aciklama: 'Ana sayfanın alt kısmında görünür' },
    { value: 'kategori', label: 'Kategori Sayfası', icon: '📂', aciklama: 'Kategori sayfalarında görünür' },
    { value: 'restoran_detay', label: 'Restoran Detay', icon: '🏪', aciklama: 'Restoran detay sayfasında' },
    { value: 'sepet', label: 'Sepet Sayfası', icon: '🛒', aciklama: 'Sepet sayfasında promosyon' },
    { value: 'popup', label: 'Popup Banner', icon: '💬', aciklama: 'Açılır pencere olarak görünür' }
  ];

  // Örnek görseller
  const ornekGorseller = [
    { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=400&fit=crop', label: 'Yemek 1' },
    { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=400&fit=crop', label: 'Pizza' },
    { url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&h=400&fit=crop', label: 'Burger' },
    { url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1200&h=400&fit=crop', label: 'Burger 2' },
    { url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&h=400&fit=crop', label: 'Kahvaltı' },
    { url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&h=400&fit=crop', label: 'Salata' },
    { url: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&h=400&fit=crop', label: 'Makarna' },
    { url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&h=400&fit=crop', label: 'Yemek 2' }
  ];

  // Renk seçenekleri
  const renkSecenekleri = [
    { value: '#667eea', label: 'Mor' },
    { value: '#e53935', label: 'Kırmızı' },
    { value: '#43a047', label: 'Yeşil' },
    { value: '#1e88e5', label: 'Mavi' },
    { value: '#ff6b35', label: 'Turuncu' },
    { value: '#8e24aa', label: 'Mor Koyu' },
    { value: '#00acc1', label: 'Turkuaz' },
    { value: '#fdd835', label: 'Sarı' },
    { value: '#3d5afe', label: 'İndigo' },
    { value: '#1a1a2e', label: 'Lacivert' },
    { value: '#000000', label: 'Siyah' },
    { value: 'transparent', label: 'Şeffaf' }
  ];

  useEffect(() => {
    fetchBannerlar();
  }, []);

  const fetchBannerlar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bannerlar')
        .select('*')
        .order('sira', { ascending: true });

      if (error) throw error;

      setBannerlar(data || []);
      
      // İstatistikleri hesapla
      const now = new Date();
      const aktifler = data?.filter(b => {
        if (!b.aktif) return false;
        const baslangic = b.baslangic_tarihi ? new Date(b.baslangic_tarihi) : null;
        const bitis = b.bitis_tarihi ? new Date(b.bitis_tarihi) : null;
        if (baslangic && baslangic > now) return false;
        if (bitis && bitis < now) return false;
        return true;
      }) || [];
      
      const planlilar = data?.filter(b => {
        const baslangic = b.baslangic_tarihi ? new Date(b.baslangic_tarihi) : null;
        return b.aktif && baslangic && baslangic > now;
      }) || [];
      
      const bitmisler = data?.filter(b => {
        const bitis = b.bitis_tarihi ? new Date(b.bitis_tarihi) : null;
        return bitis && bitis < now;
      }) || [];

      setStats({
        toplam: data?.length || 0,
        aktif: aktifler.length,
        planli: planlilar.length,
        bitmis: bitmisler.length
      });

    } catch (error) {
      console.error('Bannerlar yüklenirken hata:', error);
      showMessage('error', 'Bannerlar yüklenirken hata oluştu');
    }
    setLoading(false);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Banner kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.baslik.trim()) {
      showMessage('error', 'Banner başlığı zorunludur');
      return;
    }

    if (!form.gorsel_url.trim()) {
      showMessage('error', 'Görsel URL zorunludur');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        baslik: form.baslik.trim(),
        alt_baslik: form.alt_baslik?.trim() || null,
        gorsel_url: form.gorsel_url.trim(),
        link: form.link?.trim() || null,
        link_tipi: form.link_tipi,
        buton_metni: form.buton_metni?.trim() || null,
        pozisyon: form.pozisyon,
        baslangic_tarihi: form.baslangic_tarihi || null,
        bitis_tarihi: form.bitis_tarihi || null,
        sira: parseInt(form.sira) || 1,
        aktif: form.aktif,
        arka_plan_rengi: form.arka_plan_rengi,
        metin_rengi: form.metin_rengi
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('bannerlar')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingBanner.id);

        if (error) throw error;
        showMessage('success', 'Banner başarıyla güncellendi');
      } else {
        // En yüksek sıra numarasını bul
        const maxSira = Math.max(...bannerlar.map(b => b.sira || 0), 0);
        payload.sira = maxSira + 1;

        const { error } = await supabase
          .from('bannerlar')
          .insert(payload);

        if (error) throw error;
        showMessage('success', 'Banner başarıyla eklendi');
      }

      closeModal();
      fetchBannerlar();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showMessage('error', 'Kaydetme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Banner sil
  const handleDelete = async () => {
    if (!deletingBanner) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('bannerlar')
        .delete()
        .eq('id', deletingBanner.id);

      if (error) throw error;
      
      showMessage('success', 'Banner başarıyla silindi');
      setDeleteModalOpen(false);
      setDeletingBanner(null);
      fetchBannerlar();
    } catch (error) {
      console.error('Silme hatası:', error);
      showMessage('error', 'Silme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Aktif/Pasif değiştir
  const toggleAktif = async (banner) => {
    try {
      const { error } = await supabase
        .from('bannerlar')
        .update({ aktif: !banner.aktif })
        .eq('id', banner.id);

      if (error) throw error;
      
      showMessage('success', `Banner ${!banner.aktif ? 'aktif' : 'pasif'} yapıldı`);
      fetchBannerlar();
    } catch (error) {
      console.error('Durum değiştirme hatası:', error);
      showMessage('error', 'Durum değiştirilemedi');
    }
  };

  // Sıralama - Yukarı
  const moveUp = async (index) => {
    if (index === 0) return;
    
    const current = bannerlar[index];
    const prev = bannerlar[index - 1];
    
    try {
      await supabase.from('bannerlar').update({ sira: prev.sira }).eq('id', current.id);
      await supabase.from('bannerlar').update({ sira: current.sira }).eq('id', prev.id);
      fetchBannerlar();
    } catch (error) {
      console.error('Sıralama hatası:', error);
    }
  };

  // Sıralama - Aşağı
  const moveDown = async (index) => {
    if (index === bannerlar.length - 1) return;
    
    const current = bannerlar[index];
    const next = bannerlar[index + 1];
    
    try {
      await supabase.from('bannerlar').update({ sira: next.sira }).eq('id', current.id);
      await supabase.from('bannerlar').update({ sira: current.sira }).eq('id', next.id);
      fetchBannerlar();
    } catch (error) {
      console.error('Sıralama hatası:', error);
    }
  };

  // Banner kopyala
  const duplicateBanner = async (banner) => {
    try {
      const maxSira = Math.max(...bannerlar.map(b => b.sira || 0), 0);
      
      const { error } = await supabase
        .from('bannerlar')
        .insert({
          baslik: banner.baslik + ' (Kopya)',
          alt_baslik: banner.alt_baslik,
          gorsel_url: banner.gorsel_url,
          link: banner.link,
          link_tipi: banner.link_tipi,
          buton_metni: banner.buton_metni,
          pozisyon: banner.pozisyon,
          baslangic_tarihi: null,
          bitis_tarihi: null,
          sira: maxSira + 1,
          aktif: false,
          arka_plan_rengi: banner.arka_plan_rengi,
          metin_rengi: banner.metin_rengi
        });

      if (error) throw error;
      showMessage('success', 'Banner kopyalandı');
      fetchBannerlar();
    } catch (error) {
      console.error('Kopyalama hatası:', error);
      showMessage('error', 'Kopyalama sırasında hata oluştu');
    }
  };

  // Modal aç
  const openModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setForm({
        baslik: banner.baslik || '',
        alt_baslik: banner.alt_baslik || '',
        gorsel_url: banner.gorsel_url || '',
        link: banner.link || '',
        link_tipi: banner.link_tipi || 'dahili',
        buton_metni: banner.buton_metni || '',
        pozisyon: banner.pozisyon || 'ana_sayfa',
        baslangic_tarihi: banner.baslangic_tarihi?.split('T')[0] || '',
        bitis_tarihi: banner.bitis_tarihi?.split('T')[0] || '',
        sira: banner.sira || 1,
        aktif: banner.aktif !== false,
        arka_plan_rengi: banner.arka_plan_rengi || '#667eea',
        metin_rengi: banner.metin_rengi || '#ffffff'
      });
    } else {
      setEditingBanner(null);
      setForm({
        baslik: '',
        alt_baslik: '',
        gorsel_url: '',
        link: '',
        link_tipi: 'dahili',
        buton_metni: 'Keşfet',
        pozisyon: 'ana_sayfa',
        baslangic_tarihi: '',
        bitis_tarihi: '',
        sira: 1,
        aktif: true,
        arka_plan_rengi: '#667eea',
        metin_rengi: '#ffffff'
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBanner(null);
  };

  // Önizleme aç
  const openPreview = (banner) => {
    setPreviewBanner(banner);
    setPreviewModalOpen(true);
  };

  // Banner durumunu belirle
  const getBannerStatus = (banner) => {
    const now = new Date();
    const baslangic = banner.baslangic_tarihi ? new Date(banner.baslangic_tarihi) : null;
    const bitis = banner.bitis_tarihi ? new Date(banner.bitis_tarihi) : null;

    if (!banner.aktif) {
      return { status: 'pasif', label: '⏸️ Pasif', color: '#6c757d', bgColor: '#e9ecef' };
    }
    if (bitis && bitis < now) {
      return { status: 'bitmis', label: '⏰ Süresi Dolmuş', color: '#dc3545', bgColor: '#f8d7da' };
    }
    if (baslangic && baslangic > now) {
      return { status: 'planli', label: '📅 Planlandı', color: '#fd7e14', bgColor: '#fff3cd' };
    }
    return { status: 'aktif', label: '✅ Yayında', color: '#28a745', bgColor: '#d4edda' };
  };

  // Filtrelenmiş bannerlar
  const filteredBannerlar = bannerlar.filter(b => {
    const status = getBannerStatus(b);
    
    if (filterStatus !== 'all') {
      if (filterStatus === 'aktif' && status.status !== 'aktif') return false;
      if (filterStatus === 'pasif' && status.status !== 'pasif') return false;
      if (filterStatus === 'planli' && status.status !== 'planli') return false;
      if (filterStatus === 'bitmis' && status.status !== 'bitmis') return false;
    }
    
    if (filterPosition !== 'all' && b.pozisyon !== filterPosition) return false;
    
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
    select: {
      padding: '10px 16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer',
      minWidth: '160px'
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
    bannerGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '20px',
      padding: '20px'
    },
    bannerCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #e0e0e0',
      transition: 'all 0.3s'
    },
    bannerImageContainer: {
      position: 'relative',
      height: '160px',
      overflow: 'hidden',
      backgroundColor: '#f5f5f5'
    },
    bannerImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    bannerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6))',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: '16px',
      color: 'white'
    },
    bannerTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '4px',
      textShadow: '0 1px 3px rgba(0,0,0,0.5)'
    },
    bannerSubtitle: {
      fontSize: '13px',
      opacity: 0.9
    },
    bannerStatusBadge: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '600'
    },
    bannerPositionBadge: {
      position: 'absolute',
      top: '10px',
      left: '10px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '500',
      backgroundColor: 'rgba(0,0,0,0.6)',
      color: 'white'
    },
    bannerInfo: {
      padding: '16px'
    },
    bannerMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '12px'
    },
    bannerMetaItem: {
      fontSize: '12px',
      color: '#666',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    bannerActions: {
      display: 'flex',
      gap: '8px',
      paddingTop: '12px',
      borderTop: '1px solid #eee'
    },
    actionButton: {
      flex: 1,
      padding: '8px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      transition: 'all 0.2s'
    },
    orderButtons: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginLeft: 'auto'
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
      fontSize: '12px'
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
      maxWidth: '900px',
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
      padding: '24px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px'
    },
    modalBodyFull: {
      gridColumn: '1 / -1'
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
    labelHint: {
      fontWeight: 'normal',
      color: '#888',
      fontSize: '12px',
      marginLeft: '8px'
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
      minHeight: '60px',
      resize: 'vertical',
      boxSizing: 'border-box'
    },
    imagePreview: {
      marginTop: '12px',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #e0e0e0',
      backgroundColor: '#f5f5f5'
    },
    previewImage: {
      width: '100%',
      height: '150px',
      objectFit: 'cover'
    },
    sampleImages: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '12px'
    },
    sampleImage: {
      width: '60px',
      height: '40px',
      objectFit: 'cover',
      borderRadius: '6px',
      cursor: 'pointer',
      border: '2px solid transparent',
      transition: 'all 0.2s'
    },
    sampleImageSelected: {
      borderColor: '#667eea'
    },
    colorPicker: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '8px'
    },
    colorButton: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      border: '3px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    colorButtonSelected: {
      borderColor: '#333',
      transform: 'scale(1.1)'
    },
    pozisyonGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '10px',
      marginTop: '8px'
    },
    pozisyonButton: {
      padding: '12px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.2s'
    },
    pozisyonButtonSelected: {
      borderColor: '#667eea',
      backgroundColor: '#f8f9ff'
    },
    pozisyonIcon: {
      fontSize: '20px',
      marginBottom: '4px'
    },
    pozisyonLabel: {
      fontWeight: '500',
      fontSize: '13px',
      color: '#333'
    },
    pozisyonDesc: {
      fontSize: '11px',
      color: '#888',
      marginTop: '2px'
    },
    dateRow: {
      display: 'flex',
      gap: '16px'
    },
    dateCol: {
      flex: 1
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
    livePreview: {
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '16px'
    },
    livePreviewTitle: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#666',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    livePreviewBanner: {
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: '180px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    },
    livePreviewContent: {
      padding: '24px',
      textAlign: 'center',
      width: '100%',
      background: 'linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.3))'
    },
    // Preview Modal
    previewModalContent: {
      padding: '0'
    },
    previewTabs: {
      display: 'flex',
      gap: '0',
      padding: '16px 24px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #eee'
    },
    previewTab: {
      padding: '10px 20px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '14px',
      borderRadius: '8px',
      transition: 'all 0.2s'
    },
    previewTabActive: {
      backgroundColor: 'white',
      fontWeight: '600',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    previewContainer: {
      padding: '24px',
      display: 'flex',
      justifyContent: 'center'
    },
    desktopPreview: {
      width: '100%',
      maxWidth: '800px',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    },
    mobilePreview: {
      width: '375px',
      borderRadius: '24px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      border: '8px solid #1a1a2e'
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
          <p>Bannerlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span>🖼️</span>
          Banner Yönetimi
        </h1>
        <p style={styles.subtitle}>
          Ana sayfa slider, promosyon ve kampanya bannerlarını yönetin
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
          <div style={{ ...styles.statIcon, backgroundColor: '#e3f2fd' }}>🖼️</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.toplam}</div>
            <div style={styles.statLabel}>Toplam Banner</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#e8f5e9' }}>✅</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#28a745' }}>{stats.aktif}</div>
            <div style={styles.statLabel}>Yayında</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fff3e0' }}>📅</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#ff9800' }}>{stats.planli}</div>
            <div style={styles.statLabel}>Planlanmış</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#ffebee' }}>⏰</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#dc3545' }}>{stats.bitmis}</div>
            <div style={styles.statLabel}>Süresi Dolmuş</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.select}
          >
            <option value="all">📊 Tüm Durumlar</option>
            <option value="aktif">✅ Yayında</option>
            <option value="planli">📅 Planlanmış</option>
            <option value="pasif">⏸️ Pasif</option>
            <option value="bitmis">⏰ Süresi Dolmuş</option>
          </select>
          
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            style={styles.select}
          >
            <option value="all">📍 Tüm Pozisyonlar</option>
            {pozisyonlar.map(p => (
              <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
            ))}
          </select>
        </div>
        
        <button
          style={{ ...styles.button, ...styles.primaryButton }}
          onClick={() => openModal()}
        >
          <span>➕</span>
          Yeni Banner Ekle
        </button>
      </div>

      {/* Banner Listesi */}
      <div style={styles.card}>
        {filteredBannerlar.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🖼️</div>
            <h3 style={{ marginBottom: '8px', color: '#333' }}>Banner Bulunamadı</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {filterStatus !== 'all' || filterPosition !== 'all'
                ? 'Seçili filtrelere uygun banner yok'
                : 'Henüz banner eklenmemiş'}
            </p>
            {filterStatus === 'all' && filterPosition === 'all' && (
              <button
                style={{ ...styles.button, ...styles.primaryButton }}
                onClick={() => openModal()}
              >
                ➕ İlk Banner'ı Ekle
              </button>
            )}
          </div>
        ) : (
          <div style={styles.bannerGrid}>
            {filteredBannerlar.map((banner, index) => {
              const status = getBannerStatus(banner);
              const pozisyon = pozisyonlar.find(p => p.value === banner.pozisyon);
              
              return (
                <div 
                  key={banner.id} 
                  style={styles.bannerCard}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  {/* Görsel */}
                  <div style={styles.bannerImageContainer}>
                    {banner.gorsel_url ? (
                      <img 
                        src={banner.gorsel_url} 
                        alt={banner.baslik}
                        style={styles.bannerImage}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/400x200?text=Görsel+Yüklenemedi';
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: banner.arka_plan_rengi || '#667eea',
                        color: banner.metin_rengi || '#fff'
                      }}>
                        <span style={{ fontSize: '48px' }}>🖼️</span>
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div style={styles.bannerOverlay}>
                      <div style={styles.bannerTitle}>{banner.baslik}</div>
                      {banner.alt_baslik && (
                        <div style={styles.bannerSubtitle}>{banner.alt_baslik}</div>
                      )}
                    </div>
                    
                    {/* Durum Badge */}
                    <span style={{
                      ...styles.bannerStatusBadge,
                      backgroundColor: status.bgColor,
                      color: status.color
                    }}>
                      {status.label}
                    </span>
                    
                    {/* Pozisyon Badge */}
                    <span style={styles.bannerPositionBadge}>
                      {pozisyon?.icon} {pozisyon?.label || banner.pozisyon}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={styles.bannerInfo}>
                    <div style={styles.bannerMeta}>
                      {banner.link && (
                        <span style={styles.bannerMetaItem}>
                          🔗 {banner.link_tipi === 'dahili' ? 'Site içi' : 'Harici'} link
                        </span>
                      )}
                      {banner.buton_metni && (
                        <span style={styles.bannerMetaItem}>
                          🔘 "{banner.buton_metni}"
                        </span>
                      )}
                      {(banner.baslangic_tarihi || banner.bitis_tarihi) && (
                        <span style={styles.bannerMetaItem}>
                          📅 {banner.baslangic_tarihi ? new Date(banner.baslangic_tarihi).toLocaleDateString('tr-TR') : '∞'} 
                          {' - '}
                          {banner.bitis_tarihi ? new Date(banner.bitis_tarihi).toLocaleDateString('tr-TR') : '∞'}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={styles.bannerActions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => openPreview(banner)}
                        title="Önizle"
                      >
                        👁️
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => openModal(banner)}
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => duplicateBanner(banner)}
                        title="Kopyala"
                      >
                        📋
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => toggleAktif(banner)}
                        title={banner.aktif ? 'Pasif Yap' : 'Aktif Yap'}
                      >
                        {banner.aktif ? '⏸️' : '▶️'}
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => {
                          setDeletingBanner(banner);
                          setDeleteModalOpen(true);
                        }}
                        title="Sil"
                      >
                        🗑️
                      </button>
                      
                      {/* Sıralama */}
                      <div style={styles.orderButtons}>
                        <button
                          style={{
                            ...styles.orderButton,
                            opacity: index === 0 ? 0.3 : 1
                          }}
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          title="Yukarı"
                        >
                          ⬆️
                        </button>
                        <button
                          style={{
                            ...styles.orderButton,
                            opacity: index === filteredBannerlar.length - 1 ? 0.3 : 1
                          }}
                          onClick={() => moveDown(index)}
                          disabled={index === filteredBannerlar.length - 1}
                          title="Aşağı"
                        >
                          ⬇️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EKLEME/DÜZENLEME MODAL */}
      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingBanner ? '✏️ Banner Düzenle' : '➕ Yeni Banner Ekle'}
              </h3>
              <button style={styles.closeButton} onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
                {/* Sol Kolon */}
                <div>
                  {/* Başlık */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Banner Başlığı *
                      <span style={styles.labelHint}>Görselin üzerinde görünür</span>
                    </label>
                    <input
                      type="text"
                      style={styles.input}
                      value={form.baslik}
                      onChange={(e) => setForm({...form, baslik: e.target.value})}
                      placeholder="Örn: %50 İndirim Fırsatı!"
                      required
                    />
                  </div>

                  {/* Alt Başlık */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Alt Başlık
                      <span style={styles.labelHint}>Opsiyonel açıklama</span>
                    </label>
                    <input
                      type="text"
                      style={styles.input}
                      value={form.alt_baslik}
                      onChange={(e) => setForm({...form, alt_baslik: e.target.value})}
                      placeholder="Örn: Tüm pizzalarda geçerli"
                    />
                  </div>

                  {/* Görsel URL */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Görsel URL *
                      <span style={styles.labelHint}>Önerilen boyut: 1200x400px</span>
                    </label>
                    <input
                      type="url"
                      style={styles.input}
                      value={form.gorsel_url}
                      onChange={(e) => setForm({...form, gorsel_url: e.target.value})}
                      placeholder="https://example.com/banner.jpg"
                      required
                    />
                    
                    {/* Örnek Görseller */}
                    <div style={{ marginTop: '8px' }}>
                      <small style={{ color: '#666' }}>Hazır görsellerden seç:</small>
                      <div style={styles.sampleImages}>
                        {ornekGorseller.map((img, idx) => (
                          <img
                            key={idx}
                            src={img.url}
                            alt={img.label}
                            title={img.label}
                            style={{
                              ...styles.sampleImage,
                              ...(form.gorsel_url === img.url ? styles.sampleImageSelected : {})
                            }}
                            onClick={() => setForm({...form, gorsel_url: img.url})}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Görsel Önizleme */}
                    {form.gorsel_url && (
                      <div style={styles.imagePreview}>
                        <img
                          src={form.gorsel_url}
                          alt="Önizleme"
                          style={styles.previewImage}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/400x150?text=Görsel+Yüklenemedi';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Link */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Link Adresi</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={form.link}
                      onChange={(e) => setForm({...form, link: e.target.value})}
                      placeholder={form.link_tipi === 'dahili' ? '/kampanyalar' : 'https://...'}
                    />
                    <div style={{ marginTop: '8px', display: 'flex', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          checked={form.link_tipi === 'dahili'}
                          onChange={() => setForm({...form, link_tipi: 'dahili'})}
                        />
                        <span>🏠 Site içi</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          checked={form.link_tipi === 'harici'}
                          onChange={() => setForm({...form, link_tipi: 'harici'})}
                        />
                        <span>🌐 Harici</span>
                      </label>
                    </div>
                  </div>

                  {/* Buton Metni */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Buton Metni</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={form.buton_metni}
                      onChange={(e) => setForm({...form, buton_metni: e.target.value})}
                      placeholder="Örn: Keşfet, İncele, Sipariş Ver"
                    />
                  </div>
                </div>

                {/* Sağ Kolon */}
                <div>
                  {/* Pozisyon */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Banner Pozisyonu *</label>
                    <div style={styles.pozisyonGrid}>
                      {pozisyonlar.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          style={{
                            ...styles.pozisyonButton,
                            ...(form.pozisyon === p.value ? styles.pozisyonButtonSelected : {})
                          }}
                          onClick={() => setForm({...form, pozisyon: p.value})}
                        >
                          <div style={styles.pozisyonIcon}>{p.icon}</div>
                          <div style={styles.pozisyonLabel}>{p.label}</div>
                          <div style={styles.pozisyonDesc}>{p.aciklama}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tarih Aralığı */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Yayın Tarihi Aralığı
                      <span style={styles.labelHint}>Boş bırakılırsa süresiz</span>
                    </label>
                    <div style={styles.dateRow}>
                      <div style={styles.dateCol}>
                        <input
                          type="date"
                          style={styles.input}
                          value={form.baslangic_tarihi}
                          onChange={(e) => setForm({...form, baslangic_tarihi: e.target.value})}
                        />
                        <small style={{ color: '#888' }}>Başlangıç</small>
                      </div>
                      <div style={styles.dateCol}>
                        <input
                          type="date"
                          style={styles.input}
                          value={form.bitis_tarihi}
                          onChange={(e) => setForm({...form, bitis_tarihi: e.target.value})}
                        />
                        <small style={{ color: '#888' }}>Bitiş</small>
                      </div>
                    </div>
                  </div>

                  {/* Renk Ayarları */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Arka Plan Rengi (görsel yoksa)</label>
                    <div style={styles.colorPicker}>
                      {renkSecenekleri.map((renk, idx) => (
                        <button
                          key={idx}
                          type="button"
                          style={{
                            ...styles.colorButton,
                            backgroundColor: renk.value === 'transparent' ? '#fff' : renk.value,
                            border: renk.value === 'transparent' ? '2px dashed #ccc' : '3px solid transparent',
                            ...(form.arka_plan_rengi === renk.value ? styles.colorButtonSelected : {})
                          }}
                          onClick={() => setForm({...form, arka_plan_rengi: renk.value})}
                          title={renk.label}
                        />
                      ))}
                    </div>
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
                        onClick={() => setForm({...form, aktif: !form.aktif})}
                      >
                        <div style={{
                          ...styles.toggleKnob,
                          ...(form.aktif ? styles.toggleKnobActive : {})
                        }} />
                      </div>
                      <span style={{ color: form.aktif ? '#28a745' : '#666' }}>
                        {form.aktif ? '✅ Aktif - Yayında' : '⏸️ Pasif - Gizli'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Canlı Önizleme - Tam Genişlik */}
                <div style={styles.modalBodyFull}>
                  <div style={styles.livePreview}>
                    <div style={styles.livePreviewTitle}>
                      <span>📱</span> Canlı Önizleme
                    </div>
                    <div 
                      style={{
                        ...styles.livePreviewBanner,
                        backgroundImage: form.gorsel_url ? `url(${form.gorsel_url})` : 'none',
                        backgroundColor: form.arka_plan_rengi || '#667eea'
                      }}
                    >
                      <div style={styles.livePreviewContent}>
                        <h3 style={{ 
                          color: form.metin_rengi || '#fff', 
                          fontSize: '24px',
                          marginBottom: '8px',
                          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}>
                          {form.baslik || 'Banner Başlığı'}
                        </h3>
                        {form.alt_baslik && (
                          <p style={{ 
                            color: form.metin_rengi || '#fff', 
                            opacity: 0.9,
                            marginBottom: '16px'
                          }}>
                            {form.alt_baslik}
                          </p>
                        )}
                        {form.buton_metni && (
                          <button style={{
                            padding: '10px 24px',
                            backgroundColor: 'white',
                            color: form.arka_plan_rengi || '#667eea',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}>
                            {form.buton_metni}
                          </button>
                        )}
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
                  {saving ? '⏳ Kaydediliyor...' : (editingBanner ? '💾 Güncelle' : '➕ Ekle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÖNİZLEME MODAL */}
      {previewModalOpen && previewBanner && (
        <div style={styles.modalOverlay} onClick={() => setPreviewModalOpen(false)}>
          <div style={{ ...styles.modal, maxWidth: '1000px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>👁️ Banner Önizleme</h3>
              <button style={styles.closeButton} onClick={() => setPreviewModalOpen(false)}>×</button>
            </div>
            
            {/* Preview Tabs */}
            <div style={styles.previewTabs}>
              <button
                style={{
                  ...styles.previewTab,
                  ...(previewMode === 'desktop' ? styles.previewTabActive : {})
                }}
                onClick={() => setPreviewMode('desktop')}
              >
                🖥️ Masaüstü
              </button>
              <button
                style={{
                  ...styles.previewTab,
                  ...(previewMode === 'mobile' ? styles.previewTabActive : {})
                }}
                onClick={() => setPreviewMode('mobile')}
              >
                📱 Mobil
              </button>
            </div>

            <div style={styles.previewContainer}>
              <div style={previewMode === 'desktop' ? styles.desktopPreview : styles.mobilePreview}>
                <div style={{
                  position: 'relative',
                  minHeight: previewMode === 'desktop' ? '300px' : '200px',
                  backgroundImage: previewBanner.gorsel_url ? `url(${previewBanner.gorsel_url})` : 'none',
                  backgroundColor: previewBanner.arka_plan_rengi || '#667eea',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.3))',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: previewMode === 'desktop' ? '40px' : '24px'
                  }}>
                    <h2 style={{ 
                      color: previewBanner.metin_rengi || '#fff',
                      fontSize: previewMode === 'desktop' ? '32px' : '20px',
                      marginBottom: '12px',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                      {previewBanner.baslik}
                    </h2>
                    {previewBanner.alt_baslik && (
                      <p style={{ 
                        color: previewBanner.metin_rengi || '#fff',
                        opacity: 0.9,
                        fontSize: previewMode === 'desktop' ? '18px' : '14px',
                        marginBottom: '20px'
                      }}>
                        {previewBanner.alt_baslik}
                      </p>
                    )}
                    {previewBanner.buton_metni && (
                      <button style={{
                        alignSelf: 'flex-start',
                        padding: previewMode === 'desktop' ? '12px 28px' : '10px 20px',
                        backgroundColor: 'white',
                        color: previewBanner.arka_plan_rengi || '#667eea',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: previewMode === 'desktop' ? '16px' : '14px',
                        cursor: 'pointer'
                      }}>
                        {previewBanner.buton_metni}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Detayları */}
            <div style={{ padding: '20px 24px', backgroundColor: '#f8f9fa', borderTop: '1px solid #eee' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                <div>
                  <strong>Pozisyon:</strong>{' '}
                  {pozisyonlar.find(p => p.value === previewBanner.pozisyon)?.label || previewBanner.pozisyon}
                </div>
                <div>
                  <strong>Link:</strong>{' '}
                  {previewBanner.link || 'Yok'}
                </div>
                <div>
                  <strong>Tarih:</strong>{' '}
                  {previewBanner.baslangic_tarihi 
                    ? `${new Date(previewBanner.baslangic_tarihi).toLocaleDateString('tr-TR')} - ${previewBanner.bitis_tarihi ? new Date(previewBanner.bitis_tarihi).toLocaleDateString('tr-TR') : '∞'}`
                    : 'Süresiz'
                  }
                </div>
                <div>
                  <strong>Durum:</strong>{' '}
                  {getBannerStatus(previewBanner).label}
                </div>
              </div>
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
              <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Banner'ı Sil</h3>
              <p style={{ color: '#666', marginBottom: '8px' }}>
                <strong>"{deletingBanner?.baslik}"</strong>
              </p>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Bu banner'ı silmek istediğinize emin misiniz?
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

export default BannerYonetimi;