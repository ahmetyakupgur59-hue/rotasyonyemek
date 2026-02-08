import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

const KomisyonYonetimi = () => {
  // State tanımlamaları
  const [activeTab, setActiveTab] = useState('genel');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Veriler
  const [genelKomisyon, setGenelKomisyon] = useState(15);
  const [restoranlar, setRestoranlar] = useState([]);
  const [restoranKomisyonlari, setRestoranKomisyonlari] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [urunKomisyonlari, setUrunKomisyonlari] = useState([]);
  const [geciciKomisyonlar, setGeciciKomisyonlar] = useState([]);
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestoran, setSelectedRestoran] = useState('');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteType, setDeleteType] = useState('');

  // Form states
  const [restoranKomisyonForm, setRestoranKomisyonForm] = useState({
    restoran_id: '',
    komisyon_orani: '',
    aciklama: ''
  });

  const [urunKomisyonForm, setUrunKomisyonForm] = useState({
    restoran_id: '',
    urun_id: '',
    komisyon_orani: '',
    aciklama: ''
  });

  const [geciciKomisyonForm, setGeciciKomisyonForm] = useState({
    ad: '',
    tip: 'tarih',
    restoran_ids: [],
    tum_restoranlar: false,
    komisyon_orani: '',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    min_siparis_sayisi: '',
    max_siparis_sayisi: '',
    aciklama: '',
    aktif: true
  });

  // İstatistikler
  const [stats, setStats] = useState({
    genelOran: 15,
    restoranOzel: 0,
    urunOzel: 0,
    geciciAktif: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Genel komisyon ayarını çek
      const { data: sistemData } = await supabase
        .from('sistem_ayarlari')
        .select('*')
        .eq('anahtar', 'genel_komisyon')
        .single();
      
      if (sistemData) {
        setGenelKomisyon(parseFloat(sistemData.deger) || 15);
      }

      // Restoranları çek
      const { data: restoranData } = await supabase
        .from('restoranlar')
        .select('id, ad, logo, aktif')
        .order('ad');
      
      setRestoranlar(restoranData || []);

      // Restoran komisyonlarını çek
      const { data: restoranKomData } = await supabase
        .from('restoran_komisyonlari')
        .select(`
          *,
          restoran:restoran_id(id, ad, logo)
        `)
        .order('created_at', { ascending: false });
      
      setRestoranKomisyonlari(restoranKomData || []);

      // Ürünleri çek
      const { data: urunData } = await supabase
        .from('urunler')
        .select(`
          id, ad, fiyat, aktif,
          restoran:restoran_id(id, ad)
        `)
        .eq('aktif', true)
        .order('ad');
      
      setUrunler(urunData || []);

      // Ürün komisyonlarını çek
      const { data: urunKomData } = await supabase
        .from('urun_komisyonlari')
        .select(`
          *,
          urun:urun_id(id, ad, fiyat),
          restoran:restoran_id(id, ad)
        `)
        .order('created_at', { ascending: false });
      
      setUrunKomisyonlari(urunKomData || []);

      // Geçici komisyonları çek
      const { data: geciciData } = await supabase
        .from('gecici_komisyonlar')
        .select('*')
        .order('created_at', { ascending: false });
      
      setGeciciKomisyonlar(geciciData || []);

      // İstatistikleri güncelle
      setStats({
        genelOran: parseFloat(sistemData?.deger) || 15,
        restoranOzel: restoranKomData?.length || 0,
        urunOzel: urunKomData?.length || 0,
        geciciAktif: geciciData?.filter(g => g.aktif).length || 0
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

  // Genel Komisyon Kaydet
  const saveGenelKomisyon = async () => {
    setSaving(true);
    try {
      // Önce mevcut kaydı kontrol et
      const { data: existing } = await supabase
        .from('sistem_ayarlari')
        .select('id')
        .eq('anahtar', 'genel_komisyon')
        .single();

      if (existing) {
        // Güncelle
        const { error } = await supabase
          .from('sistem_ayarlari')
          .update({
            deger: genelKomisyon.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('anahtar', 'genel_komisyon');

        if (error) throw error;
      } else {
        // Yeni ekle
        const { error } = await supabase
          .from('sistem_ayarlari')
          .insert({
            anahtar: 'genel_komisyon',
            deger: genelKomisyon.toString(),
            aciklama: 'Varsayılan komisyon oranı (%)'
          });

        if (error) throw error;
      }

      showMessage('success', 'Genel komisyon oranı kaydedildi');
      setStats(prev => ({ ...prev, genelOran: genelKomisyon }));
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showMessage('error', 'Kaydetme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Restoran Komisyonu Kaydet
  const saveRestoranKomisyon = async () => {
    if (!restoranKomisyonForm.restoran_id || !restoranKomisyonForm.komisyon_orani) {
      showMessage('error', 'Lütfen restoran ve komisyon oranı seçin');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('restoran_komisyonlari')
          .update({
            komisyon_orani: parseFloat(restoranKomisyonForm.komisyon_orani),
            aciklama: restoranKomisyonForm.aciklama || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        showMessage('success', 'Komisyon güncellendi');
      } else {
        // Mevcut kayıt var mı kontrol et
        const { data: existing } = await supabase
          .from('restoran_komisyonlari')
          .select('id')
          .eq('restoran_id', restoranKomisyonForm.restoran_id)
          .single();

        if (existing) {
          showMessage('error', 'Bu restoran için zaten özel komisyon tanımlı');
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('restoran_komisyonlari')
          .insert({
            restoran_id: restoranKomisyonForm.restoran_id,
            komisyon_orani: parseFloat(restoranKomisyonForm.komisyon_orani),
            aciklama: restoranKomisyonForm.aciklama || null
          });

        if (error) throw error;
        showMessage('success', 'Restoran komisyonu eklendi');
      }

      closeModal();
      fetchAllData();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showMessage('error', 'Kaydetme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Ürün Komisyonu Kaydet
  const saveUrunKomisyon = async () => {
    if (!urunKomisyonForm.urun_id || !urunKomisyonForm.komisyon_orani) {
      showMessage('error', 'Lütfen ürün ve komisyon oranı seçin');
      return;
    }

    setSaving(true);
    try {
      const selectedUrun = urunler.find(u => u.id === urunKomisyonForm.urun_id);
      
      if (editingItem) {
        const { error } = await supabase
          .from('urun_komisyonlari')
          .update({
            komisyon_orani: parseFloat(urunKomisyonForm.komisyon_orani),
            aciklama: urunKomisyonForm.aciklama || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        showMessage('success', 'Ürün komisyonu güncellendi');
      } else {
        // Mevcut kayıt var mı kontrol et
        const { data: existing } = await supabase
          .from('urun_komisyonlari')
          .select('id')
          .eq('urun_id', urunKomisyonForm.urun_id)
          .single();

        if (existing) {
          showMessage('error', 'Bu ürün için zaten özel komisyon tanımlı');
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('urun_komisyonlari')
          .insert({
            restoran_id: selectedUrun?.restoran?.id || null,
            urun_id: urunKomisyonForm.urun_id,
            komisyon_orani: parseFloat(urunKomisyonForm.komisyon_orani),
            aciklama: urunKomisyonForm.aciklama || null
          });

        if (error) throw error;
        showMessage('success', 'Ürün komisyonu eklendi');
      }

      closeModal();
      fetchAllData();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showMessage('error', 'Kaydetme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Geçici Komisyon Kaydet
  const saveGeciciKomisyon = async () => {
    if (!geciciKomisyonForm.ad || !geciciKomisyonForm.komisyon_orani) {
      showMessage('error', 'Lütfen zorunlu alanları doldurun');
      return;
    }

    if (geciciKomisyonForm.tip === 'tarih' && (!geciciKomisyonForm.baslangic_tarihi || !geciciKomisyonForm.bitis_tarihi)) {
      showMessage('error', 'Tarih bazlı komisyon için tarih aralığı zorunludur');
      return;
    }

    if (geciciKomisyonForm.tip === 'siparis' && !geciciKomisyonForm.min_siparis_sayisi) {
      showMessage('error', 'Sipariş bazlı komisyon için minimum sipariş sayısı zorunludur');
      return;
    }

    if (!geciciKomisyonForm.tum_restoranlar && geciciKomisyonForm.restoran_ids.length === 0) {
      showMessage('error', 'En az bir restoran seçin veya "Tüm Restoranlar" işaretleyin');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ad: geciciKomisyonForm.ad,
        tip: geciciKomisyonForm.tip,
        tum_restoranlar: geciciKomisyonForm.tum_restoranlar,
        restoran_ids: geciciKomisyonForm.tum_restoranlar ? [] : geciciKomisyonForm.restoran_ids,
        komisyon_orani: parseFloat(geciciKomisyonForm.komisyon_orani),
        baslangic_tarihi: geciciKomisyonForm.tip === 'tarih' ? geciciKomisyonForm.baslangic_tarihi : null,
        bitis_tarihi: geciciKomisyonForm.tip === 'tarih' ? geciciKomisyonForm.bitis_tarihi : null,
        min_siparis_sayisi: geciciKomisyonForm.tip === 'siparis' ? parseInt(geciciKomisyonForm.min_siparis_sayisi) : null,
        max_siparis_sayisi: geciciKomisyonForm.tip === 'siparis' && geciciKomisyonForm.max_siparis_sayisi 
          ? parseInt(geciciKomisyonForm.max_siparis_sayisi) : null,
        aciklama: geciciKomisyonForm.aciklama || null,
        aktif: geciciKomisyonForm.aktif
      };

      if (editingItem) {
        const { error } = await supabase
          .from('gecici_komisyonlar')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id);

        if (error) throw error;
        showMessage('success', 'Geçici komisyon güncellendi');
      } else {
        const { error } = await supabase
          .from('gecici_komisyonlar')
          .insert(payload);

        if (error) throw error;
        showMessage('success', 'Geçici komisyon eklendi');
      }

      closeModal();
      fetchAllData();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showMessage('error', 'Kaydetme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Silme işlemi
  const handleDelete = async () => {
    if (!deletingItem) return;

    setSaving(true);
    try {
      let tableName = '';
      if (deleteType === 'restoran') tableName = 'restoran_komisyonlari';
      else if (deleteType === 'urun') tableName = 'urun_komisyonlari';
      else if (deleteType === 'gecici') tableName = 'gecici_komisyonlar';

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', deletingItem.id);

      if (error) throw error;
      
      showMessage('success', 'Komisyon başarıyla silindi');
      setDeleteModalOpen(false);
      setDeletingItem(null);
      fetchAllData();
    } catch (error) {
      console.error('Silme hatası:', error);
      showMessage('error', 'Silme sırasında hata oluştu');
    }
    setSaving(false);
  };

  // Geçici komisyon aktif/pasif toggle
  const toggleGeciciAktif = async (item) => {
    try {
      const { error } = await supabase
        .from('gecici_komisyonlar')
        .update({ aktif: !item.aktif })
        .eq('id', item.id);

      if (error) throw error;
      showMessage('success', `Komisyon ${!item.aktif ? 'aktif' : 'pasif'} yapıldı`);
      fetchAllData();
    } catch (error) {
      console.error('Durum değiştirme hatası:', error);
      showMessage('error', 'Durum değiştirilemedi');
    }
  };

  // Modal Aç
  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);

    if (type === 'restoran') {
      setRestoranKomisyonForm(item ? {
        restoran_id: item.restoran_id,
        komisyon_orani: item.komisyon_orani?.toString() || '',
        aciklama: item.aciklama || ''
      } : {
        restoran_id: '',
        komisyon_orani: '',
        aciklama: ''
      });
    } else if (type === 'urun') {
      setUrunKomisyonForm(item ? {
        restoran_id: item.restoran_id || '',
        urun_id: item.urun_id,
        komisyon_orani: item.komisyon_orani?.toString() || '',
        aciklama: item.aciklama || ''
      } : {
        restoran_id: '',
        urun_id: '',
        komisyon_orani: '',
        aciklama: ''
      });
    } else if (type === 'gecici') {
      setGeciciKomisyonForm(item ? {
        ad: item.ad || '',
        tip: item.tip || 'tarih',
        restoran_ids: item.restoran_ids || [],
        tum_restoranlar: item.tum_restoranlar || false,
        komisyon_orani: item.komisyon_orani?.toString() || '',
        baslangic_tarihi: item.baslangic_tarihi?.split('T')[0] || '',
        bitis_tarihi: item.bitis_tarihi?.split('T')[0] || '',
        min_siparis_sayisi: item.min_siparis_sayisi?.toString() || '',
        max_siparis_sayisi: item.max_siparis_sayisi?.toString() || '',
        aciklama: item.aciklama || '',
        aktif: item.aktif !== false
      } : {
        ad: '',
        tip: 'tarih',
        restoran_ids: [],
        tum_restoranlar: false,
        komisyon_orani: '',
        baslangic_tarihi: '',
        bitis_tarihi: '',
        min_siparis_sayisi: '',
        max_siparis_sayisi: '',
        aciklama: '',
        aktif: true
      });
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setModalType('');
  };

  // Silme modalı aç
  const openDeleteModal = (type, item) => {
    setDeleteType(type);
    setDeletingItem(item);
    setDeleteModalOpen(true);
  };

  // Filtrelenmiş ürünler
  const filteredUrunler = selectedRestoran
    ? urunler.filter(u => u.restoran?.id === selectedRestoran)
    : urunler;

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
    tabs: {
      display: 'flex',
      gap: '0',
      marginBottom: '24px',
      borderBottom: '2px solid #e0e0e0',
      backgroundColor: 'white',
      borderRadius: '12px 12px 0 0',
      overflow: 'hidden'
    },
    tab: {
      padding: '16px 28px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: '#666',
      borderBottom: '3px solid transparent',
      marginBottom: '-2px',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    activeTab: {
      color: '#667eea',
      borderBottomColor: '#667eea',
      fontWeight: '600',
      backgroundColor: '#f8f9ff'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      marginBottom: '20px'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1a1a2e',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    infoBox: {
      backgroundColor: '#e3f2fd',
      border: '1px solid #90caf9',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '20px'
    },
    infoTitle: {
      fontWeight: '600',
      color: '#1565c0',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    infoText: {
      color: '#1976d2',
      fontSize: '14px',
      lineHeight: '1.6'
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
    select: {
      width: '100%',
      padding: '12px 14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer',
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
      boxSizing: 'border-box'
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
      border: '1px solid #ddd',
      color: '#333'
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
    badge: {
      padding: '5px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block'
    },
    successBadge: {
      backgroundColor: '#d4edda',
      color: '#155724'
    },
    warningBadge: {
      backgroundColor: '#fff3cd',
      color: '#856404'
    },
    dangerBadge: {
      backgroundColor: '#f8d7da',
      color: '#721c24'
    },
    infoBadge: {
      backgroundColor: '#cce5ff',
      color: '#004085'
    },
    grayBadge: {
      backgroundColor: '#e9ecef',
      color: '#495057'
    },
    flexRow: {
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap'
    },
    flexCol: {
      flex: 1,
      minWidth: '200px'
    },
    sliderContainer: {
      backgroundColor: '#f8f9fa',
      padding: '24px',
      borderRadius: '12px',
      marginBottom: '20px'
    },
    slider: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px'
    },
    sliderInput: {
      flex: 1,
      height: '8px',
      borderRadius: '4px',
      appearance: 'none',
      backgroundColor: '#e0e0e0',
      cursor: 'pointer',
      outline: 'none'
    },
    sliderValue: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#667eea',
      minWidth: '100px',
      textAlign: 'center'
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
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    checkboxInput: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    multiSelect: {
      border: '1px solid #ddd',
      borderRadius: '8px',
      maxHeight: '200px',
      overflowY: 'auto'
    },
    multiSelectItem: {
      padding: '10px 14px',
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
    emptyState: {
      textAlign: 'center',
      padding: '50px 20px',
      color: '#666'
    },
    toolbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '12px'
    },
    searchInput: {
      padding: '10px 16px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      width: '250px'
    },
    priorityBox: {
      backgroundColor: '#fff8e1',
      border: '1px solid #ffe082',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '20px'
    },
    priorityTitle: {
      fontWeight: '600',
      color: '#f57c00',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    priorityList: {
      margin: 0,
      paddingLeft: '24px',
      color: '#666',
      lineHeight: '1.8'
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
    radioGroup: {
      display: 'flex',
      gap: '20px',
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
      transition: 'all 0.2s'
    },
    radioLabelSelected: {
      borderColor: '#667eea',
      backgroundColor: '#f8f9ff'
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
      padding: '24px'
    },
    restoranInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    restoranIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '8px',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px'
    }
  };

  // Loading durumu
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Komisyon verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span>💰</span>
          Komisyon Yönetimi
        </h1>
        <p style={styles.subtitle}>
          Genel, restoran özel, ürün bazlı ve geçici komisyon oranlarını yönetin
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
          <div style={{ ...styles.statIcon, backgroundColor: '#e8f5e9' }}>📊</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>%{stats.genelOran}</div>
            <div style={styles.statLabel}>Genel Komisyon Oranı</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#e3f2fd' }}>🏪</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.restoranOzel}</div>
            <div style={styles.statLabel}>Özel Restoran Komisyonu</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fff3e0' }}>🍽️</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.urunOzel}</div>
            <div style={styles.statLabel}>Özel Ürün Komisyonu</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fce4ec' }}>⏰</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.geciciAktif}</div>
            <div style={styles.statLabel}>Aktif Geçici Komisyon</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'genel' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('genel')}
        >
          <span>📊</span> Genel Komisyon
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'restoran' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('restoran')}
        >
          <span>🏪</span> Restoran Bazlı
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'urun' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('urun')}
        >
          <span>🍽️</span> Ürün/Menü Bazlı
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'gecici' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('gecici')}
        >
          <span>⏰</span> Geçici/Kampanya
        </button>
      </div>

      {/* GENEL KOMİSYON TAB */}
      {activeTab === 'genel' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <span>📊</span> Genel Komisyon Oranı
          </h3>

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>
              <span>💡</span> Bilgi
            </div>
            <p style={styles.infoText}>
              Genel komisyon oranı, özel komisyon tanımlanmamış tüm restoranlar ve ürünler için geçerlidir.
              Restoran veya ürün bazlı özel komisyon tanımladığınızda, o kayıt için özel oran kullanılır.
            </p>
          </div>

          <div style={styles.sliderContainer}>
            <div style={styles.slider}>
              <span style={{ fontSize: '14px', color: '#666' }}>%0</span>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={genelKomisyon}
                onChange={(e) => setGenelKomisyon(parseFloat(e.target.value))}
                style={styles.sliderInput}
              />
              <span style={{ fontSize: '14px', color: '#666' }}>%50</span>
              <div style={styles.sliderValue}>%{genelKomisyon}</div>
            </div>
            
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[5, 10, 15, 20, 25, 30].map(val => (
                <button
                  key={val}
                  style={{
                    ...styles.button,
                    ...styles.outlineButton,
                    padding: '8px 16px',
                    backgroundColor: genelKomisyon === val ? '#667eea' : 'white',
                    color: genelKomisyon === val ? 'white' : '#333'
                  }}
                  onClick={() => setGenelKomisyon(val)}
                >
                  %{val}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              style={{ ...styles.button, ...styles.successButton, padding: '12px 32px', fontSize: '16px' }}
              onClick={saveGenelKomisyon}
              disabled={saving}
            >
              {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
            </button>
          </div>

          <div style={styles.priorityBox}>
            <div style={styles.priorityTitle}>
              <span>📋</span> Komisyon Öncelik Sırası
            </div>
            <ol style={styles.priorityList}>
              <li><strong>Geçici/Kampanya komisyonu</strong> (aktif ve geçerli tarihte ise)</li>
              <li><strong>Ürün özel komisyonu</strong> (tanımlanmışsa)</li>
              <li><strong>Restoran özel komisyonu</strong> (tanımlanmışsa)</li>
              <li><strong>Genel komisyon oranı</strong> (varsayılan)</li>
            </ol>
          </div>
        </div>
      )}

      {/* RESTORAN BAZLI KOMİSYON TAB */}
      {activeTab === 'restoran' && (
        <div style={styles.card}>
          <div style={styles.toolbar}>
            <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>
              <span>🏪</span> Restoran Bazlı Komisyonlar
            </h3>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={() => openModal('restoran')}
            >
              <span>➕</span> Yeni Ekle
            </button>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>
              <span>💡</span> Bilgi
            </div>
            <p style={styles.infoText}>
              Belirli restoranlar için farklı komisyon oranları tanımlayabilirsiniz.
              Örneğin; yeni restoranlar için düşük komisyon, yüksek hacimli restoranlar için özel oranlar.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="🔍 Restoran ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {restoranKomisyonlari.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>📋</div>
              <h3>Henüz Özel Komisyon Yok</h3>
              <p>Restoranlara özel komisyon oranı tanımlamak için "Yeni Ekle" butonunu kullanın.</p>
              <button
                style={{ ...styles.button, ...styles.primaryButton, marginTop: '16px' }}
                onClick={() => openModal('restoran')}
              >
                ➕ İlk Komisyonu Ekle
              </button>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Restoran</th>
                  <th style={styles.th}>Komisyon Oranı</th>
                  <th style={styles.th}>Genel'e Göre Fark</th>
                  <th style={styles.th}>Açıklama</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {restoranKomisyonlari
                  .filter(rk => rk.restoran?.ad?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(rk => {
                    const fark = (rk.komisyon_orani || 0) - genelKomisyon;
                    return (
                      <tr key={rk.id}>
                        <td style={styles.td}>
                          <div style={styles.restoranInfo}>
                            <div style={styles.restoranIcon}>🏪</div>
                            <div>
                              <div style={{ fontWeight: '600' }}>{rk.restoran?.ad || 'Bilinmiyor'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...styles.infoBadge, fontSize: '15px', fontWeight: '600' }}>
                            %{rk.komisyon_orani}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            ...(fark < 0 ? styles.successBadge : fark > 0 ? styles.dangerBadge : styles.grayBadge)
                          }}>
                            {fark > 0 ? '+' : ''}{fark.toFixed(1)}%
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ color: '#666', fontSize: '13px' }}>
                            {rk.aciklama || '-'}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <div style={styles.actions}>
                            <button
                              style={styles.actionButton}
                              onClick={() => openModal('restoran', rk)}
                              title="Düzenle"
                            >
                              ✏️
                            </button>
                            <button
                              style={styles.actionButton}
                              onClick={() => openDeleteModal('restoran', rk)}
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
      )}

      {/* ÜRÜN BAZLI KOMİSYON TAB */}
      {activeTab === 'urun' && (
        <div style={styles.card}>
          <div style={styles.toolbar}>
            <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>
              <span>🍽️</span> Ürün/Menü Bazlı Komisyonlar
            </h3>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={() => openModal('urun')}
            >
              <span>➕</span> Yeni Ekle
            </button>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>
              <span>💡</span> Bilgi
            </div>
            <p style={styles.infoText}>
              Belirli ürünler/menüler için farklı komisyon oranları tanımlayabilirsiniz.
              Örneğin; içecekler için düşük komisyon, ana yemekler için standart komisyon.
            </p>
          </div>

          {urunKomisyonlari.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🍽️</div>
              <h3>Henüz Ürün Komisyonu Yok</h3>
              <p>Ürünlere özel komisyon oranı tanımlamak için "Yeni Ekle" butonunu kullanın.</p>
              <button
                style={{ ...styles.button, ...styles.primaryButton, marginTop: '16px' }}
                onClick={() => openModal('urun')}
              >
                ➕ İlk Komisyonu Ekle
              </button>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Ürün</th>
                  <th style={styles.th}>Restoran</th>
                  <th style={styles.th}>Fiyat</th>
                  <th style={styles.th}>Komisyon</th>
                  <th style={styles.th}>Açıklama</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {urunKomisyonlari.map(uk => (
                  <tr key={uk.id}>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '500' }}>{uk.urun?.ad || 'Bilinmiyor'}</span>
                    </td>
                    <td style={styles.td}>{uk.restoran?.ad || '-'}</td>
                    <td style={styles.td}>₺{uk.urun?.fiyat || 0}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...styles.infoBadge, fontSize: '15px', fontWeight: '600' }}>
                        %{uk.komisyon_orani}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: '#666', fontSize: '13px' }}>{uk.aciklama || '-'}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => openModal('urun', uk)}
                          title="Düzenle"
                        >
                          ✏️
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => openDeleteModal('urun', uk)}
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
          )}
        </div>
      )}

      {/* GEÇİCİ KOMİSYON TAB */}
      {activeTab === 'gecici' && (
        <div style={styles.card}>
          <div style={styles.toolbar}>
            <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>
              <span>⏰</span> Geçici/Kampanya Komisyonları
            </h3>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={() => openModal('gecici')}
            >
              <span>➕</span> Yeni Ekle
            </button>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>
              <span>💡</span> Bilgi
            </div>
            <p style={styles.infoText}>
              <strong>📅 Tarih Bazlı:</strong> Belirli bir tarih aralığında geçerli komisyon oranları.<br/>
              <strong>📦 Sipariş Bazlı:</strong> Restoranın belirli sipariş sayısına ulaşana kadar geçerli komisyon. 
              Örneğin: İlk 100 siparişe kadar %5 komisyon.
            </p>
          </div>

          {geciciKomisyonlar.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏰</div>
              <h3>Henüz Geçici Komisyon Yok</h3>
              <p>Tarih veya sipariş bazlı geçici komisyon tanımlamak için "Yeni Ekle" butonunu kullanın.</p>
              <button
                style={{ ...styles.button, ...styles.primaryButton, marginTop: '16px' }}
                onClick={() => openModal('gecici')}
              >
                ➕ İlk Geçici Komisyonu Ekle
              </button>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Kampanya Adı</th>
                  <th style={styles.th}>Tip</th>
                  <th style={styles.th}>Hedef</th>
                  <th style={styles.th}>Komisyon</th>
                  <th style={styles.th}>Koşul</th>
                  <th style={styles.th}>Durum</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {geciciKomisyonlar.map(gk => {
                  const now = new Date();
                  const baslangic = gk.baslangic_tarihi ? new Date(gk.baslangic_tarihi) : null;
                  const bitis = gk.bitis_tarihi ? new Date(gk.bitis_tarihi) : null;
                  
                  let durum = 'aktif';
                  let durumText = '✅ Aktif';
                  let durumStyle = styles.successBadge;
                  
                  if (!gk.aktif) {
                    durum = 'pasif';
                    durumText = '⏸️ Pasif';
                    durumStyle = styles.grayBadge;
                  } else if (gk.tip === 'tarih' && bitis && bitis < now) {
                    durum = 'bitmis';
                    durumText = '⏰ Bitmiş';
                    durumStyle = styles.dangerBadge;
                  } else if (gk.tip === 'tarih' && baslangic && baslangic > now) {
                    durum = 'bekliyor';
                    durumText = '⏳ Bekliyor';
                    durumStyle = styles.warningBadge;
                  }

                  return (
                    <tr key={gk.id}>
                      <td style={styles.td}>
                        <span style={{ fontWeight: '600' }}>{gk.ad}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          ...(gk.tip === 'tarih' ? styles.infoBadge : styles.warningBadge)
                        }}>
                          {gk.tip === 'tarih' ? '📅 Tarih' : '📦 Sipariş'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {gk.tum_restoranlar ? (
                          <span style={{ ...styles.badge, ...styles.successBadge }}>Tüm Restoranlar</span>
                        ) : (
                          <span>{gk.restoran_ids?.length || 0} restoran</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...styles.infoBadge, fontSize: '15px', fontWeight: '600' }}>
                          %{gk.komisyon_orani}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {gk.tip === 'tarih' ? (
                          <span style={{ fontSize: '13px', color: '#666' }}>
                            {baslangic?.toLocaleDateString('tr-TR')} - {bitis?.toLocaleDateString('tr-TR')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#666' }}>
                            {gk.min_siparis_sayisi} - {gk.max_siparis_sayisi || '∞'} sipariş
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span 
                          style={{ ...styles.badge, ...durumStyle, cursor: 'pointer' }}
                          onClick={() => toggleGeciciAktif(gk)}
                        >
                          {durumText}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={styles.actions}>
                          <button
                            style={styles.actionButton}
                            onClick={() => openModal('gecici', gk)}
                            title="Düzenle"
                          >
                            ✏️
                          </button>
                          <button
                            style={styles.actionButton}
                            onClick={() => openDeleteModal('gecici', gk)}
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
      )}

      {/* EKLEME/DÜZENLEME MODAL */}
      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {modalType === 'restoran' && (editingItem ? '✏️ Restoran Komisyonu Düzenle' : '➕ Yeni Restoran Komisyonu')}
                {modalType === 'urun' && (editingItem ? '✏️ Ürün Komisyonu Düzenle' : '➕ Yeni Ürün Komisyonu')}
                {modalType === 'gecici' && (editingItem ? '✏️ Geçici Komisyon Düzenle' : '➕ Yeni Geçici Komisyon')}
              </h3>
              <button style={styles.closeButton} onClick={closeModal}>×</button>
            </div>

            <div style={styles.modalBody}>
              {/* RESTORAN KOMİSYON FORMU */}
              {modalType === 'restoran' && (
                <>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Restoran *</label>
                    <select
                      style={styles.select}
                      value={restoranKomisyonForm.restoran_id}
                      onChange={(e) => setRestoranKomisyonForm({...restoranKomisyonForm, restoran_id: e.target.value})}
                      disabled={!!editingItem}
                    >
                      <option value="">-- Restoran Seçin --</option>
                      {restoranlar.map(r => (
                        <option key={r.id} value={r.id}>{r.ad}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Komisyon Oranı (%) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      style={styles.input}
                      value={restoranKomisyonForm.komisyon_orani}
                      onChange={(e) => setRestoranKomisyonForm({...restoranKomisyonForm, komisyon_orani: e.target.value})}
                      placeholder="Örn: 12"
                    />
                    <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                      Genel komisyon: %{genelKomisyon}
                    </small>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Açıklama (Opsiyonel)</label>
                    <textarea
                      style={styles.textarea}
                      value={restoranKomisyonForm.aciklama}
                      onChange={(e) => setRestoranKomisyonForm({...restoranKomisyonForm, aciklama: e.target.value})}
                      placeholder="Neden farklı komisyon uygulandığını not edin..."
                    />
                  </div>
                </>
              )}

              {/* ÜRÜN KOMİSYON FORMU */}
              {modalType === 'urun' && (
                <>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Restoran (Filtre)</label>
                    <select
                      style={styles.select}
                      value={urunKomisyonForm.restoran_id}
                      onChange={(e) => setUrunKomisyonForm({...urunKomisyonForm, restoran_id: e.target.value, urun_id: ''})}
                    >
                      <option value="">-- Tüm Restoranlar --</option>
                      {restoranlar.map(r => (
                        <option key={r.id} value={r.id}>{r.ad}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Ürün *</label>
                    <select
                      style={styles.select}
                      value={urunKomisyonForm.urun_id}
                      onChange={(e) => setUrunKomisyonForm({...urunKomisyonForm, urun_id: e.target.value})}
                      disabled={!!editingItem}
                    >
                      <option value="">-- Ürün Seçin --</option>
                      {(urunKomisyonForm.restoran_id 
                        ? urunler.filter(u => u.restoran?.id === urunKomisyonForm.restoran_id)
                        : urunler
                      ).map(u => (
                        <option key={u.id} value={u.id}>
                          {u.ad} - {u.restoran?.ad} (₺{u.fiyat})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Komisyon Oranı (%) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      style={styles.input}
                      value={urunKomisyonForm.komisyon_orani}
                      onChange={(e) => setUrunKomisyonForm({...urunKomisyonForm, komisyon_orani: e.target.value})}
                      placeholder="Örn: 8"
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Açıklama (Opsiyonel)</label>
                    <textarea
                      style={styles.textarea}
                      value={urunKomisyonForm.aciklama}
                      onChange={(e) => setUrunKomisyonForm({...urunKomisyonForm, aciklama: e.target.value})}
                      placeholder="Örn: İçecekler için düşük komisyon..."
                    />
                  </div>
                </>
              )}

              {/* GEÇİCİ KOMİSYON FORMU */}
              {modalType === 'gecici' && (
                <>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Kampanya Adı *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={geciciKomisyonForm.ad}
                      onChange={(e) => setGeciciKomisyonForm({...geciciKomisyonForm, ad: e.target.value})}
                      placeholder="Örn: Yeni Yıl Kampanyası, Yeni Restoran Desteği"
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Komisyon Tipi *</label>
                    <div style={styles.radioGroup}>
                      <label 
                        style={{
                          ...styles.radioLabel,
                          ...(geciciKomisyonForm.tip === 'tarih' ? styles.radioLabelSelected : {})
                        }}
                      >
                        <input
                          type="radio"
                          checked={geciciKomisyonForm.tip === 'tarih'}
                          onChange={() => setGeciciKomisyonForm({...geciciKomisyonForm, tip: 'tarih'})}
                        />
                        <span>📅 Tarih Bazlı</span>
                      </label>
                      <label 
                        style={{
                          ...styles.radioLabel,
                          ...(geciciKomisyonForm.tip === 'siparis' ? styles.radioLabelSelected : {})
                        }}
                      >
                        <input
                          type="radio"
                          checked={geciciKomisyonForm.tip === 'siparis'}
                          onChange={() => setGeciciKomisyonForm({...geciciKomisyonForm, tip: 'siparis'})}
                        />
                        <span>📦 Sipariş Bazlı</span>
                      </label>
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Komisyon Oranı (%) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      style={styles.input}
                      value={geciciKomisyonForm.komisyon_orani}
                      onChange={(e) => setGeciciKomisyonForm({...geciciKomisyonForm, komisyon_orani: e.target.value})}
                      placeholder="Örn: 5"
                    />
                  </div>

                  {geciciKomisyonForm.tip === 'tarih' && (
                    <div style={styles.flexRow}>
                      <div style={styles.flexCol}>
                        <label style={styles.label}>Başlangıç Tarihi *</label>
                        <input
                          type="date"
                          style={styles.input}
                          value={geciciKomisyonForm.baslangic_tarihi}
                          onChange={(e) => setGeciciKomisyonForm({...geciciKomisyonForm, baslangic_tarihi: e.target.value})}
                        />
                      </div>
                      <div style={styles.flexCol}>
                        <label style={styles.label}>Bitiş Tarihi *</label>
                        <input
                          type="date"
                          style={styles.input}
                          value={geciciKomisyonForm.bitis_tarihi}
                          onChange={(e) => setGeciciKomisyonForm({...geciciKomisyonForm, bitis_tarihi: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {geciciKomisyonForm.tip === 'siparis' && (
                    <div style={styles.flexRow}>
                      <div style={styles.flexCol}>
                        <label style={styles.label}>Min. Sipariş Sayısı *</label>
                        <input
                          type="number"
                          min="0"
                          style={styles.input}
                          value={geciciKomisyonForm.min_siparis_sayisi}
                          onChange={(e) => setGeciciKomisyonForm({...geciciKomisyonForm, min_siparis_sayisi: e.target.value})}
                          placeholder="Örn: 0"
                        />
                      </div>
                      <div style={styles.flexCol}>
                        <label style={styles.label}>Max. Sipariş Sayısı</label>
                        <input
                          type="number"
                          min="0"
                          style={styles.input}
                          value={geciciKomisyonForm.max_siparis_sayisi}
                          onChange={(e) => setGeciciKomisyonForm({...geciciKomisyonForm, max_siparis_sayisi: e.target.value})}
                          placeholder="Boş = Sınırsız"
                        />
                      </div>
                    </div>
                  )}

                  <div style={styles.inputGroup}>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        style={styles.checkboxInput}
                        checked={geciciKomisyonForm.tum_restoranlar}
                        onChange={(e) => setGeciciKomisyonForm({
                          ...geciciKomisyonForm, 
                          tum_restoranlar: e.target.checked,
                          restoran_ids: e.target.checked ? [] : geciciKomisyonForm.restoran_ids
                        })}
                      />
                      <span>🌍 Tüm Restoranlara Uygula</span>
                    </label>
                  </div>

                  {!geciciKomisyonForm.tum_restoranlar && (
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>
                        Restoranlar Seçin * 
                        <span style={{ fontWeight: 'normal', color: '#888' }}>
                          {' '}({geciciKomisyonForm.restoran_ids.length} seçili)
                        </span>
                      </label>
                      <div style={styles.multiSelect}>
                        {restoranlar.map(r => (
                          <div
                            key={r.id}
                            style={{
                              ...styles.multiSelectItem,
                              ...(geciciKomisyonForm.restoran_ids.includes(r.id) ? styles.multiSelectItemSelected : {})
                            }}
                            onClick={() => {
                              const newIds = geciciKomisyonForm.restoran_ids.includes(r.id)
                                ? geciciKomisyonForm.restoran_ids.filter(id => id !== r.id)
                                : [...geciciKomisyonForm.restoran_ids, r.id];
                              setGeciciKomisyonForm({...geciciKomisyonForm, restoran_ids: newIds});
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={geciciKomisyonForm.restoran_ids.includes(r.id)}
                              readOnly
                            />
                            <span>🏪 {r.ad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Açıklama (Opsiyonel)</label>
                    <textarea
                      style={styles.textarea}
                      value={geciciKomisyonForm.aciklama}
                      onChange={(e) => setGeciciKomisyonForm({...geciciKomisyonForm, aciklama: e.target.value})}
                      placeholder="Kampanya detayları..."
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Durum</label>
                    <div style={styles.toggle}>
                      <div 
                        style={{
                          ...styles.toggleSwitch,
                          ...(geciciKomisyonForm.aktif ? styles.toggleSwitchActive : {})
                        }}
                        onClick={() => setGeciciKomisyonForm({...geciciKomisyonForm, aktif: !geciciKomisyonForm.aktif})}
                      >
                        <div style={{
                          ...styles.toggleKnob,
                          ...(geciciKomisyonForm.aktif ? styles.toggleKnobActive : {})
                        }} />
                      </div>
                      <span style={{ color: geciciKomisyonForm.aktif ? '#28a745' : '#666' }}>
                        {geciciKomisyonForm.aktif ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                style={{ ...styles.button, ...styles.outlineButton }}
                onClick={closeModal}
              >
                İptal
              </button>
              <button
                style={{ ...styles.button, ...styles.successButton }}
                onClick={() => {
                  if (modalType === 'restoran') saveRestoranKomisyon();
                  else if (modalType === 'urun') saveUrunKomisyon();
                  else if (modalType === 'gecici') saveGeciciKomisyon();
                }}
                disabled={saving}
              >
                {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
              </button>
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
              <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Komisyonu Sil</h3>
              <p style={{ color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>
                Bu komisyon kaydını silmek istediğinize emin misiniz?
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

export default KomisyonYonetimi;