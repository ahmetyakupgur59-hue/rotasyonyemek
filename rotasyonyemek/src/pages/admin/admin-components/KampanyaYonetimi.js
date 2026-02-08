import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

const KampanyaYonetimi = () => {
  // State tanımlamaları
  const [kampanyalar, setKampanyalar] = useState([]);
  const [restoranlar, setRestoranlar] = useState([]);
  const [kategoriler, setKategoriler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterHedef, setFilterHedef] = useState('all');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKampanya, setEditingKampanya] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingKampanya, setDeletingKampanya] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedKampanya, setSelectedKampanya] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    ad: '',
    aciklama: '',
    kampanya_tipi: 'yuzde_indirim', // yuzde_indirim, tutar_indirim, x_al_y_ode, ucretsiz_teslimat, hediye_urun
    indirim_degeri: '',
    x_adet: '',
    y_adet: '',
    hediye_urun_id: '',
    min_siparis_tutari: '',
    max_indirim_tutari: '',
    hedef_tipi: 'hepsi', // hepsi, restoran, kategori, urun
    hedef_restoranlar: [],
    hedef_kategoriler: [],
    hedef_urunler: [],
    baslangic_tarihi: '',
    bitis_tarihi: '',
    baslangic_saati: '',
    bitis_saati: '',
    gecerli_gunler: [1, 2, 3, 4, 5, 6, 0], // Pazartesi-Pazar
    oncelik: 1,
    gorsel_url: '',
    badge_metni: '',
    aktif: true
  });

  // İstatistikler
  const [stats, setStats] = useState({
    toplam: 0,
    aktif: 0,
    planli: 0,
    toplamKullanim: 0
  });

  // Kampanya tipleri
  const kampanyaTipleri = [
    { value: 'yuzde_indirim', label: '% Yüzde İndirim', icon: '💯', aciklama: 'Ürünlerde yüzde indirim' },
    { value: 'tutar_indirim', label: '₺ Sabit İndirim', icon: '💵', aciklama: 'Ürünlerde sabit tutar indirim' },
    { value: 'x_al_y_ode', label: 'X Al Y Öde', icon: '🎁', aciklama: '3 al 2 öde gibi' },
    { value: 'ucretsiz_teslimat', label: 'Ücretsiz Teslimat', icon: '🚚', aciklama: 'Teslimat ücreti 0₺' },
    { value: 'hediye_urun', label: 'Hediye Ürün', icon: '🎀', aciklama: 'Belirli tutarda hediye ürün' }
  ];

  // Haftanın günleri
  const haftaninGunleri = [
    { value: 1, label: 'Pazartesi', short: 'Pzt' },
    { value: 2, label: 'Salı', short: 'Sal' },
    { value: 3, label: 'Çarşamba', short: 'Çar' },
    { value: 4, label: 'Perşembe', short: 'Per' },
    { value: 5, label: 'Cuma', short: 'Cum' },
    { value: 6, label: 'Cumartesi', short: 'Cmt' },
    { value: 0, label: 'Pazar', short: 'Paz' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Kampanyaları çek
      const { data: kampanyaData, error: kampanyaError } = await supabase
        .from('kampanyalar')
        .select('*')
        .order('oncelik', { ascending: true });

      if (kampanyaError) throw kampanyaError;
      setKampanyalar(kampanyaData || []);

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

      // Ürünleri çek
      const { data: urunData } = await supabase
        .from('urunler')
        .select('id, ad, fiyat, restoran:restoran_id(id, ad)')
        .eq('aktif', true)
        .order('ad');
      setUrunler(urunData || []);

      // İstatistikleri hesapla
      const now = new Date();
      const aktifler = kampanyaData?.filter(k => {
        if (!k.aktif) return false;
        const bitis = k.bitis_tarihi ? new Date(k.bitis_tarihi) : null;
        if (bitis && bitis < now) return false;
        const baslangic = k.baslangic_tarihi ? new Date(k.baslangic_tarihi) : null;
        if (baslangic && baslangic > now) return false;
        return true;
      }) || [];

      const planlilar = kampanyaData?.filter(k => {
        const baslangic = k.baslangic_tarihi ? new Date(k.baslangic_tarihi) : null;
        return k.aktif && baslangic && baslangic > now;
      }) || [];

      const toplamKullanim = kampanyaData?.reduce((acc, k) => acc + (k.kullanim_sayisi || 0), 0) || 0;

      setStats({
        toplam: kampanyaData?.length || 0,
        aktif: aktifler.length,
        planli: planlilar.length,
        toplamKullanim: toplamKullanim
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

  // Kampanya kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.ad.trim()) {
      showMessage('error', 'Kampanya adı zorunludur');
      return;
    }

    if (form.kampanya_tipi === 'yuzde_indirim' || form.kampanya_tipi === 'tutar_indirim') {
      if (!form.indirim_degeri || parseFloat(form.indirim_degeri) <= 0) {
        showMessage('error', 'Geçerli bir indirim değeri girin');
        return;
      }
    }

    if (form.kampanya_tipi === 'x_al_y_ode') {
      if (!form.x_adet || !form.y_adet || parseInt(form.x_adet) <= parseInt(form.y_adet)) {
        showMessage('error', 'X değeri Y değerinden büyük olmalıdır');
        return;
      }
    }

    if (form.hedef_tipi !== 'hepsi') {
      const hedefler = form.hedef_tipi === 'restoran' ? form.hedef_restoranlar :
                       form.hedef_tipi === 'kategori' ? form.hedef_kategoriler :
                       form.hedef_urunler;
      if (hedefler.length === 0) {
        showMessage('error', 'En az bir hedef seçmelisiniz');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        ad: form.ad.trim(),
        aciklama: form.aciklama?.trim() || null,
        kampanya_tipi: form.kampanya_tipi,
        indirim_degeri: form.indirim_degeri ? parseFloat(form.indirim_degeri) : null,
        x_adet: form.x_adet ? parseInt(form.x_adet) : null,
        y_adet: form.y_adet ? parseInt(form.y_adet) : null,
        hediye_urun_id: form.hediye_urun_id || null,
        min_siparis_tutari: form.min_siparis_tutari ? parseFloat(form.min_siparis_tutari) : null,
        max_indirim_tutari: form.max_indirim_tutari ? parseFloat(form.max_indirim_tutari) : null,
        hedef_tipi: form.hedef_tipi,
        hedef_restoranlar: form.hedef_tipi === 'restoran' ? form.hedef_restoranlar : [],
        hedef_kategoriler: form.hedef_tipi === 'kategori' ? form.hedef_kategoriler : [],
        hedef_urunler: form.hedef_tipi === 'urun' ? form.hedef_urunler : [],
        baslangic_tarihi: form.baslangic_tarihi || null,
        bitis_tarihi: form.bitis_tarihi || null,
        baslangic_saati: form.baslangic_saati || null,
        bitis_saati: form.bitis_saati || null,
        gecerli_gunler: form.gecerli_gunler,
        oncelik: parseInt(form.oncelik) || 1,
        gorsel_url: form.gorsel_url?.trim() || null,
        badge_metni: form.badge_metni?.trim() || null,
        aktif: form.aktif
      };

      if (editingKampanya) {
        const { error } = await supabase
          .from('kampanyalar')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingKampanya.id);

        if (error) throw error;
        showMessage('success', 'Kampanya başarıyla güncellendi');
      } else {
        const { error } = await supabase
          .from('kampanyalar')
          .insert({ ...payload, kullanim_sayisi: 0, toplam_indirim: 0 });

        if (error) throw error;
        showMessage('success', 'Kampanya başarıyla oluşturuldu');
      }

      closeModal();
      fetchAllData();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showMessage('error', error.message || 'Kaydetme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Kampanya sil
  const handleDelete = async () => {
    if (!deletingKampanya) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('kampanyalar')
        .delete()
        .eq('id', deletingKampanya.id);

      if (error) throw error;
      
      showMessage('success', 'Kampanya başarıyla silindi');
      setDeleteModalOpen(false);
      setDeletingKampanya(null);
      fetchAllData();
    } catch (error) {
      console.error('Silme hatası:', error);
      showMessage('error', 'Silme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Aktif/Pasif toggle
  const toggleAktif = async (kampanya) => {
    try {
      const { error } = await supabase
        .from('kampanyalar')
        .update({ aktif: !kampanya.aktif })
        .eq('id', kampanya.id);

      if (error) throw error;
      showMessage('success', `Kampanya ${!kampanya.aktif ? 'aktif' : 'pasif'} yapıldı`);
      fetchAllData();
    } catch (error) {
      console.error('Durum değiştirme hatası:', error);
      showMessage('error', 'Durum değiştirilemedi');
    }
  };

  // Kampanya kopyala
  const duplicateKampanya = async (kampanya) => {
    try {
      const { error } = await supabase
        .from('kampanyalar')
        .insert({
          ad: kampanya.ad + ' (Kopya)',
          aciklama: kampanya.aciklama,
          kampanya_tipi: kampanya.kampanya_tipi,
          indirim_degeri: kampanya.indirim_degeri,
          x_adet: kampanya.x_adet,
          y_adet: kampanya.y_adet,
          hediye_urun_id: kampanya.hediye_urun_id,
          min_siparis_tutari: kampanya.min_siparis_tutari,
          max_indirim_tutari: kampanya.max_indirim_tutari,
          hedef_tipi: kampanya.hedef_tipi,
          hedef_restoranlar: kampanya.hedef_restoranlar,
          hedef_kategoriler: kampanya.hedef_kategoriler,
          hedef_urunler: kampanya.hedef_urunler,
          baslangic_tarihi: null,
          bitis_tarihi: null,
          baslangic_saati: kampanya.baslangic_saati,
          bitis_saati: kampanya.bitis_saati,
          gecerli_gunler: kampanya.gecerli_gunler,
          oncelik: kampanya.oncelik,
          gorsel_url: kampanya.gorsel_url,
          badge_metni: kampanya.badge_metni,
          aktif: false,
          kullanim_sayisi: 0,
          toplam_indirim: 0
        });

      if (error) throw error;
      showMessage('success', 'Kampanya kopyalandı');
      fetchAllData();
    } catch (error) {
      console.error('Kopyalama hatası:', error);
      showMessage('error', 'Kopyalama sırasında hata oluştu');
    }
  };

  // Öncelik değiştir
  const changeOncelik = async (kampanya, direction) => {
    const newOncelik = direction === 'up' ? kampanya.oncelik - 1 : kampanya.oncelik + 1;
    if (newOncelik < 1) return;

    try {
      const { error } = await supabase
        .from('kampanyalar')
        .update({ oncelik: newOncelik })
        .eq('id', kampanya.id);

      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error('Öncelik değiştirme hatası:', error);
    }
  };

  // Modal aç
  const openModal = (kampanya = null) => {
    if (kampanya) {
      setEditingKampanya(kampanya);
      setForm({
        ad: kampanya.ad || '',
        aciklama: kampanya.aciklama || '',
        kampanya_tipi: kampanya.kampanya_tipi || 'yuzde_indirim',
        indirim_degeri: kampanya.indirim_degeri?.toString() || '',
        x_adet: kampanya.x_adet?.toString() || '',
        y_adet: kampanya.y_adet?.toString() || '',
        hediye_urun_id: kampanya.hediye_urun_id || '',
        min_siparis_tutari: kampanya.min_siparis_tutari?.toString() || '',
        max_indirim_tutari: kampanya.max_indirim_tutari?.toString() || '',
        hedef_tipi: kampanya.hedef_tipi || 'hepsi',
        hedef_restoranlar: kampanya.hedef_restoranlar || [],
        hedef_kategoriler: kampanya.hedef_kategoriler || [],
        hedef_urunler: kampanya.hedef_urunler || [],
        baslangic_tarihi: kampanya.baslangic_tarihi?.split('T')[0] || '',
        bitis_tarihi: kampanya.bitis_tarihi?.split('T')[0] || '',
        baslangic_saati: kampanya.baslangic_saati || '',
        bitis_saati: kampanya.bitis_saati || '',
        gecerli_gunler: kampanya.gecerli_gunler || [1, 2, 3, 4, 5, 6, 0],
        oncelik: kampanya.oncelik || 1,
        gorsel_url: kampanya.gorsel_url || '',
        badge_metni: kampanya.badge_metni || '',
        aktif: kampanya.aktif !== false
      });
    } else {
      setEditingKampanya(null);
      setForm({
        ad: '',
        aciklama: '',
        kampanya_tipi: 'yuzde_indirim',
        indirim_degeri: '',
        x_adet: '',
        y_adet: '',
        hediye_urun_id: '',
        min_siparis_tutari: '',
        max_indirim_tutari: '',
        hedef_tipi: 'hepsi',
        hedef_restoranlar: [],
        hedef_kategoriler: [],
        hedef_urunler: [],
        baslangic_tarihi: '',
        bitis_tarihi: '',
        baslangic_saati: '',
        bitis_saati: '',
        gecerli_gunler: [1, 2, 3, 4, 5, 6, 0],
        oncelik: 1,
        gorsel_url: '',
        badge_metni: '',
        aktif: true
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingKampanya(null);
  };

  // Kampanya durumunu belirle
  const getKampanyaStatus = (kampanya) => {
    const now = new Date();
    const baslangic = kampanya.baslangic_tarihi ? new Date(kampanya.baslangic_tarihi) : null;
    const bitis = kampanya.bitis_tarihi ? new Date(kampanya.bitis_tarihi) : null;

    if (!kampanya.aktif) {
      return { status: 'pasif', label: '⏸️ Pasif', color: '#6c757d', bgColor: '#e9ecef' };
    }
    if (bitis && bitis < now) {
      return { status: 'bitmis', label: '⏰ Sona Erdi', color: '#dc3545', bgColor: '#f8d7da' };
    }
    if (baslangic && baslangic > now) {
      return { status: 'planli', label: '📅 Planlandı', color: '#fd7e14', bgColor: '#fff3cd' };
    }
    return { status: 'aktif', label: '✅ Aktif', color: '#28a745', bgColor: '#d4edda' };
  };

  // Kampanya tipini formatla
  const formatKampanyaTipi = (kampanya) => {
    switch (kampanya.kampanya_tipi) {
      case 'yuzde_indirim':
        return `%${kampanya.indirim_degeri} İndirim`;
      case 'tutar_indirim':
        return `₺${kampanya.indirim_degeri} İndirim`;
      case 'x_al_y_ode':
        return `${kampanya.x_adet} Al ${kampanya.y_adet} Öde`;
      case 'ucretsiz_teslimat':
        return 'Ücretsiz Teslimat';
      case 'hediye_urun':
        return 'Hediye Ürün';
      default:
        return kampanya.kampanya_tipi;
    }
  };

  // Filtrelenmiş kampanyalar
  const filteredKampanyalar = kampanyalar.filter(k => {
    const status = getKampanyaStatus(k);
    
    // Arama
    if (searchTerm && !k.ad.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !k.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Durum filtresi
    if (filterStatus !== 'all' && status.status !== filterStatus) {
      return false;
    }
    
    // Tip filtresi
    if (filterType !== 'all' && k.kampanya_tipi !== filterType) {
      return false;
    }

    // Hedef filtresi
    if (filterHedef !== 'all' && k.hedef_tipi !== filterHedef) {
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
    searchInput: {
      padding: '10px 16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '14px',
      width: '200px'
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
    kampanyaGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '20px',
      padding: '20px'
    },
    kampanyaCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #e0e0e0',
      transition: 'all 0.3s'
    },
    kampanyaHeader: {
      padding: '16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      borderBottom: '1px solid #eee'
    },
    kampanyaIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '10px',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px'
    },
    kampanyaInfo: {
      flex: 1
    },
    kampanyaName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1a1a2e',
      marginBottom: '4px'
    },
    kampanyaDesc: {
      fontSize: '13px',
      color: '#888'
    },
    kampanyaBadge: {
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600',
      backgroundColor: '#e8f5e9',
      color: '#2e7d32'
    },
    kampanyaBody: {
      padding: '16px'
    },
    kampanyaMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '12px'
    },
    metaItem: {
      fontSize: '12px',
      color: '#666',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#f8f9fa',
      padding: '4px 8px',
      borderRadius: '4px'
    },
    kampanyaFooter: {
      padding: '12px 16px',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    statusBadge: {
      padding: '5px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500'
    },
    actions: {
      display: 'flex',
      gap: '6px'
    },
    actionButton: {
      width: '32px',
      height: '32px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      transition: 'all 0.2s'
    },
    oncelikBadge: {
      backgroundColor: '#fff3e0',
      color: '#f57c00',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600'
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
      maxWidth: '800px',
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
    tipGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '10px',
      marginTop: '8px'
    },
    tipButton: {
      padding: '12px',
      border: '2px solid #e0e0e0',
      borderRadius: '10px',
      backgroundColor: 'white',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s'
    },
    tipButtonSelected: {
      borderColor: '#667eea',
      backgroundColor: '#f8f9ff'
    },
    tipIcon: {
      fontSize: '24px',
      marginBottom: '4px'
    },
    tipLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#333'
    },
    hedefGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '10px',
      marginTop: '8px'
    },
    hedefButton: {
      padding: '10px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      textAlign: 'center',
      fontSize: '13px',
      transition: 'all 0.2s'
    },
    hedefButtonSelected: {
      borderColor: '#667eea',
      backgroundColor: '#f8f9ff'
    },
    gunlerGrid: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      marginTop: '8px'
    },
    gunButton: {
      width: '44px',
      height: '44px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    gunButtonSelected: {
      borderColor: '#28a745',
      backgroundColor: '#e8f5e9',
      color: '#28a745'
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
    previewCard: {
      border: '2px dashed #667eea',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      backgroundColor: '#fafbff'
    },
    previewBadge: {
      display: 'inline-block',
      padding: '8px 20px',
      backgroundColor: '#e53935',
      color: 'white',
      borderRadius: '20px',
      fontWeight: '600',
      fontSize: '16px',
      marginBottom: '12px'
    },
    previewName: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1a1a2e'
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
          <p>Kampanyalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span>🎯</span>
          Kampanya Yönetimi
        </h1>
        <p style={styles.subtitle}>
          İndirim kampanyaları oluşturun, restoranlara, kategorilere veya ürünlere özel promosyonlar tanımlayın
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
          <div style={{ ...styles.statIcon, backgroundColor: '#e3f2fd' }}>🎯</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.toplam}</div>
            <div style={styles.statLabel}>Toplam Kampanya</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#e8f5e9' }}>✅</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#28a745' }}>{stats.aktif}</div>
            <div style={styles.statLabel}>Aktif Kampanya</div>
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
          <div style={{ ...styles.statIcon, backgroundColor: '#fce4ec' }}>📊</div>
          <div style={styles.statInfo}>
            <div style={{ ...styles.statValue, color: '#e91e63' }}>{stats.toplamKullanim}</div>
            <div style={styles.statLabel}>Toplam Kullanım</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <input
            type="text"
            placeholder="🔍 Kampanya ara..."
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
            <option value="bitmis">⏰ Sona Erdi</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.select}
          >
            <option value="all">Tüm Tipler</option>
            {kampanyaTipleri.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
          <select
            value={filterHedef}
            onChange={(e) => setFilterHedef(e.target.value)}
            style={styles.select}
          >
            <option value="all">Tüm Hedefler</option>
            <option value="hepsi">🌍 Genel</option>
            <option value="restoran">🏪 Restoran</option>
            <option value="kategori">📂 Kategori</option>
            <option value="urun">🍽️ Ürün</option>
          </select>
        </div>
        <button
          style={{ ...styles.button, ...styles.primaryButton }}
          onClick={() => openModal()}
        >
          <span>➕</span>
          Yeni Kampanya
        </button>
      </div>

      {/* Kampanya Kartları */}
      <div style={styles.card}>
        {filteredKampanyalar.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎯</div>
            <h3 style={{ marginBottom: '8px', color: '#333' }}>Kampanya Bulunamadı</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {searchTerm || filterStatus !== 'all' || filterType !== 'all' || filterHedef !== 'all'
                ? 'Arama kriterlerine uygun kampanya yok'
                : 'Henüz kampanya oluşturulmamış'}
            </p>
            {!searchTerm && filterStatus === 'all' && filterType === 'all' && filterHedef === 'all' && (
              <button
                style={{ ...styles.button, ...styles.primaryButton }}
                onClick={() => openModal()}
              >
                ➕ İlk Kampanyayı Oluştur
              </button>
            )}
          </div>
        ) : (
          <div style={styles.kampanyaGrid}>
            {filteredKampanyalar.map(kampanya => {
              const status = getKampanyaStatus(kampanya);
              const tip = kampanyaTipleri.find(t => t.value === kampanya.kampanya_tipi);
              
              return (
                <div 
                  key={kampanya.id} 
                  style={styles.kampanyaCard}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  {/* Header */}
                  <div style={styles.kampanyaHeader}>
                    <div style={styles.kampanyaIcon}>
                      {tip?.icon || '🎯'}
                    </div>
                    <div style={styles.kampanyaInfo}>
                      <div style={styles.kampanyaName}>{kampanya.ad}</div>
                      {kampanya.aciklama && (
                        <div style={styles.kampanyaDesc}>{kampanya.aciklama}</div>
                      )}
                    </div>
                    <div style={styles.kampanyaBadge}>
                      {formatKampanyaTipi(kampanya)}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={styles.kampanyaBody}>
                    <div style={styles.kampanyaMeta}>
                      <span style={styles.metaItem}>
                        🎯 {kampanya.hedef_tipi === 'hepsi' ? 'Genel' :
                            kampanya.hedef_tipi === 'restoran' ? `${kampanya.hedef_restoranlar?.length || 0} Restoran` :
                            kampanya.hedef_tipi === 'kategori' ? `${kampanya.hedef_kategoriler?.length || 0} Kategori` :
                            `${kampanya.hedef_urunler?.length || 0} Ürün`}
                      </span>
                      {kampanya.min_siparis_tutari && (
                        <span style={styles.metaItem}>
                          💰 Min ₺{kampanya.min_siparis_tutari}
                        </span>
                      )}
                      {(kampanya.baslangic_tarihi || kampanya.bitis_tarihi) && (
                        <span style={styles.metaItem}>
                          📅 {kampanya.baslangic_tarihi ? new Date(kampanya.baslangic_tarihi).toLocaleDateString('tr-TR') : '∞'}
                          {' - '}
                          {kampanya.bitis_tarihi ? new Date(kampanya.bitis_tarihi).toLocaleDateString('tr-TR') : '∞'}
                        </span>
                      )}
                      {kampanya.baslangic_saati && kampanya.bitis_saati && (
                        <span style={styles.metaItem}>
                          ⏰ {kampanya.baslangic_saati} - {kampanya.bitis_saati}
                        </span>
                      )}
                      <span style={styles.oncelikBadge}>
                        Öncelik: {kampanya.oncelik}
                      </span>
                    </div>

                    {kampanya.gecerli_gunler && kampanya.gecerli_gunler.length < 7 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                        {haftaninGunleri.map(gun => (
                          <span
                            key={gun.value}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '500',
                              backgroundColor: kampanya.gecerli_gunler?.includes(gun.value) ? '#e8f5e9' : '#f5f5f5',
                              color: kampanya.gecerli_gunler?.includes(gun.value) ? '#2e7d32' : '#999'
                            }}
                          >
                            {gun.short}
                          </span>
                        ))}
                      </div>
                    )}

                    {kampanya.kullanim_sayisi > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                        📊 {kampanya.kullanim_sayisi} kez kullanıldı
                        {kampanya.toplam_indirim > 0 && ` • ₺${kampanya.toplam_indirim.toLocaleString()} indirim`}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={styles.kampanyaFooter}>
                    <span 
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: status.bgColor,
                        color: status.color,
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleAktif(kampanya)}
                    >
                      {status.label}
                    </span>

                    <div style={styles.actions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => changeOncelik(kampanya, 'up')}
                        title="Önceliği Artır"
                      >
                        ⬆️
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => changeOncelik(kampanya, 'down')}
                        title="Önceliği Azalt"
                      >
                        ⬇️
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => {
                          setSelectedKampanya(kampanya);
                          setDetailModalOpen(true);
                        }}
                        title="Detay"
                      >
                        👁️
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => openModal(kampanya)}
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => duplicateKampanya(kampanya)}
                        title="Kopyala"
                      >
                        📋
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => {
                          setDeletingKampanya(kampanya);
                          setDeleteModalOpen(true);
                        }}
                        title="Sil"
                      >
                        🗑️
                      </button>
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
                {editingKampanya ? '✏️ Kampanya Düzenle' : '➕ Yeni Kampanya Oluştur'}
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
                  
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Kampanya Adı *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={form.ad}
                      onChange={(e) => setForm({ ...form, ad: e.target.value })}
                      placeholder="Örn: Hafta Sonu Şenliği"
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Açıklama</label>
                    <textarea
                      style={styles.textarea}
                      value={form.aciklama}
                      onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                      placeholder="Kampanya detayları..."
                    />
                  </div>

                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Badge Metni</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={form.badge_metni}
                          onChange={(e) => setForm({ ...form, badge_metni: e.target.value })}
                          placeholder="Örn: %20 İNDİRİM"
                        />
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Öncelik</label>
                        <input
                          type="number"
                          min="1"
                          style={styles.input}
                          value={form.oncelik}
                          onChange={(e) => setForm({ ...form, oncelik: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kampanya Tipi */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>🎁</span> Kampanya Tipi
                  </div>
                  
                  <div style={styles.tipGrid}>
                    {kampanyaTipleri.map(tip => (
                      <button
                        key={tip.value}
                        type="button"
                        style={{
                          ...styles.tipButton,
                          ...(form.kampanya_tipi === tip.value ? styles.tipButtonSelected : {})
                        }}
                        onClick={() => setForm({ ...form, kampanya_tipi: tip.value })}
                      >
                        <div style={styles.tipIcon}>{tip.icon}</div>
                        <div style={styles.tipLabel}>{tip.label}</div>
                      </button>
                    ))}
                  </div>

                  {/* Tip'e göre ek alanlar */}
                  {(form.kampanya_tipi === 'yuzde_indirim' || form.kampanya_tipi === 'tutar_indirim') && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={styles.row}>
                        <div style={styles.col}>
                          <div style={styles.inputGroup}>
                            <label style={styles.label}>
                              {form.kampanya_tipi === 'yuzde_indirim' ? 'İndirim Oranı (%)' : 'İndirim Tutarı (₺)'} *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={form.kampanya_tipi === 'yuzde_indirim' ? 100 : undefined}
                              style={styles.input}
                              value={form.indirim_degeri}
                              onChange={(e) => setForm({ ...form, indirim_degeri: e.target.value })}
                              placeholder={form.kampanya_tipi === 'yuzde_indirim' ? 'Örn: 20' : 'Örn: 50'}
                              required
                            />
                          </div>
                        </div>
                        {form.kampanya_tipi === 'yuzde_indirim' && (
                          <div style={styles.col}>
                            <div style={styles.inputGroup}>
                              <label style={styles.label}>Max İndirim (₺)</label>
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
                    </div>
                  )}

                  {form.kampanya_tipi === 'x_al_y_ode' && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={styles.row}>
                        <div style={styles.col}>
                          <div style={styles.inputGroup}>
                            <label style={styles.label}>X Al (adet) *</label>
                            <input
                              type="number"
                              min="2"
                              style={styles.input}
                              value={form.x_adet}
                              onChange={(e) => setForm({ ...form, x_adet: e.target.value })}
                              placeholder="Örn: 3"
                              required
                            />
                          </div>
                        </div>
                        <div style={styles.col}>
                          <div style={styles.inputGroup}>
                            <label style={styles.label}>Y Öde (adet) *</label>
                            <input
                              type="number"
                              min="1"
                              style={styles.input}
                              value={form.y_adet}
                              onChange={(e) => setForm({ ...form, y_adet: e.target.value })}
                              placeholder="Örn: 2"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {form.kampanya_tipi === 'hediye_urun' && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Hediye Ürün *</label>
                        <select
                          style={styles.input}
                          value={form.hediye_urun_id}
                          onChange={(e) => setForm({ ...form, hediye_urun_id: e.target.value })}
                          required
                        >
                          <option value="">-- Ürün Seçin --</option>
                          {urunler.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.ad} - {u.restoran?.ad} (₺{u.fiyat})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '16px' }}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Min Sipariş Tutarı (₺)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={styles.input}
                        value={form.min_siparis_tutari}
                        onChange={(e) => setForm({ ...form, min_siparis_tutari: e.target.value })}
                        placeholder="Boş = Sınırsız"
                      />
                    </div>
                  </div>
                </div>

                {/* Hedef Kısıtlaması */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>🎯</span> Hedef Kısıtlaması
                  </div>
                  
                  <div style={styles.hedefGrid}>
                    {[
                      { value: 'hepsi', label: '🌍 Genel', desc: 'Tüm sistem' },
                      { value: 'restoran', label: '🏪 Restoran', desc: 'Belirli restoranlar' },
                      { value: 'kategori', label: '📂 Kategori', desc: 'Belirli kategoriler' },
                      { value: 'urun', label: '🍽️ Ürün', desc: 'Belirli ürünler' }
                    ].map(hedef => (
                      <button
                        key={hedef.value}
                        type="button"
                        style={{
                          ...styles.hedefButton,
                          ...(form.hedef_tipi === hedef.value ? styles.hedefButtonSelected : {})
                        }}
                        onClick={() => setForm({ ...form, hedef_tipi: hedef.value })}
                      >
                        {hedef.label}
                      </button>
                    ))}
                  </div>

                  {form.hedef_tipi === 'restoran' && (
                    <div style={{ marginTop: '16px' }}>
                      <label style={styles.label}>
                        Restoranlar Seçin *
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
                    <div style={{ marginTop: '16px' }}>
                      <label style={styles.label}>
                        Kategoriler Seçin *
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

                  {form.hedef_tipi === 'urun' && (
                    <div style={{ marginTop: '16px' }}>
                      <label style={styles.label}>
                        Ürünler Seçin *
                        <span style={styles.labelHint}>({form.hedef_urunler.length} seçili)</span>
                      </label>
                      <div style={styles.multiSelect}>
                        {urunler.map(u => (
                          <div
                            key={u.id}
                            style={{
                              ...styles.multiSelectItem,
                              ...(form.hedef_urunler.includes(u.id) ? styles.multiSelectItemSelected : {})
                            }}
                            onClick={() => {
                              const newList = form.hedef_urunler.includes(u.id)
                                ? form.hedef_urunler.filter(id => id !== u.id)
                                : [...form.hedef_urunler, u.id];
                              setForm({ ...form, hedef_urunler: newList });
                            }}
                          >
                            <input type="checkbox" checked={form.hedef_urunler.includes(u.id)} readOnly />
                            <span>🍽️ {u.ad} - {u.restoran?.ad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Zaman Planlaması */}
                <div style={styles.formSection}>
                  <div style={styles.formSectionTitle}>
                    <span>📅</span> Zaman Planlaması
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

                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Başlangıç Saati</label>
                        <input
                          type="time"
                          style={styles.input}
                          value={form.baslangic_saati}
                          onChange={(e) => setForm({ ...form, baslangic_saati: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Bitiş Saati</label>
                        <input
                          type="time"
                          style={styles.input}
                          value={form.bitis_saati}
                          onChange={(e) => setForm({ ...form, bitis_saati: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Geçerli Günler</label>
                    <div style={styles.gunlerGrid}>
                      {haftaninGunleri.map(gun => (
                        <button
                          key={gun.value}
                          type="button"
                          style={{
                            ...styles.gunButton,
                            ...(form.gecerli_gunler.includes(gun.value) ? styles.gunButtonSelected : {})
                          }}
                          onClick={() => {
                            const newList = form.gecerli_gunler.includes(gun.value)
                              ? form.gecerli_gunler.filter(g => g !== gun.value)
                              : [...form.gecerli_gunler, gun.value];
                            setForm({ ...form, gecerli_gunler: newList });
                          }}
                        >
                          {gun.short}
                        </button>
                      ))}
                    </div>
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
                      onClick={() => setForm({ ...form, aktif: !form.aktif })}
                    >
                      <div style={{
                        ...styles.toggleKnob,
                        ...(form.aktif ? styles.toggleKnobActive : {})
                      }} />
                    </div>
                    <span style={{ color: form.aktif ? '#28a745' : '#666' }}>
                      {form.aktif ? '✅ Aktif' : '⏸️ Pasif'}
                    </span>
                  </div>
                </div>

                {/* Önizleme */}
                {form.ad && (
                  <div style={styles.previewCard}>
                    {form.badge_metni && (
                      <div style={styles.previewBadge}>{form.badge_metni}</div>
                    )}
                    <div style={styles.previewName}>{form.ad}</div>
                    <div style={{ marginTop: '8px', color: '#666' }}>
                      {formatKampanyaTipi({ 
                        kampanya_tipi: form.kampanya_tipi, 
                        indirim_degeri: form.indirim_degeri,
                        x_adet: form.x_adet,
                        y_adet: form.y_adet
                      })}
                    </div>
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
                  {saving ? '⏳ Kaydediliyor...' : (editingKampanya ? '💾 Güncelle' : '➕ Oluştur')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAY MODAL */}
      {detailModalOpen && selectedKampanya && (
        <div style={styles.modalOverlay} onClick={() => setDetailModalOpen(false)}>
          <div style={{ ...styles.modal, maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🎯 Kampanya Detayı</h3>
              <button style={styles.closeButton} onClick={() => setDetailModalOpen(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ ...styles.previewCard, marginBottom: '24px' }}>
                {selectedKampanya.badge_metni && (
                  <div style={styles.previewBadge}>{selectedKampanya.badge_metni}</div>
                )}
                <div style={styles.previewName}>{selectedKampanya.ad}</div>
                <div style={{ marginTop: '8px', color: '#28a745', fontWeight: '600' }}>
                  {formatKampanyaTipi(selectedKampanya)}
                </div>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Durum</span>
                <span style={styles.detailValue}>{getKampanyaStatus(selectedKampanya).label}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Tip</span>
                <span style={styles.detailValue}>
                  {kampanyaTipleri.find(t => t.value === selectedKampanya.kampanya_tipi)?.label}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Hedef</span>
                <span style={styles.detailValue}>
                  {selectedKampanya.hedef_tipi === 'hepsi' ? 'Tüm Sistem' :
                   selectedKampanya.hedef_tipi === 'restoran' ? `${selectedKampanya.hedef_restoranlar?.length || 0} Restoran` :
                   selectedKampanya.hedef_tipi === 'kategori' ? `${selectedKampanya.hedef_kategoriler?.length || 0} Kategori` :
                   `${selectedKampanya.hedef_urunler?.length || 0} Ürün`}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Min Sipariş</span>
                <span style={styles.detailValue}>
                  {selectedKampanya.min_siparis_tutari ? `₺${selectedKampanya.min_siparis_tutari}` : 'Yok'}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Max İndirim</span>
                <span style={styles.detailValue}>
                  {selectedKampanya.max_indirim_tutari ? `₺${selectedKampanya.max_indirim_tutari}` : 'Sınırsız'}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Öncelik</span>
                <span style={styles.detailValue}>{selectedKampanya.oncelik}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Kullanım</span>
                <span style={styles.detailValue}>{selectedKampanya.kullanim_sayisi || 0} kez</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Toplam İndirim</span>
                <span style={styles.detailValue}>₺{(selectedKampanya.toplam_indirim || 0).toLocaleString()}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Tarih</span>
                <span style={styles.detailValue}>
                  {selectedKampanya.baslangic_tarihi || selectedKampanya.bitis_tarihi
                    ? `${selectedKampanya.baslangic_tarihi ? new Date(selectedKampanya.baslangic_tarihi).toLocaleDateString('tr-TR') : '∞'} - ${selectedKampanya.bitis_tarihi ? new Date(selectedKampanya.bitis_tarihi).toLocaleDateString('tr-TR') : '∞'}`
                    : 'Süresiz'}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Saat</span>
                <span style={styles.detailValue}>
                  {selectedKampanya.baslangic_saati && selectedKampanya.bitis_saati
                    ? `${selectedKampanya.baslangic_saati} - ${selectedKampanya.bitis_saati}`
                    : 'Tüm gün'}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Günler</span>
                <span style={styles.detailValue}>
                  {selectedKampanya.gecerli_gunler?.length === 7 
                    ? 'Her gün' 
                    : haftaninGunleri.filter(g => selectedKampanya.gecerli_gunler?.includes(g.value)).map(g => g.short).join(', ')}
                </span>
              </div>
              {selectedKampanya.aciklama && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Açıklama</span>
                  <span style={styles.detailValue}>{selectedKampanya.aciklama}</span>
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
              <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Kampanyayı Sil</h3>
              <p style={{ color: '#666', marginBottom: '8px' }}>
                <strong>"{deletingKampanya?.ad}"</strong>
              </p>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Bu kampanyayı silmek istediğinize emin misiniz?
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

export default KampanyaYonetimi;
