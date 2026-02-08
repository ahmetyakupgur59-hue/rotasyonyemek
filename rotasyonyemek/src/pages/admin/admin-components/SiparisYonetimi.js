// src/pages/admin/admin-components/SiparisYonetimi.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../services/supabase';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';
import StatusBadge from './common/StatusBadge';
import Modal from './common/Modal';
import Pagination from './common/Pagination';
import ExportButton from './common/ExportButton';
import { useToast } from './common/Toast';

// Yerel StatsCard
const StatsCard = ({ title, value, icon, color }) => {
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid #e5e7eb',
  };
  const iconContainerStyle = {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    backgroundColor: color ? `${color}20` : '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  };
  return (
    <div style={cardStyle}>
      <div style={iconContainerStyle}>{icon}</div>
      <div>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{title}</p>
        <p style={{ fontSize: '24px', fontWeight: '700', color: color || '#1f2937', margin: 0 }}>{value}</p>
      </div>
    </div>
  );
};

const SiparisYonetimi = () => {
  // ==================== STATE ====================
  const [siparisler, setSiparisler] = useState([]);
  const [restoranlar, setRestoranlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('hepsi');
  const [restoranFiltre, setRestoranFiltre] = useState('hepsi');
  const [tarihBaslangic, setTarihBaslangic] = useState('');
  const [tarihBitis, setTarihBitis] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  const [detayModal, setDetayModal] = useState(false);
  const [durumModal, setDurumModal] = useState(false);
  const [iptalModal, setIptalModal] = useState(false);
  const [selectedSiparis, setSelectedSiparis] = useState(null);
  
  const [yeniDurum, setYeniDurum] = useState('');
  const [iptalNedeni, setIptalNedeni] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  const [stats, setStats] = useState({
    toplam: 0,
    bugun: 0,
    beklemede: 0,
    hazirlaniyor: 0,
    yolda: 0,
    tamamlanan: 0,
    iptal: 0,
    toplamCiro: 0,
    bugunkuCiro: 0
  });

  // Toast ref - sonsuz döngüyü önler
  const toast = useToast();
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // ==================== SABİTLER ====================
  const durumlar = [
    { value: 'beklemede', label: 'Beklemede', color: '#f59e0b', icon: '⏳' },
    { value: 'onaylandi', label: 'Onaylandı', color: '#3b82f6', icon: '✅' },
    { value: 'hazirlaniyor', label: 'Hazırlanıyor', color: '#f97316', icon: '👨‍🍳' },
    { value: 'yolda', label: 'Yolda', color: '#8b5cf6', icon: '🚗' },
    { value: 'teslim_edildi', label: 'Teslim Edildi', color: '#22c55e', icon: '✔️' },
    { value: 'iptal', label: 'İptal', color: '#ef4444', icon: '❌' }
  ];

  const durumGecisleri = {
    'beklemede': ['onaylandi', 'iptal'],
    'onaylandi': ['hazirlaniyor', 'iptal'],
    'hazirlaniyor': ['yolda', 'iptal'],
    'yolda': ['teslim_edildi', 'iptal'],
    'teslim_edildi': [],
    'iptal': []
  };

  const iptalNedenleri = [
    'Müşteri iptal talebi',
    'Restoran tarafından iptal',
    'Ödeme problemi',
    'Teslimat yapılamadı',
    'Stok yetersizliği',
    'Diğer'
  ];

  // ==================== VERİ ÇEKME ====================
  
  const fetchSiparisler = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('siparisler')
        .select(`
          *,
          kullanici:kullanicilar(id, ad, email, telefon),
          restoran:restoranlar(id, ad, telefon)
        `, { count: 'exact' });

      if (durumFiltre !== 'hepsi') {
        query = query.eq('durum', durumFiltre);
      }
      if (restoranFiltre !== 'hepsi') {
        query = query.eq('restoran_id', restoranFiltre);
      }
      if (tarihBaslangic) {
        query = query.gte('created_at', tarihBaslangic);
      }
      if (tarihBitis) {
        query = query.lte('created_at', tarihBitis + 'T23:59:59');
      }
      if (searchTerm) {
        query = query.or(`id.ilike.%${searchTerm}%,adres.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) {
        console.error('Sipariş sorgu hatası:', queryError);
        setError('Siparişler yüklenirken bir hata oluştu: ' + queryError.message);
        return;
      }

      setSiparisler(data || []);
      setTotalCount(count || 0);

    } catch (err) {
      console.error('Beklenmeyen hata:', err);
      setError('Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, durumFiltre, restoranFiltre, tarihBaslangic, tarihBitis, searchTerm]);
  // ⚠️ toast YOK dependency'de

  const fetchRestoranlar = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('restoranlar')
        .select('id, ad')
        .eq('aktif', true)
        .order('ad');

      if (error) {
        console.error('Restoran hatası:', error);
        return;
      }
      setRestoranlar(data || []);
    } catch (err) {
      console.error('Restoran fetch hatası:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const bugun = new Date().toISOString().split('T')[0];

      const { data: allOrders, error } = await supabase
        .from('siparisler')
        .select('durum, toplam_tutar, created_at');

      if (error) {
        console.error('Stats hatası:', error);
        return;
      }

      const bugunkuSiparisler = (allOrders || []).filter(s => 
        s.created_at?.startsWith(bugun)
      );

      setStats({
        toplam: allOrders?.length || 0,
        bugun: bugunkuSiparisler.length,
        beklemede: allOrders?.filter(s => s.durum === 'beklemede').length || 0,
        hazirlaniyor: allOrders?.filter(s => s.durum === 'hazirlaniyor').length || 0,
        yolda: allOrders?.filter(s => s.durum === 'yolda').length || 0,
        tamamlanan: allOrders?.filter(s => s.durum === 'teslim_edildi').length || 0,
        iptal: allOrders?.filter(s => s.durum === 'iptal').length || 0,
        toplamCiro: allOrders
          ?.filter(s => s.durum === 'teslim_edildi')
          .reduce((sum, s) => sum + (parseFloat(s.toplam_tutar) || 0), 0) || 0,
        bugunkuCiro: bugunkuSiparisler
          .filter(s => s.durum === 'teslim_edildi')
          .reduce((sum, s) => sum + (parseFloat(s.toplam_tutar) || 0), 0)
      });

    } catch (err) {
      console.error('Stats fetch hatası:', err);
    }
  }, []);

  // ==================== EFFECTS ====================
  
  useEffect(() => {
    fetchRestoranlar();
    fetchStats();
  }, [fetchRestoranlar, fetchStats]);

  useEffect(() => {
    fetchSiparisler();
  }, [fetchSiparisler]);

  useEffect(() => {
    setCurrentPage(1);
  }, [durumFiltre, restoranFiltre, tarihBaslangic, tarihBitis, searchTerm]);

  // ==================== HANDLERS ====================
  
  const handleViewDetail = (siparis) => {
    setSelectedSiparis(siparis);
    setDetayModal(true);
  };

  const handleOpenDurumModal = (siparis) => {
    setSelectedSiparis(siparis);
    setYeniDurum('');
    setDurumModal(true);
  };

  const handleDurumGuncelle = async () => {
    if (!selectedSiparis || !yeniDurum) return;

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('siparisler')
        .update({ durum: yeniDurum })
        .eq('id', selectedSiparis.id);

      if (error) {
        toastRef.current.error('Durum güncellenirken hata oluştu');
        return;
      }

      setSiparisler(prev => 
        prev.map(s => 
          s.id === selectedSiparis.id 
            ? { ...s, durum: yeniDurum }
            : s
        )
      );

      setDurumModal(false);
      setSelectedSiparis(null);
      setYeniDurum('');
      fetchStats();
      toastRef.current.success('Sipariş durumu güncellendi!');

    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
      toastRef.current.error('Beklenmeyen bir hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenIptalModal = (siparis) => {
    setSelectedSiparis(siparis);
    setIptalNedeni('');
    setIptalModal(true);
  };

  const handleIptalEt = async () => {
    if (!selectedSiparis || !iptalNedeni) return;

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('siparisler')
        .update({ 
          durum: 'iptal',
          iptal_nedeni: iptalNedeni
        })
        .eq('id', selectedSiparis.id);

      if (error) {
        toastRef.current.error('Sipariş iptal edilirken hata oluştu');
        return;
      }

      setSiparisler(prev => 
        prev.map(s => 
          s.id === selectedSiparis.id 
            ? { ...s, durum: 'iptal', iptal_nedeni: iptalNedeni }
            : s
        )
      );

      setIptalModal(false);
      setSelectedSiparis(null);
      setIptalNedeni('');
      fetchStats();
      toastRef.current.success('Sipariş iptal edildi!');

    } catch (err) {
      console.error('İptal hatası:', err);
      toastRef.current.error('Beklenmeyen bir hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedOrders([]);
    } else {
      const selectableOrders = siparisler
        .filter(s => s.durum !== 'teslim_edildi' && s.durum !== 'iptal')
        .map(s => s.id);
      setSelectedOrders(selectableOrders);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedOrders.length === 0) return;

    if (!window.confirm(`${selectedOrders.length} sipariş "${newStatus}" durumuna güncellenecek. Emin misiniz?`)) {
      return;
    }

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('siparisler')
        .update({ durum: newStatus })
        .in('id', selectedOrders);

      if (error) {
        toastRef.current.error('Toplu güncelleme başarısız');
        return;
      }

      setSelectedOrders([]);
      setSelectAll(false);
      fetchSiparisler();
      fetchStats();
      toastRef.current.success(`${selectedOrders.length} sipariş güncellendi!`);

    } catch (err) {
      console.error('Toplu güncelleme hatası:', err);
      toastRef.current.error('Beklenmeyen bir hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDurumFiltre('hepsi');
    setRestoranFiltre('hepsi');
    setTarihBaslangic('');
    setTarihBitis('');
    setCurrentPage(1);
  };

  const prepareExportData = () => {
    return siparisler.map(s => ({
      'Sipariş ID': s.id?.slice(0, 8) || '-',
      'Tarih': s.created_at ? new Date(s.created_at).toLocaleString('tr-TR') : '-',
      'Müşteri': s.kullanici?.ad || '-',
      'Telefon': s.kullanici?.telefon || '-',
      'Restoran': s.restoran?.ad || '-',
      'Tutar': `₺${parseFloat(s.toplam_tutar || 0).toFixed(2)}`,
      'Durum': durumlar.find(d => d.value === s.durum)?.label || s.durum,
      'Adres': s.adres || '-',
      'Ödeme': s.odeme_yontemi || '-'
    }));
  };

  // ==================== YARDIMCI FONKSİYONLAR ====================
  
  const formatTarih = (tarih) => {
    if (!tarih) return '-';
    return new Date(tarih).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTutar = (tutar) => {
    return `₺${parseFloat(tutar || 0).toFixed(2)}`;
  };

  const getDurumInfo = (durum) => {
    return durumlar.find(d => d.value === durum) || durumlar[0];
  };

  const getAvailableTransitions = (currentDurum) => {
    return durumGecisleri[currentDurum] || [];
  };

  // ==================== RENDER ====================
  
  return (
    <div style={styles.container}>
      {/* Başlık */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📦 Sipariş Yönetimi</h1>
          <p style={styles.subtitle}>
            Tüm siparişleri görüntüleyin ve yönetin
          </p>
        </div>
        <div style={styles.headerActions}>
          <ExportButton 
            data={prepareExportData()} 
            filename="siparisler"
          />
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div style={styles.statsGrid}>
        <StatsCard title="Toplam Sipariş" value={stats.toplam} icon="📦" color="blue" />
        <StatsCard title="Bugün" value={stats.bugun} icon="📅" color="green" />
        <StatsCard title="Beklemede" value={stats.beklemede} icon="⏳" color="orange" />
        <StatsCard title="Hazırlanıyor" value={stats.hazirlaniyor} icon="👨‍🍳" color="orange" />
        <StatsCard title="Yolda" value={stats.yolda} icon="🚗" color="purple" />
        <StatsCard title="Tamamlanan" value={stats.tamamlanan} icon="✅" color="green" />
        <StatsCard title="Toplam Ciro" value={formatTutar(stats.toplamCiro)} icon="💰" color="green" />
        <StatsCard title="Bugünkü Ciro" value={formatTutar(stats.bugunkuCiro)} icon="💵" color="cyan" />
      </div>

      {/* Filtreler */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Ara</label>
            <input
              type="text"
              placeholder="Sipariş ID veya adres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Durum</label>
            <select
              value={durumFiltre}
              onChange={(e) => setDurumFiltre(e.target.value)}
              style={styles.select}
            >
              <option value="hepsi">Tüm Durumlar</option>
              {durumlar.map(d => (
                <option key={d.value} value={d.value}>
                  {d.icon} {d.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Restoran</label>
            <select
              value={restoranFiltre}
              onChange={(e) => setRestoranFiltre(e.target.value)}
              style={styles.select}
            >
              <option value="hepsi">Tüm Restoranlar</option>
              {restoranlar.map(r => (
                <option key={r.id} value={r.id}>{r.ad}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Başlangıç</label>
            <input
              type="date"
              value={tarihBaslangic}
              onChange={(e) => setTarihBaslangic(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Bitiş</label>
            <input
              type="date"
              value={tarihBitis}
              onChange={(e) => setTarihBitis(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>&nbsp;</label>
            <button onClick={handleClearFilters} style={styles.clearButton}>
              🗑️ Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Toplu İşlemler */}
      {selectedOrders.length > 0 && (
        <div style={styles.bulkActions}>
          <span style={styles.selectedCount}>
            {selectedOrders.length} sipariş seçildi
          </span>
          <div style={styles.bulkButtons}>
            <button
              onClick={() => handleBulkStatusUpdate('onaylandi')}
              style={{ ...styles.bulkButton, backgroundColor: '#3b82f6' }}
              disabled={actionLoading}
            >
              ✅ Onayla
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('hazirlaniyor')}
              style={{ ...styles.bulkButton, backgroundColor: '#f97316' }}
              disabled={actionLoading}
            >
              👨‍🍳 Hazırlanıyor
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('yolda')}
              style={{ ...styles.bulkButton, backgroundColor: '#8b5cf6' }}
              disabled={actionLoading}
            >
              🚗 Yolda
            </button>
          </div>
        </div>
      )}

      {/* Hata Mesajı */}
      {error && (
        <div style={styles.errorBox}>
          {error}
          <button onClick={fetchSiparisler} style={styles.retryButton}>
            Tekrar Dene
          </button>
        </div>
      )}

      {/* İçerik */}
      {loading ? (
        <LoadingSpinner text="Siparişler yükleniyor..." />
      ) : siparisler.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Sipariş Bulunamadı"
          message="Arama kriterlerinize uygun sipariş bulunmuyor."
        />
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      style={styles.checkbox}
                    />
                  </th>
                  <th style={styles.th}>Sipariş ID</th>
                  <th style={styles.th}>Tarih</th>
                  <th style={styles.th}>Müşteri</th>
                  <th style={styles.th}>Restoran</th>
                  <th style={styles.th}>Tutar</th>
                  <th style={styles.th}>Durum</th>
                  <th style={styles.th}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {siparisler.map((siparis) => {
                  const isSelectable = siparis.durum !== 'teslim_edildi' && siparis.durum !== 'iptal';
                  
                  return (
                    <tr key={siparis.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        {isSelectable && (
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(siparis.id)}
                            onChange={() => handleSelectOrder(siparis.id)}
                            style={styles.checkbox}
                          />
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.orderId}>
                          #{siparis.id?.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>{formatTarih(siparis.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.customerCell}>
                          <strong>{siparis.kullanici?.ad || 'Bilinmiyor'}</strong>
                          <small style={styles.smallText}>
                            {siparis.kullanici?.telefon || '-'}
                          </small>
                        </div>
                      </td>
                      <td style={styles.td}>{siparis.restoran?.ad || 'Bilinmiyor'}</td>
                      <td style={styles.td}>
                        <strong style={styles.amount}>{formatTutar(siparis.toplam_tutar)}</strong>
                      </td>
                      <td style={styles.td}>
                        <StatusBadge status={siparis.durum} type="order" />
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => handleViewDetail(siparis)}
                            style={styles.actionButton}
                            title="Detay"
                          >
                            👁️
                          </button>
                          {getAvailableTransitions(siparis.durum).length > 0 && (
                            <button
                              onClick={() => handleOpenDurumModal(siparis)}
                              style={{ ...styles.actionButton, ...styles.editButton }}
                              title="Durum Güncelle"
                            >
                              🔄
                            </button>
                          )}
                          {siparis.durum !== 'teslim_edildi' && siparis.durum !== 'iptal' && (
                            <button
                              onClick={() => handleOpenIptalModal(siparis)}
                              style={{ ...styles.actionButton, ...styles.deleteButton }}
                              title="İptal Et"
                            >
                              ❌
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / itemsPerPage)}
            onPageChange={setCurrentPage}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
          />
        </>
      )}

      {/* Detay Modal - Basitleştirilmiş */}
      <Modal
        isOpen={detayModal}
        onClose={() => setDetayModal(false)}
        title={`Sipariş #${selectedSiparis?.id?.slice(0, 8).toUpperCase() || ''}`}
        size="large"
      >
        {selectedSiparis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
              <p><strong>Müşteri:</strong> {selectedSiparis.kullanici?.ad}</p>
              <p><strong>Telefon:</strong> {selectedSiparis.kullanici?.telefon}</p>
              <p><strong>Restoran:</strong> {selectedSiparis.restoran?.ad}</p>
              <p><strong>Tutar:</strong> {formatTutar(selectedSiparis.toplam_tutar)}</p>
              <p><strong>Adres:</strong> {selectedSiparis.adres}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Durum Modal */}
      <Modal
        isOpen={durumModal}
        onClose={() => setDurumModal(false)}
        title="Sipariş Durumu Güncelle"
        size="small"
      >
        {selectedSiparis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p>Mevcut: <StatusBadge status={selectedSiparis.durum} type="order" /></p>
            <select
              value={yeniDurum}
              onChange={(e) => setYeniDurum(e.target.value)}
              style={styles.select}
            >
              <option value="">Yeni durum seçin...</option>
              {getAvailableTransitions(selectedSiparis.durum).map(durum => (
                <option key={durum} value={durum}>
                  {getDurumInfo(durum).icon} {getDurumInfo(durum).label}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDurumModal(false)} style={styles.cancelBtn}>İptal</button>
              <button 
                onClick={handleDurumGuncelle} 
                disabled={!yeniDurum || actionLoading}
                style={styles.submitBtn}
              >
                {actionLoading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* İptal Modal */}
      <Modal
        isOpen={iptalModal}
        onClose={() => setIptalModal(false)}
        title="Siparişi İptal Et"
        size="small"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
            ⚠️ Bu işlem geri alınamaz!
          </div>
          <select
            value={iptalNedeni}
            onChange={(e) => setIptalNedeni(e.target.value)}
            style={styles.select}
          >
            <option value="">İptal nedeni seçin...</option>
            {iptalNedenleri.map(neden => (
              <option key={neden} value={neden}>{neden}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setIptalModal(false)} style={styles.cancelBtn}>Vazgeç</button>
            <button 
              onClick={handleIptalEt} 
              disabled={!iptalNedeni || actionLoading}
              style={{ ...styles.submitBtn, backgroundColor: '#ef4444' }}
            >
              {actionLoading ? 'İptal Ediliyor...' : 'İptal Et'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ==================== STYLES ====================
const styles = {
  container: { padding: '0' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: { fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: 0 },
  subtitle: { color: '#6b7280', fontSize: '14px', margin: '4px 0 0 0' },
  headerActions: { display: 'flex', gap: '12px' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  filtersCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
  },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  filterLabel: { fontSize: '13px', fontWeight: '500', color: '#374151' },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'white',
  },
  clearButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    fontSize: '14px',
    cursor: 'pointer',
  },
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
    border: '1px solid #bfdbfe',
  },
  selectedCount: { fontSize: '14px', fontWeight: '600', color: '#1d4ed8' },
  bulkButtons: { display: 'flex', gap: '8px' },
  bulkButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    color: 'white',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#f9fafb' },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
  },
  tableRow: { borderBottom: '1px solid #e5e7eb' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#374151' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  orderId: {
    fontFamily: 'monospace',
    fontWeight: '600',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
  },
  customerCell: { display: 'flex', flexDirection: 'column', gap: '2px' },
  smallText: { fontSize: '12px', color: '#9ca3af' },
  amount: { color: '#059669', fontWeight: '600' },
  actions: { display: 'flex', gap: '8px' },
  actionButton: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '16px',
  },
  editButton: { borderColor: '#3b82f6' },
  deleteButton: { borderColor: '#ef4444' },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
  },
};

export default SiparisYonetimi;