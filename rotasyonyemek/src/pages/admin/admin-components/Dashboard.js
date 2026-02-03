// src/pages/admin/admin-components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

// Common bileşenler
import StatsCard from './common/StatsCard';
import DataTable from './common/DataTable';
import StatusBadge from './common/StatusBadge';
import LoadingSpinner from './common/LoadingSpinner';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    siparisler: 0,
    restoranlar: 0,
    kullanicilar: 0,
    gelir: 0,
    bekleyenSiparisler: 0,
    onayBekleyenRestoranlar: 0,
  });
  const [sonSiparisler, setSonSiparisler] = useState([]);
  const [enIyiRestoranlar, setEnIyiRestoranlar] = useState([]);
  const [gunlukVeriler, setGunlukVeriler] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Paralel olarak tüm verileri çek
      const [
        siparislerRes,
        restoranlarRes,
        kullanicilarRes,
        bekleyenRes,
        onayBekleyenRes,
        sonSiparislerRes,
        enIyiRestoranlarRes,
      ] = await Promise.all([
        // Toplam sipariş sayısı
        supabase.from('siparisler').select('*', { count: 'exact', head: true }),
        
        // Toplam restoran sayısı
        supabase.from('restoranlar').select('*', { count: 'exact', head: true }),
        
        // Toplam kullanıcı sayısı
        supabase.from('kullanicilar').select('*', { count: 'exact', head: true }),
        
        // Bekleyen siparişler
        supabase.from('siparisler').select('*', { count: 'exact', head: true }).eq('durum', 'beklemede'),
        
        // Onay bekleyen restoranlar
        supabase.from('restoranlar').select('*', { count: 'exact', head: true }).eq('aktif', false),
        
        // Son 10 sipariş
        supabase
          .from('siparisler')
          .select(`
            *,
            kullanicilar:kullanici_id (ad, email),
            restoranlar:restoran_id (ad)
          `)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // En iyi 5 restoran (sipariş sayısına göre)
        supabase
          .from('restoranlar')
          .select('*')
          .eq('aktif', true)
          .order('puan', { ascending: false })
          .limit(5),
      ]);

      // Toplam gelir hesapla
      const { data: gelirData } = await supabase
        .from('siparisler')
        .select('toplam_tutar')
        .in('durum', ['teslim_edildi', 'tamamlandi']);

      const toplamGelir = gelirData?.reduce(
        (sum, s) => sum + (parseFloat(s.toplam_tutar) || 0), 0
      ) || 0;

      // Son 7 günlük sipariş verileri
      const bugun = new Date();
      const yediGunOnce = new Date(bugun);
      yediGunOnce.setDate(yediGunOnce.getDate() - 7);

      const { data: gunlukData } = await supabase
        .from('siparisler')
        .select('created_at, toplam_tutar')
        .gte('created_at', yediGunOnce.toISOString())
        .order('created_at', { ascending: true });

      // Günlük verileri grupla
      const gunlukGruplu = {};
      const gunler = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
      
      for (let i = 6; i >= 0; i--) {
        const tarih = new Date(bugun);
        tarih.setDate(tarih.getDate() - i);
        const key = tarih.toISOString().split('T')[0];
        gunlukGruplu[key] = { 
          gun: gunler[tarih.getDay()], 
          siparis: 0, 
          gelir: 0 
        };
      }

      gunlukData?.forEach(siparis => {
        const key = siparis.created_at.split('T')[0];
        if (gunlukGruplu[key]) {
          gunlukGruplu[key].siparis += 1;
          gunlukGruplu[key].gelir += parseFloat(siparis.toplam_tutar) || 0;
        }
      });

      setGunlukVeriler(Object.values(gunlukGruplu));

      // State'leri güncelle
      setStats({
        siparisler: siparislerRes.count || 0,
        restoranlar: restoranlarRes.count || 0,
        kullanicilar: kullanicilarRes.count || 0,
        gelir: toplamGelir,
        bekleyenSiparisler: bekleyenRes.count || 0,
        onayBekleyenRestoranlar: onayBekleyenRes.count || 0,
      });

      setSonSiparisler(sonSiparislerRes.data || []);
      setEnIyiRestoranlar(enIyiRestoranlarRes.data || []);

    } catch (error) {
      console.error('Dashboard verileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Para formatla
  const formatPara = (tutar) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
    }).format(tutar);
  };

  // Tarih formatla
  const formatTarih = (tarih) => {
    return new Date(tarih).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sipariş tablosu kolonları
  const siparisKolonlari = [
    { 
      key: 'id', 
      label: 'Sipariş No',
      render: (value) => <span style={styles.orderId}>#{value?.slice(-6).toUpperCase()}</span>
    },
    { 
      key: 'restoranlar', 
      label: 'Restoran',
      render: (value) => value?.ad || '-'
    },
    { 
      key: 'kullanicilar', 
      label: 'Müşteri',
      render: (value) => value?.ad || value?.email?.split('@')[0] || '-'
    },
    { 
      key: 'toplam_tutar', 
      label: 'Tutar',
      render: (value) => formatPara(value || 0)
    },
    { 
      key: 'durum', 
      label: 'Durum',
      render: (value) => <StatusBadge status={value} type="order" />
    },
    { 
      key: 'created_at', 
      label: 'Tarih',
      render: (value) => formatTarih(value)
    },
  ];

  if (loading) {
    return <LoadingSpinner size="large" text="Dashboard yükleniyor..." />;
  }

  // Grafik için maksimum değer
  const maxSiparis = Math.max(...gunlukVeriler.map(g => g.siparis), 1);

  return (
    <div style={styles.container}>
      {/* Üst Bildirimler */}
      {(stats.bekleyenSiparisler > 0 || stats.onayBekleyenRestoranlar > 0) && (
        <div style={styles.alerts}>
          {stats.bekleyenSiparisler > 0 && (
            <div style={{ ...styles.alert, ...styles.alertWarning }}>
              <span style={styles.alertIcon}>⏳</span>
              <span><strong>{stats.bekleyenSiparisler}</strong> sipariş onay bekliyor!</span>
            </div>
          )}
          {stats.onayBekleyenRestoranlar > 0 && (
            <div style={{ ...styles.alert, ...styles.alertInfo }}>
              <span style={styles.alertIcon}>🏪</span>
              <span><strong>{stats.onayBekleyenRestoranlar}</strong> restoran onay bekliyor!</span>
            </div>
          )}
        </div>
      )}

      {/* İstatistik Kartları */}
      <div style={styles.statsGrid}>
        <StatsCard
          icon="📦"
          title="Toplam Sipariş"
          value={stats.siparisler.toLocaleString('tr-TR')}
          subtitle="Tüm zamanlar"
          color="blue"
        />
        <StatsCard
          icon="💰"
          title="Toplam Gelir"
          value={formatPara(stats.gelir)}
          subtitle="Tamamlanan siparişler"
          color="green"
        />
        <StatsCard
          icon="🏪"
          title="Restoranlar"
          value={stats.restoranlar.toLocaleString('tr-TR')}
          subtitle="Kayıtlı restoran"
          color="orange"
        />
        <StatsCard
          icon="👥"
          title="Kullanıcılar"
          value={stats.kullanicilar.toLocaleString('tr-TR')}
          subtitle="Kayıtlı kullanıcı"
          color="purple"
        />
      </div>

      {/* Orta Bölüm - Grafik ve En İyi Restoranlar */}
      <div style={styles.middleSection}>
        {/* Haftalık Sipariş Grafiği */}
        <div style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>📈 Son 7 Gün</h3>
          </div>
          <div style={styles.chart}>
            {gunlukVeriler.map((gun, index) => (
              <div key={index} style={styles.chartBar}>
                <div style={styles.barWrapper}>
                  <div 
                    style={{
                      ...styles.bar,
                      height: `${(gun.siparis / maxSiparis) * 100}%`,
                    }}
                  >
                    {gun.siparis > 0 && (
                      <span style={styles.barValue}>{gun.siparis}</span>
                    )}
                  </div>
                </div>
                <span style={styles.barLabel}>{gun.gun}</span>
              </div>
            ))}
          </div>
          <div style={styles.chartFooter}>
            <span>Toplam: <strong>{gunlukVeriler.reduce((s, g) => s + g.siparis, 0)}</strong> sipariş</span>
            <span>Gelir: <strong>{formatPara(gunlukVeriler.reduce((s, g) => s + g.gelir, 0))}</strong></span>
          </div>
        </div>

        {/* En İyi Restoranlar */}
        <div style={styles.topRestaurants}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>🏆 En İyi Restoranlar</h3>
          </div>
          <div style={styles.restaurantList}>
            {enIyiRestoranlar.length === 0 ? (
              <div style={styles.emptyList}>Henüz restoran yok</div>
            ) : (
              enIyiRestoranlar.map((restoran, index) => (
                <div key={restoran.id} style={styles.restaurantItem}>
                  <div style={styles.rank}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </div>
                  <div style={styles.restaurantInfo}>
                    <span style={styles.restaurantName}>{restoran.ad}</span>
                    <span style={styles.restaurantCategory}>{restoran.kategori || 'Kategori yok'}</span>
                  </div>
                  <div style={styles.restaurantRating}>
                    ⭐ {restoran.puan?.toFixed(1) || '0.0'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Son Siparişler Tablosu */}
      <div style={styles.tableSection}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>📋 Son Siparişler</h3>
          <button style={styles.viewAllButton}>
            Tümünü Gör →
          </button>
        </div>
        <DataTable
          columns={siparisKolonlari}
          data={sonSiparisler}
          emptyIcon="📦"
          emptyTitle="Henüz sipariş yok"
          emptyDescription="İlk sipariş geldiğinde burada görünecek."
        />
      </div>

      {/* Hızlı Aksiyonlar */}
      <div style={styles.quickActions}>
        <h3 style={styles.cardTitle}>⚡ Hızlı İşlemler</h3>
        <div style={styles.actionButtons}>
          <button style={styles.actionButton}>
            <span style={styles.actionIcon}>🏪</span>
            <span>Yeni Restoran Ekle</span>
          </button>
          <button style={styles.actionButton}>
            <span style={styles.actionIcon}>🏷️</span>
            <span>Kategori Ekle</span>
          </button>
          <button style={styles.actionButton}>
            <span style={styles.actionIcon}>🎟️</span>
            <span>Kupon Oluştur</span>
          </button>
          <button style={styles.actionButton}>
            <span style={styles.actionIcon}>📊</span>
            <span>Rapor İndir</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  
  // Alerts
  alerts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
  },
  alertWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
  },
  alertInfo: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #93c5fd',
  },
  alertIcon: {
    fontSize: '20px',
  },

  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },

  // Middle Section
  middleSection: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '20px',
  },

  // Chart Card
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #f1f5f9',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  chart: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '180px',
    padding: '0 10px',
    gap: '12px',
  },
  chartBar: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  barWrapper: {
    width: '100%',
    height: '150px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '8px 8px 0 0',
    minHeight: '4px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    transition: 'height 0.5s ease',
  },
  barValue: {
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    marginTop: '6px',
  },
  barLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  chartFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9',
    fontSize: '13px',
    color: '#64748b',
  },

  // Top Restaurants
  topRestaurants: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #f1f5f9',
  },
  restaurantList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  restaurantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    transition: 'background-color 0.2s',
  },
  rank: {
    fontSize: '20px',
    minWidth: '32px',
    textAlign: 'center',
  },
  restaurantInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  restaurantName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  restaurantCategory: {
    fontSize: '12px',
    color: '#64748b',
  },
  restaurantRating: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f59e0b',
  },
  emptyList: {
    textAlign: 'center',
    padding: '30px',
    color: '#94a3b8',
    fontSize: '14px',
  },

  // Table Section
  tableSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #f1f5f9',
  },
  viewAllButton: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  orderId: {
    fontFamily: 'monospace',
    fontSize: '13px',
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    padding: '4px 8px',
    borderRadius: '6px',
  },

  // Quick Actions
  quickActions: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #f1f5f9',
  },
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
    border: '2px dashed #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionIcon: {
    fontSize: '20px',
  },
};

export default Dashboard;