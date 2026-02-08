// src/pages/admin/admin-components/AktiviteLoglari.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import LoadingSpinner from './common/LoadingSpinner';
import Pagination from './common/Pagination';
import { useToast } from './common/Toast';

const AktiviteLoglari = () => {
    const [loglar, setLoglar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        islem_tipi: '',
        durum: '',
        search: ''
    });
    const [selectedLog, setSelectedLog] = useState(null);
    const [stats, setStats] = useState({
        toplam: 0,
        basarili: 0,
        basarisiz: 0,
        bugun: 0
    });
    const toast = useToast();

    const ITEMS_PER_PAGE = 20;

    // İşlem tipleri
    const islemTipleri = [
        { value: 'giris', label: 'Giriş', icon: '🔓', color: '#10b981' },
        { value: 'cikis', label: 'Çıkış', icon: '🚪', color: '#6b7280' },
        { value: 'siparis', label: 'Sipariş', icon: '📦', color: '#3b82f6' },
        { value: 'restoran', label: 'Restoran', icon: '🏪', color: '#8b5cf6' },
        { value: 'kullanici', label: 'Kullanıcı', icon: '👤', color: '#6366f1' },
        { value: 'ayar', label: 'Ayar', icon: '⚙️', color: '#f59e0b' },
        { value: 'finans', label: 'Finans', icon: '💰', color: '#10b981' },
        { value: 'silme', label: 'Silme', icon: '🗑️', color: '#ef4444' },
        { value: 'ekleme', label: 'Ekleme', icon: '➕', color: '#14b8a6' },
        { value: 'guncelleme', label: 'Güncelleme', icon: '✏️', color: '#f59e0b' }
    ];

    useEffect(() => {
        fetchLoglar();
        fetchStats();
    }, [currentPage, filters]);

    const fetchLoglar = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('aktivite_loglari')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (filters.islem_tipi) {
                query = query.eq('islem_tipi', filters.islem_tipi);
            }
            if (filters.durum) {
                query = query.eq('durum', filters.durum);
            }
            if (filters.search) {
                query = query.or(`islem_detay.ilike.%${filters.search}%,kullanici_email.ilike.%${filters.search}%`);
            }

            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            setLoglar(data || []);
            setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
        } catch (error) {
            console.error('Loglar yüklenirken hata:', error);
            toast.error('Loglar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            const [toplamRes, basariliRes, basarisizRes, bugunRes] = await Promise.all([
                supabase.from('aktivite_loglari').select('*', { count: 'exact', head: true }),
                supabase.from('aktivite_loglari').select('*', { count: 'exact', head: true }).eq('durum', 'basarili'),
                supabase.from('aktivite_loglari').select('*', { count: 'exact', head: true }).eq('durum', 'basarisiz'),
                supabase.from('aktivite_loglari').select('*', { count: 'exact', head: true }).gte('created_at', today)
            ]);

            setStats({
                toplam: toplamRes.count || 0,
                basarili: basariliRes.count || 0,
                basarisiz: basarisizRes.count || 0,
                bugun: bugunRes.count || 0
            });
        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
        }
    };

    const clearFilters = () => {
        setFilters({ islem_tipi: '', durum: '', search: '' });
        setCurrentPage(1);
    };

    const getIslemInfo = (tip) => {
        return islemTipleri.find(i => i.value === tip) || { icon: '📋', color: '#6b7280', label: tip };
    };

    const getDurumInfo = (durum) => {
        const durumlar = {
            basarili: { icon: '✅', color: '#10b981', bg: '#d1fae5', label: 'Başarılı' },
            basarisiz: { icon: '❌', color: '#ef4444', bg: '#fee2e2', label: 'Başarısız' },
            uyari: { icon: '⚠️', color: '#f59e0b', bg: '#fef3c7', label: 'Uyarı' }
        };
        return durumlar[durum] || durumlar.basarili;
    };

    const formatTarih = (tarih) => {
        if (!tarih) return '-';
        const date = new Date(tarih);
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const exportCSV = () => {
        const headers = ['Tarih', 'Kullanıcı', 'İşlem Tipi', 'Detay', 'Durum', 'IP Adresi'];
        const rows = loglar.map(log => [
            formatTarih(log.created_at),
            log.kullanici_email || '-',
            log.islem_tipi,
            log.islem_detay,
            log.durum,
            log.ip_adresi || '-'
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `aktivite_loglari_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.success('CSV dosyası indirildi');
    };

    const StatCard = ({ icon, title, value, color }) => (
        <div style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: `${color}20`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                }}>
                    {icon}
                </div>
                <div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{title}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: '700', color: color }}>
                        {value.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px'
                        }}>
                            📋
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                                Aktivite Logları
                            </h1>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                                Sistemdeki tüm işlemleri takip edin
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={fetchLoglar} style={{ ...styles.button, backgroundColor: '#f1f5f9', color: '#475569' }}>
                            🔄 Yenile
                        </button>
                        <button onClick={exportCSV} style={{ ...styles.button, backgroundColor: '#10b981', color: 'white' }}>
                            📥 CSV İndir
                        </button>
                    </div>
                </div>
            </div>

            {/* İstatistikler */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <StatCard icon="📊" title="Toplam Log" value={stats.toplam} color="#3b82f6" />
                <StatCard icon="✅" title="Başarılı" value={stats.basarili} color="#10b981" />
                <StatCard icon="❌" title="Başarısız" value={stats.basarisiz} color="#ef4444" />
                <StatCard icon="📅" title="Bugün" value={stats.bugun} color="#f59e0b" />
            </div>

            {/* Filtreler */}
            <div style={styles.card}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="🔍 İşlem detayı veya email ara..."
                            style={styles.input}
                        />
                    </div>
                    <select
                        value={filters.islem_tipi}
                        onChange={(e) => setFilters({ ...filters, islem_tipi: e.target.value })}
                        style={{ ...styles.input, width: '180px' }}
                    >
                        <option value="">Tüm İşlemler</option>
                        {islemTipleri.map(tip => (
                            <option key={tip.value} value={tip.value}>{tip.icon} {tip.label}</option>
                        ))}
                    </select>
                    <select
                        value={filters.durum}
                        onChange={(e) => setFilters({ ...filters, durum: e.target.value })}
                        style={{ ...styles.input, width: '150px' }}
                    >
                        <option value="">Tüm Durumlar</option>
                        <option value="basarili">✅ Başarılı</option>
                        <option value="basarisiz">❌ Başarısız</option>
                        <option value="uyari">⚠️ Uyarı</option>
                    </select>
                    {(filters.islem_tipi || filters.durum || filters.search) && (
                        <button onClick={clearFilters} style={{ ...styles.button, backgroundColor: '#fee2e2', color: '#ef4444' }}>
                            ✕ Temizle
                        </button>
                    )}
                </div>
            </div>

            {/* Log Listesi */}
            <div style={styles.card}>
                {loading ? (
                    <LoadingSpinner message="Loglar yükleniyor..." />
                ) : loglar.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>📋</span>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Log bulunamadı</h3>
                        <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Filtreleri değiştirmeyi deneyin</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        <th style={styles.th}>Tarih</th>
                                        <th style={styles.th}>Kullanıcı</th>
                                        <th style={styles.th}>İşlem</th>
                                        <th style={styles.th}>Detay</th>
                                        <th style={styles.th}>Durum</th>
                                        <th style={styles.th}>IP</th>
                                        <th style={styles.th}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loglar.map((log) => {
                                        const islemInfo = getIslemInfo(log.islem_tipi);
                                        const durumInfo = getDurumInfo(log.durum);

                                        return (
                                            <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: '#94a3b8' }}>🕐</span>
                                                        <span style={{ fontSize: '13px', color: '#1e293b' }}>
                                                            {formatTarih(log.created_at)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            backgroundColor: '#f1f5f9',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px'
                                                        }}>
                                                            👤
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>
                                                                {log.kullanici_email || 'Sistem'}
                                                            </p>
                                                            {log.kullanici_rol && (
                                                                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                                                                    {log.kullanici_rol}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '4px 12px',
                                                        borderRadius: '8px',
                                                        backgroundColor: `${islemInfo.color}15`,
                                                        color: islemInfo.color,
                                                        fontSize: '12px',
                                                        fontWeight: '500'
                                                    }}>
                                                        {islemInfo.icon} {islemInfo.label}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <p style={{ 
                                                        margin: 0, 
                                                        fontSize: '13px', 
                                                        color: '#475569',
                                                        maxWidth: '250px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }} title={log.islem_detay}>
                                                        {log.islem_detay}
                                                    </p>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        backgroundColor: durumInfo.bg,
                                                        color: durumInfo.color,
                                                        fontSize: '12px',
                                                        fontWeight: '500'
                                                    }}>
                                                        {durumInfo.icon} {durumInfo.label}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                                                        {log.ip_adresi || '-'}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <button
                                                        onClick={() => setSelectedLog(log)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#f1f5f9',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            color: '#3b82f6',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        👁️ Detay
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Log Detay Modal */}
            {selectedLog && (
                <div style={styles.modalOverlay} onClick={() => setSelectedLog(null)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            paddingBottom: '16px',
                            borderBottom: '1px solid #e2e8f0',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>📋 Log Detayı</h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    border: 'none',
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Tarih</span>
                                <span style={styles.detailValue}>{formatTarih(selectedLog.created_at)}</span>
                            </div>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Kullanıcı</span>
                                <span style={styles.detailValue}>{selectedLog.kullanici_email || 'Sistem'}</span>
                            </div>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>İşlem Tipi</span>
                                <span style={styles.detailValue}>{selectedLog.islem_tipi}</span>
                            </div>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Durum</span>
                                <span style={styles.detailValue}>{selectedLog.durum}</span>
                            </div>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>IP Adresi</span>
                                <span style={{ ...styles.detailValue, fontFamily: 'monospace' }}>
                                    {selectedLog.ip_adresi || '-'}
                                </span>
                            </div>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Tablo</span>
                                <span style={styles.detailValue}>{selectedLog.tablo_adi || '-'}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <span style={styles.detailLabel}>İşlem Detayı</span>
                            <p style={{
                                margin: '8px 0 0',
                                padding: '12px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                fontSize: '13px',
                                lineHeight: '1.5'
                            }}>
                                {selectedLog.islem_detay}
                            </p>
                        </div>

                        {selectedLog.tarayici && (
                            <div style={{ marginTop: '16px' }}>
                                <span style={styles.detailLabel}>Tarayıcı</span>
                                <p style={{
                                    margin: '8px 0 0',
                                    padding: '12px',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-all'
                                }}>
                                    {selectedLog.tarayici}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Stiller
const styles = {
    card: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    input: {
        padding: '10px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    th: {
        padding: '14px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '2px solid #e2e8f0'
    },
    td: {
        padding: '14px 16px',
        verticalAlign: 'middle'
    },
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
        zIndex: 9999,
        padding: '20px'
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    detailLabel: {
        fontSize: '12px',
        fontWeight: '500',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    detailValue: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#1e293b'
    }
};

export default AktiviteLoglari;
