import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

const YorumYonetimi = () => {
  const [yorumlar, setYorumlar] = useState([]);
  const [restoranlar, setRestoranlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRestoran, setFilterRestoran] = useState('');
  const [filterPuan, setFilterPuan] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedYorum, setSelectedYorum] = useState(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingYorum, setDeletingYorum] = useState(null);
  const [selectedYorumlar, setSelectedYorumlar] = useState([]);

  // İstatistikler
  const [stats, setStats] = useState({
    toplam: 0,
    onayBekleyen: 0,
    ortalamaPuan: 0,
    bugun: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: yorumData, error } = await supabase
        .from('yorumlar')
        .select(`
          *,
          kullanici:kullanici_id(id, email, ad),
          restoran:restoran_id(id, ad),
          siparis:siparis_id(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setYorumlar(yorumData || []);

      const { data: restoranData } = await supabase
        .from('restoranlar')
        .select('id, ad')
        .eq('aktif', true)
        .order('ad');
      setRestoranlar(restoranData || []);

      // İstatistikler
      const onayBekleyen = yorumData?.filter(y => y.onayli === false) || [];
      const puanlar = yorumData?.filter(y => y.puan).map(y => y.puan) || [];
      const ortalama = puanlar.length > 0 ? (puanlar.reduce((a, b) => a + b, 0) / puanlar.length).toFixed(1) : 0;
      const bugun = new Date().toISOString().split('T')[0];
      const bugunYorumlar = yorumData?.filter(y => y.created_at?.startsWith(bugun)) || [];

      setStats({
        toplam: yorumData?.length || 0,
        onayBekleyen: onayBekleyen.length,
        ortalamaPuan: ortalama,
        bugun: bugunYorumlar.length
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

  // Yorum onayla/reddet
  const handleApproval = async (yorum, onayli) => {
    try {
      const { error } = await supabase
        .from('yorumlar')
        .update({ onayli, updated_at: new Date().toISOString() })
        .eq('id', yorum.id);

      if (error) throw error;
      showMessage('success', onayli ? 'Yorum onaylandı' : 'Yorum reddedildi');
      fetchAllData();
    } catch (error) {
      console.error('Onay hatası:', error);
      showMessage('error', 'İşlem başarısız');
    }
  };

  // Yorum sil
  const handleDelete = async () => {
    if (!deletingYorum) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('yorumlar')
        .delete()
        .eq('id', deletingYorum.id);

      if (error) throw error;
      showMessage('success', 'Yorum silindi');
      setDeleteModalOpen(false);
      setDeletingYorum(null);
      fetchAllData();
    } catch (error) {
      console.error('Silme hatası:', error);
      showMessage('error', 'Silme başarısız');
    }
    setSaving(false);
  };

  // Yanıt gönder
  const handleReply = async () => {
    if (!replyText.trim() || !selectedYorum) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('yorumlar')
        .update({ 
          admin_yaniti: replyText.trim(),
          admin_yanit_tarihi: new Date().toISOString()
        })
        .eq('id', selectedYorum.id);

      if (error) throw error;
      showMessage('success', 'Yanıt gönderildi');
      setReplyModalOpen(false);
      setReplyText('');
      fetchAllData();
    } catch (error) {
      console.error('Yanıt hatası:', error);
      showMessage('error', 'Yanıt gönderilemedi');
    }
    setSaving(false);
  };

  // Toplu onaylama
  const handleBulkApprove = async () => {
    if (selectedYorumlar.length === 0) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('yorumlar')
        .update({ onayli: true })
        .in('id', selectedYorumlar);

      if (error) throw error;
      showMessage('success', `${selectedYorumlar.length} yorum onaylandı`);
      setSelectedYorumlar([]);
      fetchAllData();
    } catch (error) {
      showMessage('error', 'Toplu onaylama başarısız');
    }
    setSaving(false);
  };

  // Toplu silme
  const handleBulkDelete = async () => {
    if (selectedYorumlar.length === 0) return;
    if (!window.confirm(`${selectedYorumlar.length} yorum silinecek. Emin misiniz?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('yorumlar')
        .delete()
        .in('id', selectedYorumlar);

      if (error) throw error;
      showMessage('success', `${selectedYorumlar.length} yorum silindi`);
      setSelectedYorumlar([]);
      fetchAllData();
    } catch (error) {
      showMessage('error', 'Toplu silme başarısız');
    }
    setSaving(false);
  };

  // Yıldız render
  const renderStars = (puan) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} style={{ color: i < puan ? '#ffc107' : '#ddd' }}>★</span>
    ));
  };

  // Filtreleme
  const filteredYorumlar = yorumlar.filter(y => {
    if (searchTerm && !y.yorum?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !y.kullanici?.ad?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterRestoran && y.restoran_id !== filterRestoran) return false;
    if (filterPuan && y.puan !== parseInt(filterPuan)) return false;
    if (filterStatus === 'onayli' && !y.onayli) return false;
    if (filterStatus === 'bekleyen' && y.onayli !== false) return false;
    if (filterStatus === 'yanitli' && !y.admin_yaniti) return false;
    return true;
  });

  // Sayfalama
  const totalPages = Math.ceil(filteredYorumlar.length / itemsPerPage);
  const paginatedYorumlar = filteredYorumlar.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const styles = {
    container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    header: { marginBottom: '24px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' },
    subtitle: { color: '#666', fontSize: '14px' },
    message: { padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },
    successMessage: { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
    errorMessage: { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
    statValue: { fontSize: '32px', fontWeight: 'bold', color: '#1a1a2e' },
    statLabel: { fontSize: '13px', color: '#666', marginTop: '4px' },
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', backgroundColor: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    filterGroup: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
    searchInput: { padding: '10px 16px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', width: '200px' },
    select: { padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white' },
    button: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '8px' },
    primaryButton: { backgroundColor: '#667eea', color: 'white' },
    successButton: { backgroundColor: '#28a745', color: 'white' },
    dangerButton: { backgroundColor: '#dc3545', color: 'white' },
    outlineButton: { backgroundColor: 'white', border: '1px solid #e0e0e0', color: '#333' },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    yorumCard: { padding: '20px', borderBottom: '1px solid #eee', display: 'flex', gap: '16px' },
    checkbox: { width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0, marginTop: '4px' },
    yorumContent: { flex: 1 },
    yorumHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
    yorumUser: { fontWeight: '600', color: '#1a1a2e' },
    yorumRestoran: { fontSize: '12px', color: '#666', marginTop: '2px' },
    yorumDate: { fontSize: '12px', color: '#999' },
    yorumText: { color: '#333', lineHeight: '1.6', marginBottom: '12px' },
    yorumStars: { fontSize: '18px', marginBottom: '8px' },
    yorumActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    actionBtn: { padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', backgroundColor: 'white', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' },
    badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' },
    successBadge: { backgroundColor: '#d4edda', color: '#155724' },
    warningBadge: { backgroundColor: '#fff3cd', color: '#856404' },
    adminReply: { backgroundColor: '#e3f2fd', padding: '12px', borderRadius: '8px', marginTop: '12px', borderLeft: '3px solid #2196f3' },
    adminReplyLabel: { fontSize: '11px', color: '#1565c0', fontWeight: '600', marginBottom: '4px' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '20px' },
    pageButton: { padding: '8px 14px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' },
    pageButtonActive: { backgroundColor: '#667eea', color: 'white', borderColor: '#667eea' },
    emptyState: { textAlign: 'center', padding: '60px 20px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modal: { backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' },
    modalHeader: { padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: '20px', fontWeight: '600', color: '#1a1a2e' },
    modalBody: { padding: '24px' },
    modalFooter: { padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
    closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' },
    textarea: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minHeight: '120px', resize: 'vertical', boxSizing: 'border-box' },
    selectedCount: { backgroundColor: '#e3f2fd', color: '#1565c0', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500' }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Yorumlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}><span>⭐</span> Yorum Yönetimi</h1>
        <p style={styles.subtitle}>Müşteri yorumlarını inceleyin, onaylayın ve yanıtlayın</p>
      </div>

      {message.text && (
        <div style={{ ...styles.message, ...(message.type === 'success' ? styles.successMessage : styles.errorMessage) }}>
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
          {message.text}
        </div>
      )}

      {/* İstatistikler */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.toplam}</div>
          <div style={styles.statLabel}>Toplam Yorum</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#ffc107' }}>{stats.onayBekleyen}</div>
          <div style={styles.statLabel}>Onay Bekleyen</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#28a745' }}>⭐ {stats.ortalamaPuan}</div>
          <div style={styles.statLabel}>Ortalama Puan</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#667eea' }}>{stats.bugun}</div>
          <div style={styles.statLabel}>Bugün</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <input
            type="text"
            placeholder="🔍 Yorum veya kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={styles.searchInput}
          />
          <select value={filterRestoran} onChange={(e) => { setFilterRestoran(e.target.value); setCurrentPage(1); }} style={styles.select}>
            <option value="">🏪 Tüm Restoranlar</option>
            {restoranlar.map(r => (<option key={r.id} value={r.id}>{r.ad}</option>))}
          </select>
          <select value={filterPuan} onChange={(e) => { setFilterPuan(e.target.value); setCurrentPage(1); }} style={styles.select}>
            <option value="">⭐ Tüm Puanlar</option>
            {[5,4,3,2,1].map(p => (<option key={p} value={p}>{'⭐'.repeat(p)} ({p})</option>))}
          </select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={styles.select}>
            <option value="all">Tüm Durumlar</option>
            <option value="bekleyen">⏳ Onay Bekleyen</option>
            <option value="onayli">✅ Onaylı</option>
            <option value="yanitli">💬 Yanıtlı</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {selectedYorumlar.length > 0 && (
            <>
              <span style={styles.selectedCount}>{selectedYorumlar.length} seçili</span>
              <button style={{ ...styles.button, ...styles.successButton }} onClick={handleBulkApprove}>✅ Toplu Onayla</button>
              <button style={{ ...styles.button, ...styles.dangerButton }} onClick={handleBulkDelete}>🗑️ Toplu Sil</button>
            </>
          )}
        </div>
      </div>

      {/* Yorum Listesi */}
      <div style={styles.card}>
        {paginatedYorumlar.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⭐</div>
            <h3>Yorum Bulunamadı</h3>
            <p style={{ color: '#666' }}>Filtrelere uygun yorum yok</p>
          </div>
        ) : (
          <>
            {paginatedYorumlar.map(yorum => (
              <div key={yorum.id} style={styles.yorumCard}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={selectedYorumlar.includes(yorum.id)}
                  onChange={() => {
                    setSelectedYorumlar(prev => 
                      prev.includes(yorum.id) 
                        ? prev.filter(id => id !== yorum.id)
                        : [...prev, yorum.id]
                    );
                  }}
                />
                <div style={styles.yorumContent}>
                  <div style={styles.yorumHeader}>
                    <div>
                      <div style={styles.yorumUser}>
                        {yorum.kullanici?.ad || yorum.kullanici?.email?.split('@')[0] || 'Anonim'}
                        <span style={{ ...styles.badge, ...(yorum.onayli ? styles.successBadge : styles.warningBadge), marginLeft: '10px' }}>
                          {yorum.onayli ? '✅ Onaylı' : '⏳ Bekliyor'}
                        </span>
                      </div>
                      <div style={styles.yorumRestoran}>🏪 {yorum.restoran?.ad || '-'}</div>
                    </div>
                    <div style={styles.yorumDate}>
                      {new Date(yorum.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <div style={styles.yorumStars}>{renderStars(yorum.puan || 0)}</div>
                  <p style={styles.yorumText}>{yorum.yorum || 'Yorum metni yok'}</p>
                  
                  {yorum.admin_yaniti && (
                    <div style={styles.adminReply}>
                      <div style={styles.adminReplyLabel}>💬 Admin Yanıtı</div>
                      <p style={{ margin: 0, color: '#333' }}>{yorum.admin_yaniti}</p>
                    </div>
                  )}

                  <div style={styles.yorumActions}>
                    {!yorum.onayli && (
                      <button style={{ ...styles.actionBtn, color: '#28a745' }} onClick={() => handleApproval(yorum, true)}>
                        ✅ Onayla
                      </button>
                    )}
                    {yorum.onayli && (
                      <button style={{ ...styles.actionBtn, color: '#dc3545' }} onClick={() => handleApproval(yorum, false)}>
                        ❌ Reddet
                      </button>
                    )}
                    <button style={styles.actionBtn} onClick={() => { setSelectedYorum(yorum); setReplyModalOpen(true); setReplyText(yorum.admin_yaniti || ''); }}>
                      💬 Yanıtla
                    </button>
                    <button style={styles.actionBtn} onClick={() => { setSelectedYorum(yorum); setDetailModalOpen(true); }}>
                      👁️ Detay
                    </button>
                    <button style={{ ...styles.actionBtn, color: '#dc3545' }} onClick={() => { setDeletingYorum(yorum); setDeleteModalOpen(true); }}>
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button style={{ ...styles.pageButton, opacity: currentPage === 1 ? 0.5 : 1 }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>← Önceki</button>
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} style={{ ...styles.pageButton, ...(currentPage === i + 1 ? styles.pageButtonActive : {}) }} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                <button style={{ ...styles.pageButton, opacity: currentPage === totalPages ? 0.5 : 1 }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Sonraki →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Yanıt Modal */}
      {replyModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setReplyModalOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>💬 Yoruma Yanıt Ver</h3>
              <button style={styles.closeButton} onClick={() => setReplyModalOpen(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ marginBottom: '16px', color: '#666' }}>
                <strong>{selectedYorum?.kullanici?.ad || 'Kullanıcı'}</strong> yazdı:
              </p>
              <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ marginBottom: '8px' }}>{renderStars(selectedYorum?.puan || 0)}</div>
                "{selectedYorum?.yorum}"
              </div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Yanıtınız</label>
              <textarea
                style={styles.textarea}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Yanıtınızı yazın..."
              />
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.button, ...styles.outlineButton }} onClick={() => setReplyModalOpen(false)}>İptal</button>
              <button style={{ ...styles.button, ...styles.primaryButton }} onClick={handleReply} disabled={saving || !replyText.trim()}>
                {saving ? '⏳ Gönderiliyor...' : '💬 Yanıtla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detay Modal */}
      {detailModalOpen && selectedYorum && (
        <div style={styles.modalOverlay} onClick={() => setDetailModalOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>⭐ Yorum Detayı</h3>
              <button style={styles.closeButton} onClick={() => setDetailModalOpen(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div><strong>Kullanıcı:</strong> {selectedYorum.kullanici?.ad || selectedYorum.kullanici?.email || '-'}</div>
                <div><strong>Restoran:</strong> {selectedYorum.restoran?.ad || '-'}</div>
                <div><strong>Puan:</strong> {renderStars(selectedYorum.puan || 0)}</div>
                <div><strong>Tarih:</strong> {new Date(selectedYorum.created_at).toLocaleString('tr-TR')}</div>
                <div><strong>Durum:</strong> {selectedYorum.onayli ? '✅ Onaylı' : '⏳ Onay Bekliyor'}</div>
                <div><strong>Sipariş ID:</strong> {selectedYorum.siparis_id || '-'}</div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <strong>Yorum:</strong>
                <p style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
                  {selectedYorum.yorum || 'Yorum metni yok'}
                </p>
              </div>
              {selectedYorum.admin_yaniti && (
                <div style={{ marginTop: '16px' }}>
                  <strong>Admin Yanıtı:</strong>
                  <div style={styles.adminReply}>
                    {selectedYorum.admin_yaniti}
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                      {selectedYorum.admin_yanit_tarihi && new Date(selectedYorum.admin_yanit_tarihi).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Silme Modal */}
      {deleteModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setDeleteModalOpen(false)}>
          <div style={{ ...styles.modal, maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '60px', marginBottom: '16px' }}>🗑️</div>
              <h3>Yorumu Sil</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>Bu yorumu silmek istediğinize emin misiniz?</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button style={{ ...styles.button, ...styles.outlineButton }} onClick={() => setDeleteModalOpen(false)}>Vazgeç</button>
                <button style={{ ...styles.button, ...styles.dangerButton }} onClick={handleDelete} disabled={saving}>
                  {saving ? '⏳ Siliniyor...' : '🗑️ Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YorumYonetimi;
