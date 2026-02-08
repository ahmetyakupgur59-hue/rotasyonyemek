import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../services/supabase';
import LoadingSpinner from './common/LoadingSpinner';
import Modal from './common/Modal';
import { useToast } from './common/Toast';

const FinansYonetimi = () => {
  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ozet'); // ozet, hakedisler, odemeler
  const [dateRange, setDateRange] = useState('buAy'); // bugun, buHafta, buAy, tumZamanlar
  
  // Data
  const [finansOzet, setFinansOzet] = useState({
    toplamSatis: 0,
    toplamKomisyon: 0,
    bekleyenHakedis: 0,
    odenenHakedis: 0,
    restoranSayisi: 0,
    siparisSayisi: 0
  });
  const [hakedisler, setHakedisler] = useState([]);
  const [restoranOzetleri, setRestoranOzetleri] = useState([]);
  
  // Modal
  const [showHakedisModal, setShowHakedisModal] = useState(false);
  const [selectedRestoran, setSelectedRestoran] = useState(null);
  const [hakedisForm, setHakedisForm] = useState({
    tutar: 0,
    aciklama: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  const toast = useToast();
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Tarih aralığı hesapla
  const getDateRange = () => {
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case 'bugun':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'buHafta':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.setDate(now.getDate() - dayOfWeek));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'buAy':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = null;
    }
    
    return startDate ? startDate.toISOString() : null;
  };

  // ==================== VERİ ÇEKME ====================
  const fetchFinansData = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = getDateRange();

      // Siparişler
      let siparisQuery = supabase
        .from('siparisler')
        .select('*')
        .eq('durum', 'teslim_edildi');

      if (startDate) {
        siparisQuery = siparisQuery.gte('created_at', startDate);
      }

      const { data: siparisler, error: siparisError } = await siparisQuery;
      if (siparisError) throw siparisError;

      // Restoranlar
      const { data: restoranlar, error: restoranError } = await supabase
        .from('restoranlar')
        .select('id, ad, komisyon_orani, aktif')
        .eq('aktif', true);

      if (restoranError) throw restoranError;

      // Hakedişler
      const { data: hakedisData, error: hakedisError } = await supabase
        .from('hakedisler')
        .select(`
          *,
          restoran:restoranlar(id, ad)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (hakedisError) throw hakedisError;
      setHakedisler(hakedisData || []);

      // Hesaplamalar
      const toplamSatis = siparisler?.reduce((sum, s) => sum + (parseFloat(s.toplam_tutar) || 0), 0) || 0;
      const toplamKomisyon = siparisler?.reduce((sum, s) => sum + (parseFloat(s.komisyon_tutari) || 0), 0) || 0;
      
      const odenenHakedis = hakedisData?.filter(h => h.durum === 'odendi')
        .reduce((sum, h) => sum + (parseFloat(h.tutar) || 0), 0) || 0;
      
      const bekleyenHakedis = toplamSatis - toplamKomisyon - odenenHakedis;

      setFinansOzet({
        toplamSatis,
        toplamKomisyon,
        bekleyenHakedis: Math.max(0, bekleyenHakedis),
        odenenHakedis,
        restoranSayisi: restoranlar?.length || 0,
        siparisSayisi: siparisler?.length || 0
      });

      // Restoran bazlı özet
      const restoranMap = {};
      siparisler?.forEach(siparis => {
        const rid = siparis.restoran_id;
        if (!restoranMap[rid]) {
          restoranMap[rid] = {
            id: rid,
            ad: 'Bilinmeyen',
            toplamSatis: 0,
            komisyon: 0,
            siparisSayisi: 0
          };
        }
        restoranMap[rid].toplamSatis += parseFloat(siparis.toplam_tutar) || 0;
        restoranMap[rid].komisyon += parseFloat(siparis.komisyon_tutari) || 0;
        restoranMap[rid].siparisSayisi += 1;
      });

      // Restoran isimlerini ekle
      restoranlar?.forEach(r => {
        if (restoranMap[r.id]) {
          restoranMap[r.id].ad = r.ad;
          restoranMap[r.id].komisyonOrani = r.komisyon_orani;
        }
      });

      setRestoranOzetleri(Object.values(restoranMap).sort((a, b) => b.toplamSatis - a.toplamSatis));

    } catch (err) {
      console.error('Finans verileri yüklenirken hata:', err);
      toastRef.current.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => {
    fetchFinansData();
  }, [fetchFinansData]);

  // ==================== HANDLERS ====================
  
  const handleOpenHakedisModal = (restoran) => {
    setSelectedRestoran(restoran);
    setHakedisForm({
      tutar: restoran.toplamSatis - restoran.komisyon,
      aciklama: ''
    });
    setShowHakedisModal(true);
  };

  const handleCreateHakedis = async () => {
    if (!selectedRestoran || hakedisForm.tutar <= 0) {
      toastRef.current.warning('Geçerli bir tutar girin');
      return;
    }

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('hakedisler')
        .insert([{
          restoran_id: selectedRestoran.id,
          tutar: parseFloat(hakedisForm.tutar),
          aciklama: hakedisForm.aciklama || `${new Date().toLocaleDateString('tr-TR')} hakediş ödemesi`,
          durum: 'beklemede',
          donem_baslangic: getDateRange(),
          donem_bitis: new Date().toISOString()
        }]);

      if (error) throw error;

      toastRef.current.success('Hakediş kaydı oluşturuldu');
      setShowHakedisModal(false);
      fetchFinansData();
    } catch (err) {
      console.error('Hakediş oluşturulurken hata:', err);
      toastRef.current.error('Hakediş oluşturulurken bir hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateHakedisDurum = async (hakedisId, yeniDurum) => {
    try {
      const { error } = await supabase
        .from('hakedisler')
        .update({ 
          durum: yeniDurum,
          odeme_tarihi: yeniDurum === 'odendi' ? new Date().toISOString() : null
        })
        .eq('id', hakedisId);

      if (error) throw error;

      toastRef.current.success(yeniDurum === 'odendi' ? 'Hakediş ödendi olarak işaretlendi' : 'Durum güncellendi');
      fetchFinansData();
    } catch (err) {
      console.error('Hakediş güncellenirken hata:', err);
      toastRef.current.error('Güncelleme sırasında bir hata oluştu');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  // ==================== RENDER ====================
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Finans & Hakediş</h2>
          <p style={styles.subtitle}>Finansal özet ve hakediş yönetimi</p>
        </div>
        
        {/* Tarih Filtresi */}
        <div style={styles.dateFilter}>
          {[
            { value: 'bugun', label: 'Bugün' },
            { value: 'buHafta', label: 'Bu Hafta' },
            { value: 'buAy', label: 'Bu Ay' },
            { value: 'tumZamanlar', label: 'Tüm Zamanlar' },
          ].map(item => (
            <button
              key={item.value}
              onClick={() => setDateRange(item.value)}
              style={{
                ...styles.dateBtn,
                ...(dateRange === item.value && styles.dateBtnActive),
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Finansal veriler yükleniyor..." />
      ) : (
        <>
          {/* Özet Kartları */}
          <div style={styles.summaryGrid}>
            <div style={{ ...styles.summaryCard, borderLeftColor: '#22c55e' }}>
              <div style={styles.summaryIcon}>💰</div>
              <div style={styles.summaryContent}>
                <p style={styles.summaryLabel}>Toplam Satış</p>
                <h3 style={{ ...styles.summaryValue, color: '#22c55e' }}>
                  {formatCurrency(finansOzet.toplamSatis)}
                </h3>
                <p style={styles.summaryMeta}>{finansOzet.siparisSayisi} sipariş</p>
              </div>
            </div>

            <div style={{ ...styles.summaryCard, borderLeftColor: '#3b82f6' }}>
              <div style={styles.summaryIcon}>📊</div>
              <div style={styles.summaryContent}>
                <p style={styles.summaryLabel}>Toplam Komisyon</p>
                <h3 style={{ ...styles.summaryValue, color: '#3b82f6' }}>
                  {formatCurrency(finansOzet.toplamKomisyon)}
                </h3>
                <p style={styles.summaryMeta}>Platform geliri</p>
              </div>
            </div>

            <div style={{ ...styles.summaryCard, borderLeftColor: '#f59e0b' }}>
              <div style={styles.summaryIcon}>⏳</div>
              <div style={styles.summaryContent}>
                <p style={styles.summaryLabel}>Bekleyen Hakediş</p>
                <h3 style={{ ...styles.summaryValue, color: '#f59e0b' }}>
                  {formatCurrency(finansOzet.bekleyenHakedis)}
                </h3>
                <p style={styles.summaryMeta}>Ödenmemiş</p>
              </div>
            </div>

            <div style={{ ...styles.summaryCard, borderLeftColor: '#8b5cf6' }}>
              <div style={styles.summaryIcon}>✅</div>
              <div style={styles.summaryContent}>
                <p style={styles.summaryLabel}>Ödenen Hakediş</p>
                <h3 style={{ ...styles.summaryValue, color: '#8b5cf6' }}>
                  {formatCurrency(finansOzet.odenenHakedis)}
                </h3>
                <p style={styles.summaryMeta}>Tamamlandı</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={styles.tabs}>
            {[
              { id: 'ozet', label: '📊 Restoran Özeti', count: restoranOzetleri.length },
              { id: 'hakedisler', label: '💳 Hakediş Geçmişi', count: hakedisler.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.id && styles.tabActive),
                }}
              >
                {tab.label}
                <span style={{
                  ...styles.tabCount,
                  backgroundColor: activeTab === tab.id ? 'white' : '#e2e8f0',
                  color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'ozet' && (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Restoran</th>
                    <th style={styles.th}>Sipariş</th>
                    <th style={styles.th}>Toplam Satış</th>
                    <th style={styles.th}>Komisyon</th>
                    <th style={styles.th}>Net Hakediş</th>
                    <th style={styles.th}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {restoranOzetleri.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={styles.emptyRow}>
                        Bu dönemde satış bulunamadı
                      </td>
                    </tr>
                  ) : (
                    restoranOzetleri.map(restoran => {
                      const netHakedis = restoran.toplamSatis - restoran.komisyon;
                      return (
                        <tr key={restoran.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.restoranCell}>
                              <span style={styles.restoranIcon}>🏪</span>
                              <span style={styles.restoranName}>{restoran.ad}</span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.countBadge}>{restoran.siparisSayisi}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.salesValue}>{formatCurrency(restoran.toplamSatis)}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.commissionValue}>
                              {formatCurrency(restoran.komisyon)}
                              <small style={styles.commissionRate}>
                                ({restoran.komisyonOrani || 10}%)
                              </small>
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.netValue}>{formatCurrency(netHakedis)}</span>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleOpenHakedisModal(restoran)}
                              style={styles.createHakedisBtn}
                              disabled={netHakedis <= 0}
                            >
                              💳 Hakediş Oluştur
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'hakedisler' && (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Tarih</th>
                    <th style={styles.th}>Restoran</th>
                    <th style={styles.th}>Tutar</th>
                    <th style={styles.th}>Açıklama</th>
                    <th style={styles.th}>Durum</th>
                    <th style={styles.th}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {hakedisler.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={styles.emptyRow}>
                        Henüz hakediş kaydı yok
                      </td>
                    </tr>
                  ) : (
                    hakedisler.map(hakedis => (
                      <tr key={hakedis.id} style={styles.tr}>
                        <td style={styles.td}>
                          {new Date(hakedis.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.restoranCell}>
                            <span style={styles.restoranIcon}>🏪</span>
                            <span>{hakedis.restoran?.ad || 'Bilinmiyor'}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.hakedisAmount}>
                            {formatCurrency(hakedis.tutar)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.hakedisDesc}>
                            {hakedis.aciklama || '-'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: hakedis.durum === 'odendi' ? '#dcfce7' : 
                                           hakedis.durum === 'beklemede' ? '#fef3c7' : '#fef2f2',
                            color: hakedis.durum === 'odendi' ? '#16a34a' : 
                                   hakedis.durum === 'beklemede' ? '#d97706' : '#dc2626',
                          }}>
                            {hakedis.durum === 'odendi' ? '✅ Ödendi' : 
                             hakedis.durum === 'beklemede' ? '⏳ Bekliyor' : '❌ İptal'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {hakedis.durum === 'beklemede' && (
                            <div style={styles.hakedisActions}>
                              <button
                                onClick={() => handleUpdateHakedisDurum(hakedis.id, 'odendi')}
                                style={styles.payBtn}
                              >
                                ✓ Öde
                              </button>
                              <button
                                onClick={() => handleUpdateHakedisDurum(hakedis.id, 'iptal')}
                                style={styles.cancelPayBtn}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                          {hakedis.durum === 'odendi' && hakedis.odeme_tarihi && (
                            <span style={styles.paidDate}>
                              {new Date(hakedis.odeme_tarihi).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Hakediş Oluşturma Modal */}
      <Modal
        isOpen={showHakedisModal}
        onClose={() => setShowHakedisModal(false)}
        title="Hakediş Oluştur"
        size="medium"
      >
        {selectedRestoran && (
          <div style={styles.hakedisModalContent}>
            {/* Restoran Bilgisi */}
            <div style={styles.hakedisRestoranInfo}>
              <span style={styles.hakedisRestoranIcon}>🏪</span>
              <div>
                <h3 style={styles.hakedisRestoranName}>{selectedRestoran.ad}</h3>
                <p style={styles.hakedisRestoranMeta}>
                  {selectedRestoran.siparisSayisi} sipariş • {formatCurrency(selectedRestoran.toplamSatis)} satış
                </p>
              </div>
            </div>

            {/* Özet */}
            <div style={styles.hakedisSummary}>
              <div style={styles.hakedisSummaryRow}>
                <span>Toplam Satış</span>
                <span>{formatCurrency(selectedRestoran.toplamSatis)}</span>
              </div>
              <div style={styles.hakedisSummaryRow}>
                <span>Komisyon ({selectedRestoran.komisyonOrani || 10}%)</span>
                <span style={{ color: '#ef4444' }}>-{formatCurrency(selectedRestoran.komisyon)}</span>
              </div>
              <div style={{ ...styles.hakedisSummaryRow, ...styles.hakedisSummaryTotal }}>
                <span>Net Hakediş</span>
                <span style={{ color: '#22c55e', fontWeight: '700' }}>
                  {formatCurrency(selectedRestoran.toplamSatis - selectedRestoran.komisyon)}
                </span>
              </div>
            </div>

            {/* Form */}
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ödenecek Tutar (₺)</label>
                <input
                  type="number"
                  value={hakedisForm.tutar}
                  onChange={(e) => setHakedisForm({ ...hakedisForm, tutar: e.target.value })}
                  style={styles.input}
                  min="0"
                  step="0.01"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Açıklama</label>
                <textarea
                  value={hakedisForm.aciklama}
                  onChange={(e) => setHakedisForm({ ...hakedisForm, aciklama: e.target.value })}
                  style={styles.textarea}
                  rows={3}
                  placeholder="Opsiyonel açıklama..."
                />
              </div>
            </div>

            <div style={styles.formActions}>
              <button onClick={() => setShowHakedisModal(false)} style={styles.cancelButton}>
                İptal
              </button>
              <button 
                onClick={handleCreateHakedis} 
                disabled={actionLoading || hakedisForm.tutar <= 0}
                style={{
                  ...styles.submitButton,
                  opacity: actionLoading || hakedisForm.tutar <= 0 ? 0.6 : 1,
                }}
              >
                {actionLoading ? 'Oluşturuluyor...' : '💳 Hakediş Oluştur'}
              </button>
            </div>
          </div>
        )}
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
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: { fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  dateFilter: {
    display: 'flex',
    gap: '8px',
    backgroundColor: 'white',
    padding: '6px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  dateBtn: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dateBtnActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderLeft: '4px solid #e2e8f0',
  },
  summaryIcon: {
    fontSize: '32px',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '4px 0',
  },
  summaryMeta: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    backgroundColor: 'white',
    padding: '6px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1e293b',
  },
  emptyRow: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  restoranCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  restoranIcon: {
    fontSize: '20px',
  },
  restoranName: {
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  salesValue: {
    fontWeight: '600',
    color: '#22c55e',
  },
  commissionValue: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  commissionRate: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  netValue: {
    fontWeight: '700',
    color: '#1e293b',
    fontSize: '15px',
  },
  createHakedisBtn: {
    padding: '8px 16px',
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  hakedisAmount: {
    fontWeight: '600',
    color: '#1e293b',
  },
  hakedisDesc: {
    fontSize: '13px',
    color: '#64748b',
    maxWidth: '200px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  hakedisActions: {
    display: 'flex',
    gap: '8px',
  },
  payBtn: {
    padding: '8px 16px',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelPayBtn: {
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  paidDate: {
    fontSize: '12px',
    color: '#64748b',
  },
  hakedisModalContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  hakedisRestoranInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  hakedisRestoranIcon: {
    fontSize: '36px',
  },
  hakedisRestoranName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  hakedisRestoranMeta: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  hakedisSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  hakedisSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#64748b',
  },
  hakedisSummaryTotal: {
    paddingTop: '12px',
    borderTop: '2px dashed #e2e8f0',
    fontSize: '16px',
    color: '#1e293b',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    outline: 'none',
  },
  textarea: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
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
};

export default FinansYonetimi;