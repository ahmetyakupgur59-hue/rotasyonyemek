// src/pages/admin/admin-components/BolgeYonetimi.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../services/supabase';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';
import Modal from './common/Modal';
import { useToast } from './common/Toast';

const BolgeYonetimi = () => {
  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sehirler'); // sehirler, ilceler, mahalleler, restoranlar
  
  // Data
  const [sehirler, setSehirler] = useState([]);
  const [ilceler, setIlceler] = useState([]);
  const [mahalleler, setMahalleler] = useState([]);
  const [restoranBolgeleri, setRestoranBolgeleri] = useState([]);
  const [restoranlar, setRestoranlar] = useState([]);
  
  // Filters
  const [selectedSehir, setSelectedSehir] = useState(null);
  const [selectedIlce, setSelectedIlce] = useState(null);
  const [selectedRestoran, setSelectedRestoran] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showSehirModal, setShowSehirModal] = useState(false);
  const [showIlceModal, setShowIlceModal] = useState(false);
  const [showMahalleModal, setShowMahalleModal] = useState(false);
  const [showBolgeModal, setShowBolgeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Edit States
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState({ type: '', item: null });
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form States
  const [sehirForm, setSehirForm] = useState({ ad: '', plaka_kodu: '', aktif: true });
  const [ilceForm, setIlceForm] = useState({ sehir_id: '', ad: '', aktif: true });
  const [mahalleForm, setMahalleForm] = useState({ ilce_id: '', ad: '', posta_kodu: '', aktif: true });
  const [bolgeForm, setBolgeForm] = useState({ 
    restoran_id: '', 
    mahalle_id: '', 
    min_sepet_tutari: 0, 
    teslimat_ucreti: 0,
    teslimat_suresi: 30,
    aktif: true 
  });

  const toast = useToast();
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // ==================== VERİ ÇEKME ====================
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Şehirler
      const { data: sehirData, error: sehirError } = await supabase
        .from('sehirler')
        .select('*')
        .order('ad');
      if (sehirError) throw sehirError;
      setSehirler(sehirData || []);

      // İlçeler
      const { data: ilceData, error: ilceError } = await supabase
        .from('ilceler')
        .select(`
          *,
          sehir:sehirler(id, ad)
        `)
        .order('ad');
      if (ilceError) throw ilceError;
      setIlceler(ilceData || []);

      // Mahalleler
      const { data: mahalleData, error: mahalleError } = await supabase
        .from('mahalleler')
        .select(`
          *,
          ilce:ilceler(
            id, 
            ad,
            sehir:sehirler(id, ad)
          )
        `)
        .order('ad');
      if (mahalleError) throw mahalleError;
      setMahalleler(mahalleData || []);

      // Restoranlar
      const { data: restoranData, error: restoranError } = await supabase
        .from('restoranlar')
        .select('id, ad, aktif')
        .eq('aktif', true)
        .order('ad');
      if (restoranError) throw restoranError;
      setRestoranlar(restoranData || []);

      // Restoran Bölgeleri
      const { data: bolgeData, error: bolgeError } = await supabase
        .from('restoran_bolgeleri')
        .select(`
          *,
          restoran:restoranlar(id, ad),
          mahalle:mahalleler(
            id, 
            ad,
            ilce:ilceler(
              id, 
              ad,
              sehir:sehirler(id, ad)
            )
          )
        `)
        .order('created_at', { ascending: false });
      if (bolgeError) throw bolgeError;
      setRestoranBolgeleri(bolgeData || []);

    } catch (err) {
      console.error('Veriler yüklenirken hata:', err);
      toastRef.current.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ==================== FİLTRELENMİŞ VERİLER ====================
  
  const filteredIlceler = ilceler.filter(ilce => 
    (!selectedSehir || ilce.sehir_id === selectedSehir) &&
    (!searchTerm || ilce.ad.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMahalleler = mahalleler.filter(mahalle => {
    const matchSehir = !selectedSehir || mahalle.ilce?.sehir?.id === selectedSehir;
    const matchIlce = !selectedIlce || mahalle.ilce_id === selectedIlce;
    const matchSearch = !searchTerm || mahalle.ad.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSehir && matchIlce && matchSearch;
  });

  const filteredBolgeler = restoranBolgeleri.filter(bolge => {
    const matchRestoran = !selectedRestoran || bolge.restoran_id === selectedRestoran;
    const matchSehir = !selectedSehir || bolge.mahalle?.ilce?.sehir?.id === selectedSehir;
    return matchRestoran && matchSehir;
  });

  // ==================== STATS ====================
  const stats = {
    sehirSayisi: sehirler.length,
    ilceSayisi: ilceler.length,
    mahalleSayisi: mahalleler.length,
    hizmetBolgesi: restoranBolgeleri.filter(b => b.aktif).length
  };

  // ==================== ŞEHİR HANDLERS ====================
  
  const handleAddSehir = () => {
    setEditingItem(null);
    setSehirForm({ ad: '', plaka_kodu: '', aktif: true });
    setShowSehirModal(true);
  };

  const handleEditSehir = (sehir) => {
    setEditingItem(sehir);
    setSehirForm({ 
      ad: sehir.ad, 
      plaka_kodu: sehir.plaka_kodu || '', 
      aktif: sehir.aktif 
    });
    setShowSehirModal(true);
  };

  const handleSaveSehir = async () => {
    if (!sehirForm.ad.trim()) {
      toastRef.current.warning('Şehir adı gereklidir');
      return;
    }

    try {
      setActionLoading(true);

      if (editingItem) {
        const { error } = await supabase
          .from('sehirler')
          .update({ 
            ad: sehirForm.ad.trim(), 
            plaka_kodu: sehirForm.plaka_kodu.trim(),
            aktif: sehirForm.aktif 
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toastRef.current.success('Şehir güncellendi');
      } else {
        const { error } = await supabase
          .from('sehirler')
          .insert([{ 
            ad: sehirForm.ad.trim(), 
            plaka_kodu: sehirForm.plaka_kodu.trim(),
            aktif: sehirForm.aktif 
          }]);
        if (error) throw error;
        toastRef.current.success('Şehir eklendi');
      }

      setShowSehirModal(false);
      fetchAllData();
    } catch (err) {
      console.error('Şehir kaydedilirken hata:', err);
      toast.error(err.message?.includes('duplicate') ? 'Bu şehir zaten var' : 'Hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== İLÇE HANDLERS ====================
  
  const handleAddIlce = () => {
    setEditingItem(null);
    setIlceForm({ sehir_id: selectedSehir || '', ad: '', aktif: true });
    setShowIlceModal(true);
  };

  const handleEditIlce = (ilce) => {
    setEditingItem(ilce);
    setIlceForm({ 
      sehir_id: ilce.sehir_id, 
      ad: ilce.ad, 
      aktif: ilce.aktif 
    });
    setShowIlceModal(true);
  };

  const handleSaveIlce = async () => {
    if (!ilceForm.sehir_id || !ilceForm.ad.trim()) {
      toastRef.current.warning('Şehir ve ilçe adı gereklidir');
      return;
    }

    try {
      setActionLoading(true);

      if (editingItem) {
        const { error } = await supabase
          .from('ilceler')
          .update({ 
            sehir_id: ilceForm.sehir_id,
            ad: ilceForm.ad.trim(), 
            aktif: ilceForm.aktif 
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toastRef.current.success('İlçe güncellendi');
      } else {
        const { error } = await supabase
          .from('ilceler')
          .insert([{ 
            sehir_id: ilceForm.sehir_id,
            ad: ilceForm.ad.trim(), 
            aktif: ilceForm.aktif 
          }]);
        if (error) throw error;
        toastRef.current.success('İlçe eklendi');
      }

      setShowIlceModal(false);
      fetchAllData();
    } catch (err) {
      console.error('İlçe kaydedilirken hata:', err);
      toastRef.current.error(err.message?.includes('duplicate') ? 'Bu ilçe zaten var' : 'Hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== MAHALLE HANDLERS ====================
  
  const handleAddMahalle = () => {
    setEditingItem(null);
    setMahalleForm({ ilce_id: selectedIlce || '', ad: '', posta_kodu: '', aktif: true });
    setShowMahalleModal(true);
  };

  const handleEditMahalle = (mahalle) => {
    setEditingItem(mahalle);
    setMahalleForm({ 
      ilce_id: mahalle.ilce_id, 
      ad: mahalle.ad, 
      posta_kodu: mahalle.posta_kodu || '',
      aktif: mahalle.aktif 
    });
    setShowMahalleModal(true);
  };

  const handleSaveMahalle = async () => {
    if (!mahalleForm.ilce_id || !mahalleForm.ad.trim()) {
      toastRef.current.warning('İlçe ve mahalle adı gereklidir');
      return;
    }

    try {
      setActionLoading(true);

      if (editingItem) {
        const { error } = await supabase
          .from('mahalleler')
          .update({ 
            ilce_id: mahalleForm.ilce_id,
            ad: mahalleForm.ad.trim(), 
            posta_kodu: mahalleForm.posta_kodu.trim(),
            aktif: mahalleForm.aktif 
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toastRef.current.success('Mahalle güncellendi');
      } else {
        const { error } = await supabase
          .from('mahalleler')
          .insert([{ 
            ilce_id: mahalleForm.ilce_id,
            ad: mahalleForm.ad.trim(), 
            posta_kodu: mahalleForm.posta_kodu.trim(),
            aktif: mahalleForm.aktif 
          }]);
        if (error) throw error;
        toastRef.current.success('Mahalle eklendi');
      }

      setShowMahalleModal(false);
      fetchAllData();
    } catch (err) {
      console.error('Mahalle kaydedilirken hata:', err);
      toastRef.current.error(err.message?.includes('duplicate') ? 'Bu mahalle zaten var' : 'Hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== RESTORAN BÖLGESİ HANDLERS ====================
  
  const handleAddBolge = () => {
    setEditingItem(null);
    setBolgeForm({ 
      restoran_id: selectedRestoran || '', 
      mahalle_id: '', 
      min_sepet_tutari: 0, 
      teslimat_ucreti: 0,
      teslimat_suresi: 30,
      aktif: true 
    });
    setShowBolgeModal(true);
  };

  const handleEditBolge = (bolge) => {
    setEditingItem(bolge);
    setBolgeForm({ 
      restoran_id: bolge.restoran_id, 
      mahalle_id: bolge.mahalle_id, 
      min_sepet_tutari: bolge.min_sepet_tutari || 0, 
      teslimat_ucreti: bolge.teslimat_ucreti || 0,
      teslimat_suresi: bolge.teslimat_suresi || 30,
      aktif: bolge.aktif 
    });
    setShowBolgeModal(true);
  };

  const handleSaveBolge = async () => {
    if (!bolgeForm.restoran_id || !bolgeForm.mahalle_id) {
      toastRef.current.warning('Restoran ve mahalle seçimi gereklidir');
      return;
    }

    try {
      setActionLoading(true);

      const bolgeData = {
        restoran_id: bolgeForm.restoran_id,
        mahalle_id: bolgeForm.mahalle_id,
        min_sepet_tutari: parseFloat(bolgeForm.min_sepet_tutari) || 0,
        teslimat_ucreti: parseFloat(bolgeForm.teslimat_ucreti) || 0,
        teslimat_suresi: parseInt(bolgeForm.teslimat_suresi) || 30,
        aktif: bolgeForm.aktif
      };

      if (editingItem) {
        const { error } = await supabase
          .from('restoran_bolgeleri')
          .update(bolgeData)
          .eq('id', editingItem.id);
        if (error) throw error;
        toastRef.current.success('Hizmet bölgesi güncellendi');
      } else {
        const { error } = await supabase
          .from('restoran_bolgeleri')
          .insert([bolgeData]);
        if (error) throw error;
        toastRef.current.success('Hizmet bölgesi eklendi');
      }

      setShowBolgeModal(false);
      fetchAllData();
    } catch (err) {
      console.error('Bölge kaydedilirken hata:', err);
      toastRef.current.error(err.message?.includes('duplicate') ? 'Bu bölge zaten tanımlı' : 'Hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== SİLME HANDLER ====================
  
  const handleDeleteClick = (type, item) => {
    setDeleteTarget({ type, item });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget.item) return;

    try {
      setActionLoading(true);
      
      const tableMap = {
        sehir: 'sehirler',
        ilce: 'ilceler',
        mahalle: 'mahalleler',
        bolge: 'restoran_bolgeleri'
      };

      const { error } = await supabase
        .from(tableMap[deleteTarget.type])
        .delete()
        .eq('id', deleteTarget.item.id);

      if (error) throw error;

      toastRef.current.success('Kayıt silindi');
      setShowDeleteModal(false);
      setDeleteTarget({ type: '', item: null });
      fetchAllData();
    } catch (err) {
      console.error('Silme hatası:', err);
      toastRef.current.error('Silme işlemi başarısız. Alt kayıtlar olabilir.');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== RENDER ====================
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Bölge Yönetimi</h2>
          <p style={styles.subtitle}>Şehir, ilçe, mahalle ve restoran hizmet bölgelerini yönetin</p>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard} onClick={() => setActiveTab('sehirler')}>
          <div style={{ ...styles.statIcon, backgroundColor: '#eff6ff' }}>🏙️</div>
          <div>
            <p style={styles.statLabel}>Şehir</p>
            <p style={styles.statValue}>{stats.sehirSayisi}</p>
          </div>
        </div>
        <div style={styles.statCard} onClick={() => setActiveTab('ilceler')}>
          <div style={{ ...styles.statIcon, backgroundColor: '#f0fdf4' }}>🏘️</div>
          <div>
            <p style={styles.statLabel}>İlçe</p>
            <p style={{ ...styles.statValue, color: '#22c55e' }}>{stats.ilceSayisi}</p>
          </div>
        </div>
        <div style={styles.statCard} onClick={() => setActiveTab('mahalleler')}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fef3c7' }}>📍</div>
          <div>
            <p style={styles.statLabel}>Mahalle</p>
            <p style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.mahalleSayisi}</p>
          </div>
        </div>
        <div style={styles.statCard} onClick={() => setActiveTab('restoranlar')}>
          <div style={{ ...styles.statIcon, backgroundColor: '#fce7f3' }}>🚚</div>
          <div>
            <p style={styles.statLabel}>Hizmet Bölgesi</p>
            <p style={{ ...styles.statValue, color: '#ec4899' }}>{stats.hizmetBolgesi}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { id: 'sehirler', label: '🏙️ Şehirler', count: sehirler.length },
          { id: 'ilceler', label: '🏘️ İlçeler', count: ilceler.length },
          { id: 'mahalleler', label: '📍 Mahalleler', count: mahalleler.length },
          { id: 'restoranlar', label: '🚚 Hizmet Bölgeleri', count: restoranBolgeleri.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchTerm('');
            }}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id && styles.tabActive),
            }}
          >
            {tab.label}
            <span style={{
              ...styles.tabCount,
              backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Bölgeler yükleniyor..." />
      ) : (
        <>
          {/* ==================== ŞEHİRLER TAB ==================== */}
          {activeTab === 'sehirler' && (
            <div style={styles.content}>
              <div style={styles.contentHeader}>
                <h3 style={styles.contentTitle}>Şehirler</h3>
                <button onClick={handleAddSehir} style={styles.addButton}>
                  + Şehir Ekle
                </button>
              </div>
              
              {sehirler.length === 0 ? (
                <EmptyState
                  icon="🏙️"
                  title="Henüz Şehir Yok"
                  message="İlk şehri ekleyerek başlayın"
                  action={<button onClick={handleAddSehir} style={styles.emptyButton}>+ Şehir Ekle</button>}
                />
              ) : (
                <div style={styles.grid}>
                  {sehirler.map(sehir => {
                    const ilceSayisi = ilceler.filter(i => i.sehir_id === sehir.id).length;
                    return (
                      <div key={sehir.id} style={{
                        ...styles.card,
                        opacity: sehir.aktif ? 1 : 0.6,
                      }}>
                        <div style={styles.cardHeader}>
                          <div style={styles.cardIcon}>🏙️</div>
                          <div style={styles.cardInfo}>
                            <h4 style={styles.cardTitle}>{sehir.ad}</h4>
                            {sehir.plaka_kodu && (
                              <span style={styles.cardBadge}>{sehir.plaka_kodu}</span>
                            )}
                          </div>
                        </div>
                        <div style={styles.cardMeta}>
                          <span>{ilceSayisi} ilçe</span>
                          <span style={{
                            ...styles.statusDot,
                            backgroundColor: sehir.aktif ? '#22c55e' : '#ef4444'
                          }}></span>
                        </div>
                        <div style={styles.cardActions}>
                          <button
                            onClick={() => {
                              setSelectedSehir(sehir.id);
                              setActiveTab('ilceler');
                            }}
                            style={{ ...styles.actionBtn, backgroundColor: '#eff6ff' }}
                          >
                            👁️ İlçeler
                          </button>
                          <button
                            onClick={() => handleEditSehir(sehir)}
                            style={{ ...styles.actionBtn, backgroundColor: '#fef3c7' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteClick('sehir', sehir)}
                            style={{ ...styles.actionBtn, backgroundColor: '#fef2f2' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== İLÇELER TAB ==================== */}
          {activeTab === 'ilceler' && (
            <div style={styles.content}>
              <div style={styles.contentHeader}>
                <div style={styles.filterRow}>
                  <select
                    value={selectedSehir || ''}
                    onChange={(e) => setSelectedSehir(e.target.value || null)}
                    style={styles.filterSelect}
                  >
                    <option value="">Tüm Şehirler</option>
                    {sehirler.map(s => (
                      <option key={s.id} value={s.id}>{s.ad}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="İlçe ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>
                <button onClick={handleAddIlce} style={styles.addButton}>
                  + İlçe Ekle
                </button>
              </div>

              {filteredIlceler.length === 0 ? (
                <EmptyState
                  icon="🏘️"
                  title="İlçe Bulunamadı"
                  message={selectedSehir ? "Bu şehirde ilçe yok" : "Henüz ilçe eklenmemiş"}
                  action={<button onClick={handleAddIlce} style={styles.emptyButton}>+ İlçe Ekle</button>}
                />
              ) : (
                <div style={styles.grid}>
                  {filteredIlceler.map(ilce => {
                    const mahalleSayisi = mahalleler.filter(m => m.ilce_id === ilce.id).length;
                    return (
                      <div key={ilce.id} style={{
                        ...styles.card,
                        opacity: ilce.aktif ? 1 : 0.6,
                      }}>
                        <div style={styles.cardHeader}>
                          <div style={{ ...styles.cardIcon, backgroundColor: '#f0fdf4' }}>🏘️</div>
                          <div style={styles.cardInfo}>
                            <h4 style={styles.cardTitle}>{ilce.ad}</h4>
                            <span style={styles.cardSubtitle}>{ilce.sehir?.ad}</span>
                          </div>
                        </div>
                        <div style={styles.cardMeta}>
                          <span>{mahalleSayisi} mahalle</span>
                          <span style={{
                            ...styles.statusDot,
                            backgroundColor: ilce.aktif ? '#22c55e' : '#ef4444'
                          }}></span>
                        </div>
                        <div style={styles.cardActions}>
                          <button
                            onClick={() => {
                              setSelectedIlce(ilce.id);
                              setActiveTab('mahalleler');
                            }}
                            style={{ ...styles.actionBtn, backgroundColor: '#eff6ff' }}
                          >
                            👁️ Mahalleler
                          </button>
                          <button
                            onClick={() => handleEditIlce(ilce)}
                            style={{ ...styles.actionBtn, backgroundColor: '#fef3c7' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteClick('ilce', ilce)}
                            style={{ ...styles.actionBtn, backgroundColor: '#fef2f2' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== MAHALLELER TAB ==================== */}
          {activeTab === 'mahalleler' && (
            <div style={styles.content}>
              <div style={styles.contentHeader}>
                <div style={styles.filterRow}>
                  <select
                    value={selectedSehir || ''}
                    onChange={(e) => {
                      setSelectedSehir(e.target.value || null);
                      setSelectedIlce(null);
                    }}
                    style={styles.filterSelect}
                  >
                    <option value="">Tüm Şehirler</option>
                    {sehirler.map(s => (
                      <option key={s.id} value={s.id}>{s.ad}</option>
                    ))}
                  </select>
                  <select
                    value={selectedIlce || ''}
                    onChange={(e) => setSelectedIlce(e.target.value || null)}
                    style={styles.filterSelect}
                    disabled={!selectedSehir}
                  >
                    <option value="">Tüm İlçeler</option>
                    {ilceler
                      .filter(i => i.sehir_id === selectedSehir)
                      .map(i => (
                        <option key={i.id} value={i.id}>{i.ad}</option>
                      ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Mahalle ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>
                <button onClick={handleAddMahalle} style={styles.addButton}>
                  + Mahalle Ekle
                </button>
              </div>

              {filteredMahalleler.length === 0 ? (
                <EmptyState
                  icon="📍"
                  title="Mahalle Bulunamadı"
                  message="Henüz mahalle eklenmemiş"
                  action={<button onClick={handleAddMahalle} style={styles.emptyButton}>+ Mahalle Ekle</button>}
                />
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Mahalle</th>
                        <th style={styles.th}>İlçe</th>
                        <th style={styles.th}>Şehir</th>
                        <th style={styles.th}>Posta Kodu</th>
                        <th style={styles.th}>Durum</th>
                        <th style={styles.th}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMahalleler.map(mahalle => (
                        <tr key={mahalle.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.cellWithIcon}>
                              <span>📍</span>
                              <strong>{mahalle.ad}</strong>
                            </div>
                          </td>
                          <td style={styles.td}>{mahalle.ilce?.ad}</td>
                          <td style={styles.td}>{mahalle.ilce?.sehir?.ad}</td>
                          <td style={styles.td}>{mahalle.posta_kodu || '-'}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: mahalle.aktif ? '#dcfce7' : '#fee2e2',
                              color: mahalle.aktif ? '#16a34a' : '#dc2626',
                            }}>
                              {mahalle.aktif ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.tableActions}>
                              <button
                                onClick={() => handleEditMahalle(mahalle)}
                                style={{ ...styles.smallBtn, backgroundColor: '#eff6ff' }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteClick('mahalle', mahalle)}
                                style={{ ...styles.smallBtn, backgroundColor: '#fef2f2' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== RESTORAN BÖLGELERİ TAB ==================== */}
          {activeTab === 'restoranlar' && (
            <div style={styles.content}>
              <div style={styles.contentHeader}>
                <div style={styles.filterRow}>
                  <select
                    value={selectedRestoran || ''}
                    onChange={(e) => setSelectedRestoran(e.target.value || null)}
                    style={styles.filterSelect}
                  >
                    <option value="">Tüm Restoranlar</option>
                    {restoranlar.map(r => (
                      <option key={r.id} value={r.id}>{r.ad}</option>
                    ))}
                  </select>
                  <select
                    value={selectedSehir || ''}
                    onChange={(e) => setSelectedSehir(e.target.value || null)}
                    style={styles.filterSelect}
                  >
                    <option value="">Tüm Şehirler</option>
                    {sehirler.map(s => (
                      <option key={s.id} value={s.id}>{s.ad}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleAddBolge} style={styles.addButton}>
                  + Hizmet Bölgesi Ekle
                </button>
              </div>

              {/* Bilgi Kutusu */}
              <div style={styles.infoBox}>
                <span style={styles.infoIcon}>💡</span>
                <div>
                  <strong>Hizmet Bölgesi Nasıl Çalışır?</strong>
                  <p style={styles.infoText}>
                    Restoranlar yalnızca tanımlı mahallelere hizmet verir. Minimum sepet tutarı belirlenmemiş mahallelere teslimat yapılmaz.
                    Müşteriler adres seçerken yalnızca hizmet verilen mahalleleri görürler.
                  </p>
                </div>
              </div>

              {filteredBolgeler.length === 0 ? (
                <EmptyState
                  icon="🚚"
                  title="Hizmet Bölgesi Bulunamadı"
                  message="Restoranlar için hizmet bölgesi tanımlayın"
                  action={<button onClick={handleAddBolge} style={styles.emptyButton}>+ Hizmet Bölgesi Ekle</button>}
                />
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Restoran</th>
                        <th style={styles.th}>Mahalle</th>
                        <th style={styles.th}>İlçe / Şehir</th>
                        <th style={styles.th}>Min. Sepet</th>
                        <th style={styles.th}>Teslimat Ücreti</th>
                        <th style={styles.th}>Süre</th>
                        <th style={styles.th}>Durum</th>
                        <th style={styles.th}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBolgeler.map(bolge => (
                        <tr key={bolge.id} style={{
                          ...styles.tr,
                          opacity: bolge.aktif ? 1 : 0.6,
                        }}>
                          <td style={styles.td}>
                            <div style={styles.cellWithIcon}>
                              <span>🏪</span>
                              <strong>{bolge.restoran?.ad}</strong>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.mahalleBadge}>
                              📍 {bolge.mahalle?.ad}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.locationText}>
                              {bolge.mahalle?.ilce?.ad}, {bolge.mahalle?.ilce?.sehir?.ad}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.priceValue}>₺{bolge.min_sepet_tutari}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.priceValue}>₺{bolge.teslimat_ucreti}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.timeBadge}>{bolge.teslimat_suresi} dk</span>
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: bolge.aktif ? '#dcfce7' : '#fee2e2',
                              color: bolge.aktif ? '#16a34a' : '#dc2626',
                            }}>
                              {bolge.aktif ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.tableActions}>
                              <button
                                onClick={() => handleEditBolge(bolge)}
                                style={{ ...styles.smallBtn, backgroundColor: '#eff6ff' }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteClick('bolge', bolge)}
                                style={{ ...styles.smallBtn, backgroundColor: '#fef2f2' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ==================== ŞEHİR MODAL ==================== */}
      <Modal
        isOpen={showSehirModal}
        onClose={() => setShowSehirModal(false)}
        title={editingItem ? 'Şehir Düzenle' : 'Yeni Şehir'}
        size="small"
      >
        <div style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Şehir Adı *</label>
            <input
              type="text"
              value={sehirForm.ad}
              onChange={(e) => setSehirForm({ ...sehirForm, ad: e.target.value })}
              placeholder="Örn: İstanbul"
              style={styles.input}
              autoFocus
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Plaka Kodu</label>
            <input
              type="text"
              value={sehirForm.plaka_kodu}
              onChange={(e) => setSehirForm({ ...sehirForm, plaka_kodu: e.target.value })}
              placeholder="Örn: 34"
              style={styles.input}
              maxLength={2}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={sehirForm.aktif}
                onChange={(e) => setSehirForm({ ...sehirForm, aktif: e.target.checked })}
                style={styles.checkbox}
              />
              <span>Aktif</span>
            </label>
          </div>
          <div style={styles.formActions}>
            <button onClick={() => setShowSehirModal(false)} style={styles.cancelButton}>
              İptal
            </button>
            <button onClick={handleSaveSehir} disabled={actionLoading} style={styles.submitButton}>
              {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== İLÇE MODAL ==================== */}
      <Modal
        isOpen={showIlceModal}
        onClose={() => setShowIlceModal(false)}
        title={editingItem ? 'İlçe Düzenle' : 'Yeni İlçe'}
        size="small"
      >
        <div style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Şehir *</label>
            <select
              value={ilceForm.sehir_id}
              onChange={(e) => setIlceForm({ ...ilceForm, sehir_id: e.target.value })}
              style={styles.select}
            >
              <option value="">Şehir seçin...</option>
              {sehirler.filter(s => s.aktif).map(s => (
                <option key={s.id} value={s.id}>{s.ad}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>İlçe Adı *</label>
            <input
              type="text"
              value={ilceForm.ad}
              onChange={(e) => setIlceForm({ ...ilceForm, ad: e.target.value })}
              placeholder="Örn: Kadıköy"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={ilceForm.aktif}
                onChange={(e) => setIlceForm({ ...ilceForm, aktif: e.target.checked })}
                style={styles.checkbox}
              />
              <span>Aktif</span>
            </label>
          </div>
          <div style={styles.formActions}>
            <button onClick={() => setShowIlceModal(false)} style={styles.cancelButton}>
              İptal
            </button>
            <button onClick={handleSaveIlce} disabled={actionLoading} style={styles.submitButton}>
              {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== MAHALLE MODAL ==================== */}
      <Modal
        isOpen={showMahalleModal}
        onClose={() => setShowMahalleModal(false)}
        title={editingItem ? 'Mahalle Düzenle' : 'Yeni Mahalle'}
        size="small"
      >
        <div style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>İlçe *</label>
            <select
              value={mahalleForm.ilce_id}
              onChange={(e) => setMahalleForm({ ...mahalleForm, ilce_id: e.target.value })}
              style={styles.select}
            >
              <option value="">İlçe seçin...</option>
              {ilceler.filter(i => i.aktif).map(i => (
                <option key={i.id} value={i.id}>
                  {i.ad} ({i.sehir?.ad})
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Mahalle Adı *</label>
            <input
              type="text"
              value={mahalleForm.ad}
              onChange={(e) => setMahalleForm({ ...mahalleForm, ad: e.target.value })}
              placeholder="Örn: Caferağa"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Posta Kodu</label>
            <input
              type="text"
              value={mahalleForm.posta_kodu}
              onChange={(e) => setMahalleForm({ ...mahalleForm, posta_kodu: e.target.value })}
              placeholder="Örn: 34710"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={mahalleForm.aktif}
                onChange={(e) => setMahalleForm({ ...mahalleForm, aktif: e.target.checked })}
                style={styles.checkbox}
              />
              <span>Aktif</span>
            </label>
          </div>
          <div style={styles.formActions}>
            <button onClick={() => setShowMahalleModal(false)} style={styles.cancelButton}>
              İptal
            </button>
            <button onClick={handleSaveMahalle} disabled={actionLoading} style={styles.submitButton}>
              {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== HİZMET BÖLGESİ MODAL ==================== */}
      <Modal
        isOpen={showBolgeModal}
        onClose={() => setShowBolgeModal(false)}
        title={editingItem ? 'Hizmet Bölgesi Düzenle' : 'Yeni Hizmet Bölgesi'}
        size="medium"
      >
        <div style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Restoran *</label>
            <select
              value={bolgeForm.restoran_id}
              onChange={(e) => setBolgeForm({ ...bolgeForm, restoran_id: e.target.value })}
              style={styles.select}
            >
              <option value="">Restoran seçin...</option>
              {restoranlar.map(r => (
                <option key={r.id} value={r.id}>{r.ad}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Mahalle *</label>
            <select
              value={bolgeForm.mahalle_id}
              onChange={(e) => setBolgeForm({ ...bolgeForm, mahalle_id: e.target.value })}
              style={styles.select}
            >
              <option value="">Mahalle seçin...</option>
              {mahalleler.filter(m => m.aktif).map(m => (
                <option key={m.id} value={m.id}>
                  {m.ad} - {m.ilce?.ad}, {m.ilce?.sehir?.ad}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Min. Sepet Tutarı (₺) *</label>
              <input
                type="number"
                value={bolgeForm.min_sepet_tutari}
                onChange={(e) => setBolgeForm({ ...bolgeForm, min_sepet_tutari: e.target.value })}
                style={styles.input}
                min="0"
                step="5"
              />
              <small style={styles.helpText}>0 ise minimum yok</small>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Teslimat Ücreti (₺)</label>
              <input
                type="number"
                value={bolgeForm.teslimat_ucreti}
                onChange={(e) => setBolgeForm({ ...bolgeForm, teslimat_ucreti: e.target.value })}
                style={styles.input}
                min="0"
                step="1"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Tahmini Teslimat Süresi (dakika)</label>
            <input
              type="number"
              value={bolgeForm.teslimat_suresi}
              onChange={(e) => setBolgeForm({ ...bolgeForm, teslimat_suresi: e.target.value })}
              style={styles.input}
              min="10"
              step="5"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={bolgeForm.aktif}
                onChange={(e) => setBolgeForm({ ...bolgeForm, aktif: e.target.checked })}
                style={styles.checkbox}
              />
              <span>Bu bölgeye hizmet ver</span>
            </label>
          </div>

          <div style={styles.formActions}>
            <button onClick={() => setShowBolgeModal(false)} style={styles.cancelButton}>
              İptal
            </button>
            <button onClick={handleSaveBolge} disabled={actionLoading} style={styles.submitButton}>
              {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== SİLME MODAL ==================== */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Silme Onayı"
        size="small"
      >
        <div style={styles.deleteContent}>
          <div style={styles.deleteIcon}>🗑️</div>
          <h3 style={styles.deleteTitle}>Emin misiniz?</h3>
          <p style={styles.deleteText}>
            Bu {deleteTarget.type === 'sehir' ? 'şehir' : 
                deleteTarget.type === 'ilce' ? 'ilçe' : 
                deleteTarget.type === 'mahalle' ? 'mahalle' : 'hizmet bölgesi'} silinecek.
            {(deleteTarget.type === 'sehir' || deleteTarget.type === 'ilce') && (
              <strong style={{ display: 'block', marginTop: '8px', color: '#ef4444' }}>
                ⚠️ Alt kayıtlar da silinecektir!
              </strong>
            )}
          </p>
          <div style={styles.deleteActions}>
            <button onClick={() => setShowDeleteModal(false)} style={styles.cancelButton}>
              Vazgeç
            </button>
            <button onClick={handleDelete} disabled={actionLoading} style={styles.deleteButton}>
              {actionLoading ? 'Siliniyor...' : 'Evet, Sil'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ==================== STYLES ====================
const styles = {
  container: { padding: 0 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: { fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  statLabel: { fontSize: '13px', color: '#64748b', margin: 0 },
  statValue: { fontSize: '28px', fontWeight: '700', color: '#3b82f6', margin: 0 },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    backgroundColor: 'white',
    padding: '6px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflowX: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  tabCount: {
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'inherit',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  contentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  contentTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '10px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    minWidth: '180px',
    backgroundColor: 'white',
  },
  searchInput: {
    padding: '10px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    minWidth: '200px',
  },
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: '14px',
    padding: '20px',
    border: '2px solid #e2e8f0',
    transition: 'all 0.2s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '16px',
  },
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px',
  },
  cardBadge: {
    display: 'inline-block',
    marginTop: '4px',
    padding: '2px 8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '16px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#1e293b',
  },
  cellWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  tableActions: {
    display: 'flex',
    gap: '8px',
  },
  smallBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  mahalleBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
  },
  locationText: {
    fontSize: '13px',
    color: '#64748b',
  },
  priceValue: {
    fontWeight: '600',
    color: '#059669',
  },
  timeBadge: {
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  infoBox: {
    display: 'flex',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid #bfdbfe',
  },
  infoIcon: { fontSize: '24px' },
  infoText: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  emptyButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'white',
  },
  helpText: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteContent: { textAlign: 'center', padding: '20px 0' },
  deleteIcon: { fontSize: '48px', marginBottom: '16px' },
  deleteTitle: { fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px 0' },
  deleteText: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0', lineHeight: '1.5' },
  deleteActions: { display: 'flex', justifyContent: 'center', gap: '12px' },
  deleteButton: {
    padding: '12px 24px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default BolgeYonetimi;