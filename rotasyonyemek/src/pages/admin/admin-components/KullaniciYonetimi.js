// src/pages/admin/admin-components/KullaniciYonetimi.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../services/supabase';

// Common bileşenler
import DataTable from './common/DataTable';
import StatusBadge from './common/StatusBadge';
import Modal from './common/Modal';
import ConfirmDialog from './common/ConfirmDialog';
import Pagination from './common/Pagination';
import ExportButton from './common/ExportButton';

function KullaniciYonetimi() {
  // State'ler
  const [kullanicilar, setKullanicilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('');
  const [filterDurum, setFilterDurum] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Modal state'leri
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'edit', 'add'
  const [selectedKullanici, setSelectedKullanici] = useState(null);
  
  // Ban dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banLoading, setBanLoading] = useState(false);
  const [banNedeni, setBanNedeni] = useState('');

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    ad: '',
    email: '',
    telefon: '',
    adres: '',
    rol: 'musteri',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Roller
  const roller = [
    { value: 'musteri', label: 'Müşteri', icon: '👤' },
    { value: 'restoran', label: 'Restoran', icon: '🏪' },
    { value: 'admin', label: 'Admin', icon: '👑' },
  ];

  // Kullanıcıları getir
  const fetchKullanicilar = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('kullanicilar')
        .select('*', { count: 'exact' });

      // Arama filtresi
      if (searchTerm) {
        query = query.or(`ad.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefon.ilike.%${searchTerm}%`);
      }

      // Rol filtresi
      if (filterRol) {
        query = query.eq('rol', filterRol);
      }

      // Durum filtresi
      if (filterDurum === 'aktif') {
        query = query.or('banned.is.null,banned.eq.false');
      } else if (filterDurum === 'banlı') {
        query = query.eq('banned', true);
      }

      // Sayfalama
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setKullanicilar(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterRol, filterDurum]);

  useEffect(() => {
    fetchKullanicilar();
  }, [fetchKullanicilar]);

  // Form resetle
  const resetForm = () => {
    setFormData({
      ad: '',
      email: '',
      telefon: '',
      adres: '',
      rol: 'musteri',
    });
    setFormError('');
    setFormLoading(false);
  };

  // Modal kapat
  const closeModal = () => {
    setModalOpen(false);
    setSelectedKullanici(null);
    resetForm();
  };

  // Kullanıcı görüntüle
  const handleView = (kullanici) => {
    setSelectedKullanici(kullanici);
    setModalMode('view');
    setModalOpen(true);
  };

  // Kullanıcı düzenle
  const handleEdit = (kullanici) => {
    setFormData({
      ad: kullanici.ad || '',
      email: kullanici.email || '',
      telefon: kullanici.telefon || '',
      adres: kullanici.adres || '',
      rol: kullanici.rol || 'musteri',
    });
    setSelectedKullanici(kullanici);
    setModalMode('edit');
    setFormError('');
    setModalOpen(true);
  };

  // Yeni kullanıcı ekle
  const handleAddNew = () => {
    resetForm();
    setModalMode('add');
    setSelectedKullanici(null);
    setModalOpen(true);
  };

  // Form gönder
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formLoading) return;

    setFormError('');

    // Validasyon
    if (!formData.ad?.trim()) {
      setFormError('Ad soyad zorunludur');
      return;
    }
    if (!formData.email?.trim()) {
      setFormError('E-posta zorunludur');
      return;
    }

    setFormLoading(true);

    try {
      const kullaniciData = {
        ad: formData.ad.trim(),
        email: formData.email.trim().toLowerCase(),
        telefon: formData.telefon?.trim() || '',
        adres: formData.adres?.trim() || '',
        rol: formData.rol,
      };

      let result;

      if (modalMode === 'add') {
        result = await supabase
          .from('kullanicilar')
          .insert([kullaniciData])
          .select();
      } else {
        result = await supabase
          .from('kullanicilar')
          .update(kullaniciData)
          .eq('id', selectedKullanici.id)
          .select();
      }

      if (result.error) throw result.error;

      setFormLoading(false);
      setModalOpen(false);
      resetForm();
      fetchKullanicilar();
      
    } catch (error) {
      console.error('Kullanıcı kaydedilirken hata:', error);
      setFormError('Bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      setFormLoading(false);
    }
  };

  // Kullanıcı banla/ban kaldır
  const handleBan = async () => {
    if (!selectedKullanici) return;

    try {
      setBanLoading(true);

      const isBanned = selectedKullanici.banned;
      
      const { error } = await supabase
        .from('kullanicilar')
        .update({ 
          banned: !isBanned,
          ban_nedeni: !isBanned ? banNedeni : null
        })
        .eq('id', selectedKullanici.id);

      if (error) throw error;

      setBanDialogOpen(false);
      setBanNedeni('');
      setSelectedKullanici(null);
      fetchKullanicilar();
    } catch (error) {
      console.error('Ban işlemi hatası:', error);
      alert('İşlem başarısız: ' + error.message);
    } finally {
      setBanLoading(false);
    }
  };

  // Kullanıcı sil
  const handleDelete = async () => {
    if (!selectedKullanici) return;

    try {
      setDeleteLoading(true);

      const { error } = await supabase
        .from('kullanicilar')
        .delete()
        .eq('id', selectedKullanici.id);

      if (error) throw error;

      setDeleteDialogOpen(false);
      setSelectedKullanici(null);
      fetchKullanicilar();
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Silme işlemi başarısız: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Toplu ban
  const handleBulkBan = async () => {
    if (selectedRows.length === 0) return;
    
    if (!window.confirm(`${selectedRows.length} kullanıcı banlanacak. Emin misiniz?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('kullanicilar')
        .update({ banned: true, ban_nedeni: 'Toplu ban işlemi' })
        .in('id', selectedRows);

      if (error) throw error;
      
      setSelectedRows([]);
      fetchKullanicilar();
    } catch (error) {
      console.error('Toplu ban hatası:', error);
    }
  };

  // Filtre sıfırla
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterRol('');
    setFilterDurum('');
    setCurrentPage(1);
  };

  // Tarih formatla
  const formatTarih = (tarih) => {
    if (!tarih) return '-';
    return new Date(tarih).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Rol etiketi
  const getRolLabel = (rol) => {
    const found = roller.find(r => r.value === rol);
    return found ? `${found.icon} ${found.label}` : rol;
  };

  // Tablo kolonları
  const columns = [
    {
      key: 'ad',
      label: 'Kullanıcı',
      sortable: true,
      render: (value, row) => (
        <div style={styles.userCell}>
          <div style={styles.userAvatar}>
            {row.banned ? '🚫' : (row.rol === 'admin' ? '👑' : row.rol === 'restoran' ? '🏪' : '👤')}
          </div>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{value || 'İsimsiz'}</span>
            <span style={styles.userEmail}>{row.email}</span>
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
      key: 'rol',
      label: 'Rol',
      width: '120px',
      render: (value) => (
        <StatusBadge status={value} type="role" />
      ),
    },
    {
      key: 'banned',
      label: 'Durum',
      width: '100px',
      render: (value) => (
        <StatusBadge 
          status={value ? 'banned' : 'aktif'} 
          type="general" 
        />
      ),
    },
    {
      key: 'created_at',
      label: 'Kayıt Tarihi',
      sortable: true,
      width: '140px',
      render: (value) => formatTarih(value),
    },
  ];

  // Export kolonları
  const exportColumns = [
    { key: 'ad', label: 'Ad Soyad' },
    { key: 'email', label: 'E-posta' },
    { key: 'telefon', label: 'Telefon' },
    { key: 'rol', label: 'Rol' },
    { key: 'banned', label: 'Banlı' },
    { key: 'created_at', label: 'Kayıt Tarihi' },
  ];

  // İstatistikler
  const stats = {
    toplam: totalCount,
    aktif: kullanicilar.filter(k => !k.banned).length,
    banli: kullanicilar.filter(k => k.banned).length,
    admin: kullanicilar.filter(k => k.rol === 'admin').length,
    restoran: kullanicilar.filter(k => k.rol === 'restoran').length,
    musteri: kullanicilar.filter(k => k.rol === 'musteri').length,
  };

  return (
    <div style={styles.container}>
      {/* Üst Başlık */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>👥 Kullanıcı Yönetimi</h2>
          <p style={styles.subtitle}>
            Toplam {totalCount} kullanıcı kayıtlı
          </p>
        </div>
        <div style={styles.headerActions}>
          <ExportButton 
            data={kullanicilar} 
            filename="kullanicilar" 
            columns={exportColumns} 
          />
          <button onClick={handleAddNew} style={styles.addButton}>
            ➕ Yeni Kullanıcı
          </button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.toplam}</span>
            <span style={styles.statLabel}>Toplam</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#dcfce7'}}>👤</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.musteri}</span>
            <span style={styles.statLabel}>Müşteri</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#fef3c7'}}>🏪</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.restoran}</span>
            <span style={styles.statLabel}>Restoran</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#e0e7ff'}}>👑</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.admin}</span>
            <span style={styles.statLabel}>Admin</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#fee2e2'}}>🚫</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.banli}</span>
            <span style={styles.statLabel}>Banlı</span>
          </div>
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
            placeholder="Ad, e-posta veya telefon ara..."
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
            value={filterRol}
            onChange={(e) => {
              setFilterRol(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Tüm Roller</option>
            {roller.map(r => (
              <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
            ))}
          </select>

          <select
            value={filterDurum}
            onChange={(e) => {
              setFilterDurum(e.target.value);
              setCurrentPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Tüm Durumlar</option>
            <option value="aktif">✅ Aktif</option>
            <option value="banlı">🚫 Banlı</option>
          </select>

          {(searchTerm || filterRol || filterDurum) && (
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
            {selectedRows.length} kullanıcı seçildi
          </span>
          <button onClick={handleBulkBan} style={styles.bulkBanBtn}>
            🚫 Seçilenleri Banla
          </button>
          <button onClick={() => setSelectedRows([])} style={styles.bulkCancelBtn}>
            ✕ Seçimi İptal
          </button>
        </div>
      )}

      {/* Tablo */}
      <DataTable
        columns={columns}
        data={kullanicilar}
        loading={loading}
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onRowClick={handleView}
        emptyIcon="👥"
        emptyTitle="Kullanıcı Bulunamadı"
        emptyDescription="Henüz kayıtlı kullanıcı yok veya arama kriterlerine uygun sonuç bulunamadı."
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
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedKullanici(row);
                setBanDialogOpen(true);
              }}
              style={styles.actionBtn}
              title={row.banned ? 'Ban Kaldır' : 'Banla'}
            >
              {row.banned ? '✅' : '🚫'}
            </button>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedKullanici(row);
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

      {/* Detay Görüntüleme Modal */}
      <Modal
        isOpen={modalOpen && modalMode === 'view'}
        onClose={closeModal}
        title="👤 Kullanıcı Detayı"
        size="medium"
      >
        {selectedKullanici && (
          <div style={styles.detailContent}>
            <div style={styles.detailHeader}>
              <div style={styles.detailAvatar}>
                {selectedKullanici.banned ? '🚫' : 
                  selectedKullanici.rol === 'admin' ? '👑' : 
                  selectedKullanici.rol === 'restoran' ? '🏪' : '👤'}
              </div>
              <div style={styles.detailInfo}>
                <h3 style={styles.detailName}>{selectedKullanici.ad || 'İsimsiz'}</h3>
                <p style={styles.detailEmail}>{selectedKullanici.email}</p>
                <div style={styles.detailBadges}>
                  <StatusBadge status={selectedKullanici.rol} type="role" />
                  <StatusBadge 
                    status={selectedKullanici.banned ? 'banned' : 'aktif'} 
                    type="general" 
                  />
                </div>
              </div>
            </div>

            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>📞 Telefon</span>
                <span style={styles.detailValue}>{selectedKullanici.telefon || '-'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>📅 Kayıt Tarihi</span>
                <span style={styles.detailValue}>{formatTarih(selectedKullanici.created_at)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>🕐 Son Giriş</span>
                <span style={styles.detailValue}>{formatTarih(selectedKullanici.son_giris) || '-'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>⭐ Puan</span>
                <span style={styles.detailValue}>{selectedKullanici.puan || 0}</span>
              </div>
              <div style={styles.detailItemFull}>
                <span style={styles.detailLabel}>📍 Adres</span>
                <span style={styles.detailValue}>{selectedKullanici.adres || '-'}</span>
              </div>
              {selectedKullanici.banned && selectedKullanici.ban_nedeni && (
                <div style={styles.detailItemFull}>
                  <span style={styles.detailLabel}>🚫 Ban Nedeni</span>
                  <span style={{...styles.detailValue, color: '#dc2626'}}>{selectedKullanici.ban_nedeni}</span>
                </div>
              )}
            </div>

            <div style={styles.detailActions}>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setTimeout(() => handleEdit(selectedKullanici), 100);
                }}
                style={styles.editBtn}
              >
                ✏️ Düzenle
              </button>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setTimeout(() => {
                    setBanDialogOpen(true);
                  }, 100);
                }}
                style={styles.banBtn}
              >
                {selectedKullanici.banned ? '✅ Ban Kaldır' : '🚫 Banla'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Ekleme/Düzenleme Modal */}
      <Modal
        isOpen={modalOpen && (modalMode === 'add' || modalMode === 'edit')}
        onClose={closeModal}
        title={modalMode === 'add' ? '➕ Yeni Kullanıcı' : '✏️ Kullanıcı Düzenle'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <div style={styles.formError}>
              ⚠️ {formError}
            </div>
          )}

          <div style={styles.formGrid}>
            {/* Ad Soyad */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Ad Soyad *</label>
              <input
                type="text"
                value={formData.ad}
                onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                style={styles.input}
                placeholder="Örn: Ahmet Yılmaz"
                disabled={formLoading}
                required
              />
            </div>

            {/* E-posta */}
            <div style={styles.formGroup}>
              <label style={styles.label}>E-posta *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={styles.input}
                placeholder="ornek@email.com"
                disabled={formLoading || modalMode === 'edit'}
                required
              />
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

            {/* Rol */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Rol</label>
              <select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                style={styles.input}
                disabled={formLoading}
              >
                {roller.map(r => (
                  <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                ))}
              </select>
            </div>

            {/* Adres */}
            <div style={styles.formGroupFull}>
              <label style={styles.label}>Adres</label>
              <textarea
                value={formData.adres}
                onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                style={styles.textarea}
                placeholder="Tam adres..."
                rows={3}
                disabled={formLoading}
              />
            </div>
          </div>

          {/* Form Butonları */}
          <div style={styles.formActions}>
            <button
              type="button"
              onClick={closeModal}
              style={styles.cancelBtn}
              disabled={formLoading}
            >
              İptal
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={formLoading}
            >
              {formLoading ? 'Kaydediliyor...' : (modalMode === 'add' ? 'Ekle' : 'Güncelle')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ban Dialog */}
      <ConfirmDialog
        isOpen={banDialogOpen}
        onClose={() => {
          setBanDialogOpen(false);
          setBanNedeni('');
        }}
        onConfirm={handleBan}
        title={selectedKullanici?.banned ? 'Ban Kaldır' : 'Kullanıcıyı Banla'}
        message={
          selectedKullanici?.banned 
            ? `"${selectedKullanici?.ad}" kullanıcısının banını kaldırmak istediğinize emin misiniz?`
            : (
              <div>
                <p>"{selectedKullanici?.ad}" kullanıcısını banlamak istediğinize emin misiniz?</p>
                <div style={{ marginTop: '16px' }}>
                  <label style={styles.label}>Ban Nedeni (opsiyonel)</label>
                  <textarea
                    value={banNedeni}
                    onChange={(e) => setBanNedeni(e.target.value)}
                    style={styles.textarea}
                    placeholder="Ban nedenini yazın..."
                    rows={2}
                  />
                </div>
              </div>
            )
        }
        confirmText={selectedKullanici?.banned ? 'Ban Kaldır' : 'Banla'}
        cancelText="İptal"
        type={selectedKullanici?.banned ? 'info' : 'warning'}
        loading={banLoading}
      />

      {/* Silme Onay Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Kullanıcı Silinecek"
        message={`"${selectedKullanici?.ad}" kullanıcısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve kullanıcının tüm verileri silinecektir.`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
}

// Stiller
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

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
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
  bulkBanBtn: {
    padding: '8px 16px',
    backgroundColor: '#f59e0b',
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
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  userName: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '14px',
  },
  userEmail: {
    fontSize: '12px',
    color: '#64748b',
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
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    flexShrink: 0,
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
  detailEmail: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#64748b',
  },
  detailBadges: {
    display: 'flex',
    gap: '8px',
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
  banBtn: {
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
  },
};

export default KullaniciYonetimi;