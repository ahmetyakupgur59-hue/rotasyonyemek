// src/pages/admin/admin-components/RestoranYonetimi.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../services/supabase';

// Common bileşenler
import DataTable from './common/DataTable';
import StatusBadge from './common/StatusBadge';
import LoadingSpinner from './common/LoadingSpinner';
import Modal from './common/Modal';
import ConfirmDialog from './common/ConfirmDialog';
import Pagination from './common/Pagination';
import ExportButton from './common/ExportButton';

function RestoranYonetimi() {
  // State'ler
  const [restoranlar, setRestoranlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDurum, setFilterDurum] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Modal state'leri
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [selectedRestoran, setSelectedRestoran] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    ad: '',
    aciklama: '',
    kategori: '',
    adres: '',
    telefon: '',
    aktif: true,
    puan: 0,
    resim_url: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Kategoriler
  const kategoriler = [
    'Türk Mutfağı',
    'Fast Food', 
    'Pizza',
    'Kebap',
    'Döner',
    'Ev Yemekleri',
    'Dünya Mutfağı',
    'Tatlı',
    'Kahvaltı',
    'Deniz Ürünleri',
  ];

  // Restoranları getir - useCallback ile optimize edildi
  const fetchRestoranlar = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('restoranlar')
        .select('*', { count: 'exact' });

      // Arama filtresi
      if (searchTerm) {
        query = query.or(`ad.ilike.%${searchTerm}%,telefon.ilike.%${searchTerm}%,adres.ilike.%${searchTerm}%`);
      }

      // Durum filtresi
      if (filterDurum === 'aktif') {
        query = query.eq('aktif', true);
      } else if (filterDurum === 'pasif') {
        query = query.eq('aktif', false);
      }

      // Kategori filtresi
      if (filterKategori) {
        query = query.eq('kategori', filterKategori);
      }

      // Sayfalama
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setRestoranlar(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Restoranlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterDurum, filterKategori]);

  useEffect(() => {
    fetchRestoranlar();
  }, [fetchRestoranlar]);

  // Form resetle
  const resetForm = () => {
    setFormData({
      ad: '',
      aciklama: '',
      kategori: '',
      adres: '',
      telefon: '',
      aktif: true,
      puan: 0,
      resim_url: '',
    });
    setFormError('');
    setFormLoading(false);
  };

  // Modal kapat
  const closeModal = () => {
    setModalOpen(false);
    setSelectedRestoran(null);
    resetForm();
  };

  // Yeni restoran ekle modal
  const handleAddNew = () => {
    resetForm();
    setModalMode('add');
    setSelectedRestoran(null);
    setModalOpen(true);
  };

  // Restoran düzenle
  const handleEdit = (restoran) => {
    setFormData({
      ad: restoran.ad || '',
      aciklama: restoran.aciklama || '',
      kategori: restoran.kategori || '',
      adres: restoran.adres || '',
      telefon: restoran.telefon || '',
      aktif: restoran.aktif ?? true,
      puan: restoran.puan || 0,
      resim_url: restoran.resim_url || '',
    });
    setSelectedRestoran(restoran);
    setModalMode('edit');
    setFormError('');
    setFormLoading(false);
    setModalOpen(true);
  };

  // Restoran detay görüntüle
  const handleView = (restoran) => {
    setSelectedRestoran(restoran);
    setModalMode('view');
    setModalOpen(true);
  };

  // ✅ DÜZELTİLMİŞ: Form gönder
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Zaten loading durumundaysa çık
    if (formLoading) {
      console.log('⚠️ Zaten işlem devam ediyor...');
      return;
    }

    setFormError('');

    // Validasyon
    if (!formData.ad?.trim()) {
      setFormError('Restoran adı zorunludur');
      return;
    }

    setFormLoading(true);
    console.log('🚀 Form gönderiliyor...', { modalMode });

    try {
      // Veriyi hazırla
      const restoranData = {
        ad: formData.ad.trim(),
        aciklama: formData.aciklama?.trim() || '',
        kategori: formData.kategori || '',
        adres: formData.adres?.trim() || '',
        telefon: formData.telefon?.trim() || '',
        aktif: Boolean(formData.aktif),
        resim_url: formData.resim_url?.trim() || '',
      };

      console.log('📦 Gönderilecek veri:', restoranData);

      let result;

      if (modalMode === 'add') {
        result = await supabase
          .from('restoranlar')
          .insert([restoranData])
          .select();
        
        console.log('➕ Insert sonucu:', result);
      } else if (modalMode === 'edit' && selectedRestoran?.id) {
        result = await supabase
          .from('restoranlar')
          .update(restoranData)
          .eq('id', selectedRestoran.id)
          .select();
        
        console.log('✏️ Update sonucu:', result);
      } else {
        throw new Error('Geçersiz işlem modu veya restoran ID eksik');
      }

      // Hata kontrolü
      if (result.error) {
        console.error('❌ Supabase hatası:', result.error);
        throw result.error;
      }

      console.log('✅ İşlem başarılı:', result.data);

      // Başarılı - Sırayla state'leri güncelle
      setFormLoading(false);
      setModalOpen(false);
      setSelectedRestoran(null);
      resetForm();
      
      // Listeyi yenile
      fetchRestoranlar();
      
    } catch (error) {
      console.error('❌ Kaydetme hatası:', error);
      setFormError(
        error.message || 
        error.details || 
        'Bir hata oluştu. Lütfen tekrar deneyin.'
      );
      setFormLoading(false);
    }
  };

  // Restoran sil
  const handleDelete = async () => {
    if (!selectedRestoran?.id) return;

    try {
      setDeleteLoading(true);

      const { error } = await supabase
        .from('restoranlar')
        .delete()
        .eq('id', selectedRestoran.id);

      if (error) throw error;

      setDeleteDialogOpen(false);
      setSelectedRestoran(null);
      fetchRestoranlar();
    } catch (error) {
      console.error('Restoran silinirken hata:', error);
      alert('Silme işlemi başarısız: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Durum değiştir (aktif/pasif)
  const handleToggleStatus = async (restoran) => {
    try {
      const { error } = await supabase
        .from('restoranlar')
        .update({ aktif: !restoran.aktif })
        .eq('id', restoran.id);

      if (error) throw error;
      fetchRestoranlar();
    } catch (error) {
      console.error('Durum değiştirilirken hata:', error);
    }
  };

  // Toplu silme
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    
    if (!window.confirm(`${selectedRows.length} restoran silinecek. Emin misiniz?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('restoranlar')
        .delete()
        .in('id', selectedRows);

      if (error) throw error;
      
      setSelectedRows([]);
      fetchRestoranlar();
    } catch (error) {
      console.error('Toplu silme hatası:', error);
    }
  };

  // Filtre sıfırla
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDurum('');
    setFilterKategori('');
    setCurrentPage(1);
  };

  // Tarih formatla
  const formatTarih = (tarih) => {
    if (!tarih) return '-';
    return new Date(tarih).toLocaleDateString('tr-TR');
  };

  // Tablo kolonları
  const columns = [
    {
      key: 'ad',
      label: 'Restoran',
      sortable: true,
      render: (value, row) => (
        <div style={styles.restoranCell}>
          <div style={styles.restoranAvatar}>
            {row.resim_url ? (
              <img src={row.resim_url} alt={value} style={styles.restoranImg} />
            ) : (
              <span>🏪</span>
            )}
          </div>
          <div style={styles.restoranInfo}>
            <span style={styles.restoranAd}>{value}</span>
            <span style={styles.restoranKategori}>{row.kategori || 'Kategori yok'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'telefon',
      label: 'Telefon',
      render: (value) => value || '-',
    },
    {
      key: 'adres',
      label: 'Adres',
      render: (value) => (
        <span style={styles.adres}>
          {value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : '-'}
        </span>
      ),
    },
    {
      key: 'puan',
      label: 'Puan',
      sortable: true,
      width: '80px',
      render: (value) => (
        <span style={styles.puan}>⭐ {value?.toFixed(1) || '0.0'}</span>
      ),
    },
    {
      key: 'aktif',
      label: 'Durum',
      width: '100px',
      render: (value) => (
        <StatusBadge status={value ? 'aktif' : 'pasif'} type="general" />
      ),
    },
    {
      key: 'created_at',
      label: 'Kayıt Tarihi',
      sortable: true,
      width: '110px',
      render: (value) => formatTarih(value),
    },
  ];

  // Export için kolonlar
  const exportColumns = [
    { key: 'ad', label: 'Restoran Adı' },
    { key: 'kategori', label: 'Kategori' },
    { key: 'telefon', label: 'Telefon' },
    { key: 'adres', label: 'Adres' },
    { key: 'puan', label: 'Puan' },
    { key: 'aktif', label: 'Durum' },
  ];

  return (
    <div style={styles.container}>
      {/* Üst Başlık */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🏪 Restoran Yönetimi</h2>
          <p style={styles.subtitle}>
            Toplam {totalCount} restoran kayıtlı
          </p>
        </div>
        <div style={styles.headerActions}>
          <ExportButton 
            data={restoranlar} 
            filename="restoranlar" 
            columns={exportColumns} 
          />
          <button onClick={handleAddNew} style={styles.addButton}>
            ➕ Yeni Restoran
          </button>
        </div>
      </div>

      {/* Arama ve Filtreler */}
      <div style={styles.filtersContainer}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Restoran adı, telefon veya adres ara..."
            style={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={styles.clearBtn}>
              ✕
            </button>
          )}
        </div>

        <div style={styles.filterGroup}>
          <select
            value={filterDurum}
            onChange={(e) => {
              setFilterDurum(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Tüm Durumlar</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>

          <select
            value={filterKategori}
            onChange={(e) => {
              setFilterKategori(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Tüm Kategoriler</option>
            {kategoriler.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>

          {(searchTerm || filterDurum || filterKategori) && (
            <button onClick={handleResetFilters} style={styles.resetBtn}>
              ↺ Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Seçili Satır Aksiyonları */}
      {selectedRows.length > 0 && (
        <div style={styles.bulkActions}>
          <span style={styles.selectedCount}>
            {selectedRows.length} restoran seçildi
          </span>
          <button onClick={handleBulkDelete} style={styles.bulkDeleteBtn}>
            🗑️ Seçilenleri Sil
          </button>
          <button onClick={() => setSelectedRows([])} style={styles.bulkCancelBtn}>
            ✕ Seçimi İptal
          </button>
        </div>
      )}

      {/* Tablo */}
      <DataTable
        columns={columns}
        data={restoranlar}
        loading={loading}
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onRowClick={handleView}
        emptyIcon="🏪"
        emptyTitle="Restoran Bulunamadı"
        emptyDescription="Henüz kayıtlı restoran yok veya arama kriterlerine uygun sonuç bulunamadı."
        actions={(row) => (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
              style={styles.actionBtn}
              title="Düzenle"
            >
              ✏️
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleStatus(row); }}
              style={styles.actionBtn}
              title={row.aktif ? 'Pasife Al' : 'Aktif Et'}
            >
              {row.aktif ? '🔴' : '🟢'}
            </button>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedRestoran(row);
                setDeleteDialogOpen(true);
              }}
              style={{ ...styles.actionBtn, ...styles.deleteBtn }}
              title="Sil"
            >
              🗑️
            </button>
          </>
        )}
      />

      {/* Sayfalama */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalCount / itemsPerPage)}
        onPageChange={setCurrentPage}
        totalItems={totalCount}
        itemsPerPage={itemsPerPage}
      />

      {/* Ekleme/Düzenleme Modal */}
      <Modal
        isOpen={modalOpen && (modalMode === 'add' || modalMode === 'edit')}
        onClose={closeModal}
        title={modalMode === 'add' ? '➕ Yeni Restoran Ekle' : '✏️ Restoran Düzenle'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <div style={styles.formError}>
              ⚠️ {formError}
            </div>
          )}

          <div style={styles.formGrid}>
            {/* Restoran Adı */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Restoran Adı *</label>
              <input
                type="text"
                value={formData.ad}
                onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                style={styles.input}
                placeholder="Örn: Lezzet Durağı"
                disabled={formLoading}
                required
              />
            </div>

            {/* Kategori */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Kategori</label>
              <select
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                style={styles.input}
                disabled={formLoading}
              >
                <option value="">Kategori Seçin</option>
                {kategoriler.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {/* Telefon */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Telefon</label>
              <input
                type="tel"
                value={formData.telefon}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                style={styles.input}
                placeholder="0555 123 4567"
                disabled={formLoading}
              />
            </div>

            {/* Resim URL */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Resim URL</label>
              <input
                type="url"
                value={formData.resim_url}
                onChange={(e) => setFormData({ ...formData, resim_url: e.target.value })}
                style={styles.input}
                placeholder="https://..."
                disabled={formLoading}
              />
            </div>

            {/* Adres - Tam genişlik */}
            <div style={styles.formGroupFull}>
              <label style={styles.label}>Adres</label>
              <textarea
                value={formData.adres}
                onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                style={styles.textarea}
                placeholder="Tam adres..."
                rows={2}
                disabled={formLoading}
              />
            </div>

            {/* Açıklama - Tam genişlik */}
            <div style={styles.formGroupFull}>
              <label style={styles.label}>Açıklama</label>
              <textarea
                value={formData.aciklama}
                onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                style={styles.textarea}
                placeholder="Restoran hakkında kısa açıklama..."
                rows={3}
                disabled={formLoading}
              />
            </div>

            {/* Durum */}
            <div style={styles.formGroupFull}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.aktif}
                  onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                  style={styles.checkbox}
                  disabled={formLoading}
                />
                <span>Restoran Aktif</span>
                <span style={styles.statusIndicator}>
                  {formData.aktif ? '🟢' : '🔴'}
                </span>
              </label>
            </div>
          </div>

          {/* Form Butonları */}
          <div style={styles.formActions}>
            <button
              type="button"
              onClick={closeModal}
              style={{
                ...styles.cancelBtn,
                opacity: formLoading ? 0.6 : 1,
                cursor: formLoading ? 'not-allowed' : 'pointer',
              }}
              disabled={formLoading}
            >
              İptal
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                opacity: formLoading ? 0.8 : 1,
                cursor: formLoading ? 'not-allowed' : 'pointer',
              }}
              disabled={formLoading}
            >
              {formLoading ? (
                <>
                  <span style={styles.spinner}></span>
                  Kaydediliyor...
                </>
              ) : (
                modalMode === 'add' ? 'Ekle' : 'Güncelle'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detay Görüntüleme Modal */}
      <Modal
        isOpen={modalOpen && modalMode === 'view'}
        onClose={closeModal}
        title="🏪 Restoran Detayı"
        size="medium"
      >
        {selectedRestoran && (
          <div style={styles.detailContent}>
            <div style={styles.detailHeader}>
              <div style={styles.detailAvatar}>
                {selectedRestoran.resim_url ? (
                  <img src={selectedRestoran.resim_url} alt={selectedRestoran.ad} style={styles.detailImg} />
                ) : (
                  <span style={styles.detailIcon}>🏪</span>
                )}
              </div>
              <div style={styles.detailInfo}>
                <h3 style={styles.detailName}>{selectedRestoran.ad}</h3>
                <p style={styles.detailCategory}>{selectedRestoran.kategori || 'Kategori yok'}</p>
                <StatusBadge status={selectedRestoran.aktif ? 'aktif' : 'pasif'} type="general" />
              </div>
            </div>

            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>📞 Telefon</span>
                <span style={styles.detailValue}>{selectedRestoran.telefon || '-'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>⭐ Puan</span>
                <span style={styles.detailValue}>{selectedRestoran.puan?.toFixed(1) || '0.0'}</span>
              </div>
              <div style={styles.detailItemFull}>
                <span style={styles.detailLabel}>📍 Adres</span>
                <span style={styles.detailValue}>{selectedRestoran.adres || '-'}</span>
              </div>
              <div style={styles.detailItemFull}>
                <span style={styles.detailLabel}>📝 Açıklama</span>
                <span style={styles.detailValue}>{selectedRestoran.aciklama || '-'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>📅 Kayıt Tarihi</span>
                <span style={styles.detailValue}>{formatTarih(selectedRestoran.created_at)}</span>
              </div>
            </div>

            <div style={styles.detailActions}>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setTimeout(() => handleEdit(selectedRestoran), 100);
                }}
                style={styles.editBtn}
              >
                ✏️ Düzenle
              </button>
              <button
                onClick={() => handleToggleStatus(selectedRestoran)}
                style={styles.toggleBtn}
              >
                {selectedRestoran.aktif ? '🔴 Pasife Al' : '🟢 Aktif Et'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Silme Onay Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Restoran Silinecek"
        message={`"${selectedRestoran?.ad}" restoranını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  
  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#64748b',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  addButton: {
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  // Filters
  filtersContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  searchBox: {
    position: 'relative',
    flex: '1',
    minWidth: '250px',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 42px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: '#e2e8f0',
    border: 'none',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
  },
  filterGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '150px',
  },
  resetBtn: {
    padding: '12px 16px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  },

  // Bulk Actions
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '10px',
    border: '1px solid #fcd34d',
  },
  selectedCount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
  },
  bulkDeleteBtn: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  bulkCancelBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#92400e',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },

  // Table Cells
  restoranCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  restoranAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  restoranImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  restoranInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  restoranAd: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '14px',
  },
  restoranKategori: {
    fontSize: '12px',
    color: '#64748b',
  },
  adres: {
    fontSize: '13px',
    color: '#64748b',
  },
  puan: {
    fontWeight: '600',
    color: '#f59e0b',
  },

  // Action Buttons
  actionBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
  },

  // Form Styles
  formError: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formGroupFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    gridColumn: '1 / -1',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, opacity 0.2s',
  },
  textarea: {
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, opacity 0.2s',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#334155',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  statusIndicator: {
    marginLeft: 'auto',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  cancelBtn: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  submitBtn: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'opacity 0.2s',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Detail Modal
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e2e8f0',
  },
  detailAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  detailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  detailIcon: {
    fontSize: '36px',
  },
  detailInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailName: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
  },
  detailCategory: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#64748b',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
  },
  detailItemFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    gridColumn: '1 / -1',
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
  },
  detailValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500',
  },
  detailActions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  editBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  toggleBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// Spinner animasyonu için CSS ekleyin (index.css'e)
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(spinnerStyle);

export default RestoranYonetimi;