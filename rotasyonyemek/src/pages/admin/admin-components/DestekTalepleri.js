// src/pages/admin/admin-components/DestekTalepleri.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import LoadingSpinner from './common/LoadingSpinner';
import Pagination from './common/Pagination';
import { useToast } from './common/Toast';

const DestekTalepleri = () => {
    const [talepler, setTalepler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedTalep, setSelectedTalep] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [mesajlar, setMesajlar] = useState([]);
    const [yeniMesaj, setYeniMesaj] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [hazirCevaplar, setHazirCevaplar] = useState([]);
    const [showHazirCevaplar, setShowHazirCevaplar] = useState(false);
    const [filters, setFilters] = useState({
        durum: '',
        kategori: '',
        oncelik: '',
        search: ''
    });
    const [stats, setStats] = useState({
        toplam: 0,
        acik: 0,
        beklemede: 0,
        cozuldu: 0
    });
    const toast = useToast();

    const ITEMS_PER_PAGE = 15;

    // Kategoriler
    const kategoriler = [
        { value: 'siparis', label: 'Sipariş', icon: '📦', color: '#3b82f6' },
        { value: 'restoran', label: 'Restoran', icon: '🏪', color: '#8b5cf6' },
        { value: 'odeme', label: 'Ödeme', icon: '💳', color: '#10b981' },
        { value: 'teknik', label: 'Teknik', icon: '🔧', color: '#f59e0b' },
        { value: 'oneri', label: 'Öneri', icon: '💡', color: '#14b8a6' },
        { value: 'sikayet', label: 'Şikayet', icon: '😤', color: '#ef4444' },
        { value: 'diger', label: 'Diğer', icon: '📝', color: '#6b7280' }
    ];

    // Öncelikler
    const oncelikler = [
        { value: 'dusuk', label: 'Düşük', color: '#6b7280' },
        { value: 'normal', label: 'Normal', color: '#3b82f6' },
        { value: 'yuksek', label: 'Yüksek', color: '#f59e0b' },
        { value: 'acil', label: 'Acil', color: '#ef4444' }
    ];

    // Durumlar
    const durumlar = [
        { value: 'acik', label: 'Açık', icon: '📬', color: '#3b82f6', bg: '#dbeafe' },
        { value: 'inceleniyor', label: 'İnceleniyor', icon: '👀', color: '#f59e0b', bg: '#fef3c7' },
        { value: 'beklemede', label: 'Beklemede', icon: '⏳', color: '#f97316', bg: '#ffedd5' },
        { value: 'cozuldu', label: 'Çözüldü', icon: '✅', color: '#10b981', bg: '#d1fae5' },
        { value: 'kapali', label: 'Kapalı', icon: '🔒', color: '#6b7280', bg: '#f3f4f6' }
    ];

    useEffect(() => {
        fetchTalepler();
        fetchStats();
        fetchHazirCevaplar();
    }, [currentPage, filters]);

    const fetchTalepler = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('destek_talepleri')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (filters.durum) query = query.eq('durum', filters.durum);
            if (filters.kategori) query = query.eq('kategori', filters.kategori);
            if (filters.oncelik) query = query.eq('oncelik', filters.oncelik);
            if (filters.search) {
                query = query.or(`talep_no.ilike.%${filters.search}%,konu.ilike.%${filters.search}%,kullanici_email.ilike.%${filters.search}%`);
            }

            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            setTalepler(data || []);
            setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
        } catch (error) {
            console.error('Talepler yüklenirken hata:', error);
            toast.error('Talepler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const [toplamRes, acikRes, beklemedRes, cozulduRes] = await Promise.all([
                supabase.from('destek_talepleri').select('*', { count: 'exact', head: true }),
                supabase.from('destek_talepleri').select('*', { count: 'exact', head: true }).eq('durum', 'acik'),
                supabase.from('destek_talepleri').select('*', { count: 'exact', head: true }).eq('durum', 'beklemede'),
                supabase.from('destek_talepleri').select('*', { count: 'exact', head: true }).eq('durum', 'cozuldu')
            ]);

            setStats({
                toplam: toplamRes.count || 0,
                acik: acikRes.count || 0,
                beklemede: beklemedRes.count || 0,
                cozuldu: cozulduRes.count || 0
            });
        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
        }
    };

    const fetchHazirCevaplar = async () => {
        try {
            const { data } = await supabase
                .from('hazir_cevaplar')
                .select('*')
                .eq('aktif', true)
                .order('kullanim_sayisi', { ascending: false });
            
            setHazirCevaplar(data || []);
        } catch (error) {
            console.error('Hazır cevaplar yüklenirken hata:', error);
        }
    };

    const fetchMesajlar = async (talepId) => {
        try {
            const { data } = await supabase
                .from('destek_mesajlari')
                .select('*')
                .eq('talep_id', talepId)
                .order('created_at', { ascending: true });
            
            setMesajlar(data || []);
        } catch (error) {
            console.error('Mesajlar yüklenirken hata:', error);
        }
    };

    // Talep detayını aç
    const openTalepDetail = async (talep) => {
        setSelectedTalep(talep);
        setShowDetailModal(true);
        await fetchMesajlar(talep.id);
        
        // Eğer talep açık ise, inceleniyor yap
        if (talep.durum === 'acik') {
            await updateTalepDurum(talep.id, 'inceleniyor');
        }
    };

    // Mesaj gönder
    const sendMessage = async () => {
        if (!yeniMesaj.trim() || !selectedTalep) return;

        try {
            setSendingMessage(true);

            const { error } = await supabase
                .from('destek_mesajlari')
                .insert({
                    talep_id: selectedTalep.id,
                    gonderen_rol: 'admin',
                    gonderen_adi: 'Destek Ekibi',
                    mesaj: yeniMesaj.trim()
                });

            if (error) throw error;

            // Talep durumunu güncelle
            await supabase
                .from('destek_talepleri')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', selectedTalep.id);

            setYeniMesaj('');
            await fetchMesajlar(selectedTalep.id);
        } catch (error) {
            console.error('Mesaj gönderilirken hata:', error);
        } finally {
            setSendingMessage(false);
        }
    };

    const useHazirCevap = async (cevap) => {
        setYeniMesaj(cevap.icerik);
        setShowHazirCevaplar(false);

        await supabase
            .from('hazir_cevaplar')
            .update({ kullanim_sayisi: (cevap.kullanim_sayisi || 0) + 1 })
            .eq('id', cevap.id);
    };

    // Durum güncelle
    const updateTalepDurum = async (talepId, yeniDurum) => {
        try {
            const updates = { 
                durum: yeniDurum,
                updated_at: new Date().toISOString()
            };

            if (yeniDurum === 'cozuldu') {
                updates.cozum_tarihi = new Date().toISOString();
            }

            await supabase
                .from('destek_talepleri')
                .update(updates)
                .eq('id', talepId);

            // Listeyi güncelle
            setTalepler(prev => prev.map(t => 
                t.id === talepId ? { ...t, ...updates } : t
            ));

            if (selectedTalep?.id === talepId) {
                setSelectedTalep(prev => ({ ...prev, ...updates }));
            }

            fetchStats();
        } catch (error) {
            console.error('Durum güncellenirken hata:', error);
        }
    };

    // Tarihi formatla
    const formatTarih = (tarih) => {
        if (!tarih) return '-';
        const date = new Date(tarih);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes} dakika önce`;
        if (hours < 24) return `${hours} saat önce`;
        if (days < 7) return `${days} gün önce`;
        
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };


    // Kategori bilgisi
    const getKategoriInfo = (kategori) => {
        return kategoriler.find(k => k.value === kategori) || kategoriler[6];
    };

    // Öncelik bilgisi
    const getOncelikInfo = (oncelik) => {
        return oncelikler.find(o => o.value === oncelik) || oncelikler[1];
    };

    // Durum bilgisi
    const getDurumInfo = (durum) => {
        return durumlar.find(d => d.value === durum) || durumlar[0];
    };

    // Filtreleri temizle
    const clearFilters = () => {
        setFilters({ durum: '', kategori: '', oncelik: '', search: '' });
        setCurrentPage(1);
    };

    const StatCard = ({ icon, title, value, color, onClick }) => (
        <div 
            style={{ ...styles.card, cursor: onClick ? 'pointer' : 'default' }}
            onClick={onClick}
        >
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
                    <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: '700', color }}>
                        {value}
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
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px'
                        }}>
                            🎧
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                                Destek Talepleri
                            </h1>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                                Müşteri ve restoran destek taleplerini yönetin
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { fetchTalepler(); fetchStats(); }}
                        style={{ ...styles.button, backgroundColor: '#f1f5f9', color: '#475569' }}
                    >
                        🔄 Yenile
                    </button>
                </div>
            </div>

            {/* İstatistikler */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <StatCard icon="📬" title="Toplam Talep" value={stats.toplam} color="#3b82f6" />
                <StatCard 
                    icon="🔔" 
                    title="Açık" 
                    value={stats.acik} 
                    color="#3b82f6"
                    onClick={() => setFilters({ ...filters, durum: 'acik' })}
                />
                <StatCard 
                    icon="⏳" 
                    title="Beklemede" 
                    value={stats.beklemede} 
                    color="#f97316"
                    onClick={() => setFilters({ ...filters, durum: 'beklemede' })}
                />
                <StatCard 
                    icon="✅" 
                    title="Çözüldü" 
                    value={stats.cozuldu} 
                    color="#10b981"
                    onClick={() => setFilters({ ...filters, durum: 'cozuldu' })}
                />
            </div>

            {/* Filtreler */}
            <div style={styles.card}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="🔍 Talep no, konu veya email ara..."
                            style={styles.input}
                        />
                    </div>
                    <select
                        value={filters.durum}
                        onChange={(e) => setFilters({ ...filters, durum: e.target.value })}
                        style={{ ...styles.input, width: '160px' }}
                    >
                        <option value="">Tüm Durumlar</option>
                        {durumlar.map(d => (
                            <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                        ))}
                    </select>
                    <select
                        value={filters.kategori}
                        onChange={(e) => setFilters({ ...filters, kategori: e.target.value })}
                        style={{ ...styles.input, width: '160px' }}
                    >
                        <option value="">Tüm Kategoriler</option>
                        {kategoriler.map(k => (
                            <option key={k.value} value={k.value}>{k.icon} {k.label}</option>
                        ))}
                    </select>
                    <select
                        value={filters.oncelik}
                        onChange={(e) => setFilters({ ...filters, oncelik: e.target.value })}
                        style={{ ...styles.input, width: '150px' }}
                    >
                        <option value="">Tüm Öncelikler</option>
                        {oncelikler.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {(filters.durum || filters.kategori || filters.oncelik || filters.search) && (
                        <button 
                            onClick={clearFilters} 
                            style={{ ...styles.button, backgroundColor: '#fee2e2', color: '#ef4444' }}
                        >
                            ✕ Temizle
                        </button>
                    )}
                </div>
            </div>

            {/* Talep Listesi */}
            <div style={styles.card}>
                {loading ? (
                    <LoadingSpinner message="Talepler yükleniyor..." />
                ) : talepler.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>🎧</span>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Talep bulunamadı</h3>
                        <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Henüz destek talebi yok veya filtreleri değiştirin</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {talepler.map((talep) => {
                                const kategoriInfo = getKategoriInfo(talep.kategori);
                                const oncelikInfo = getOncelikInfo(talep.oncelik);
                                const durumInfo = getDurumInfo(talep.durum);

                                return (
                                    <div 
                                        key={talep.id}
                                        onClick={() => openTalepDetail(talep)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '16px',
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: `2px solid ${talep.durum === 'acik' ? '#bfdbfe' : '#f1f5f9'}`,
                                            backgroundColor: talep.durum === 'acik' ? '#eff6ff' : '#fafafa',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            borderLeft: talep.oncelik === 'acil' ? '4px solid #ef4444' : undefined
                                        }}
                                    >
                                        {/* İkon */}
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            backgroundColor: `${kategoriInfo.color}20`,
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            flexShrink: 0
                                        }}>
                                            {kategoriInfo.icon}
                                        </div>

                                        {/* İçerik */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                                <span style={{ 
                                                    fontSize: '12px', 
                                                    fontFamily: 'monospace', 
                                                    color: '#64748b',
                                                    backgroundColor: '#f1f5f9',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {talep.talep_no}
                                                </span>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '3px 10px',
                                                    borderRadius: '6px',
                                                    backgroundColor: durumInfo.bg,
                                                    color: durumInfo.color,
                                                    fontSize: '11px',
                                                    fontWeight: '600'
                                                }}>
                                                    {durumInfo.icon} {durumInfo.label}
                                                </span>
                                                <span style={{
                                                    padding: '3px 10px',
                                                    borderRadius: '6px',
                                                    backgroundColor: `${oncelikInfo.color}20`,
                                                    color: oncelikInfo.color,
                                                    fontSize: '11px',
                                                    fontWeight: '600'
                                                }}>
                                                    {oncelikInfo.label}
                                                </span>
                                            </div>
                                            <h3 style={{ 
                                                margin: 0, 
                                                fontSize: '15px', 
                                                fontWeight: '600', 
                                                color: '#1e293b',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {talep.konu}
                                            </h3>
                                            <p style={{ 
                                                margin: '6px 0 0', 
                                                fontSize: '13px', 
                                                color: '#64748b',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {talep.mesaj}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94a3b8' }}>
                                                    👤 {talep.kullanici_adi || talep.kullanici_email || 'Anonim'}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94a3b8' }}>
                                                    🕐 {formatTarih(talep.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Ok */}
                                        <span style={{ fontSize: '20px', color: '#cbd5e1' }}>→</span>
                                    </div>
                                );
                            })}
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

            {/* Talep Detay Modal */}
            {showDetailModal && selectedTalep && (
                <div style={styles.modalOverlay} onClick={() => { setShowDetailModal(false); setSelectedTalep(null); }}>
                    <div style={{ ...styles.modal, maxWidth: '900px', display: 'flex', height: '80vh' }} onClick={e => e.stopPropagation()}>
                        {/* Sol: Mesajlar */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>
                            {/* Header */}
                            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ 
                                        fontSize: '12px', 
                                        fontFamily: 'monospace', 
                                        color: '#64748b',
                                        backgroundColor: '#f1f5f9',
                                        padding: '2px 8px',
                                        borderRadius: '4px'
                                    }}>
                                        {selectedTalep.talep_no}
                                    </span>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                                    {selectedTalep.konu}
                                </h3>
                            </div>

                            {/* Mesajlar */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                                {/* İlk mesaj */}
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        backgroundColor: '#f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        flexShrink: 0
                                    }}>
                                        👤
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                                {selectedTalep.kullanici_adi || 'Müşteri'}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                {formatTarih(selectedTalep.created_at)}
                                            </span>
                                        </div>
                                        <div style={{
                                            padding: '12px 16px',
                                            backgroundColor: '#f1f5f9',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            color: '#1e293b',
                                            lineHeight: '1.5'
                                        }}>
                                            {selectedTalep.mesaj}
                                        </div>
                                    </div>
                                </div>

                                {/* Diğer mesajlar */}
                                {mesajlar.map((mesaj) => (
                                    <div 
                                        key={mesaj.id} 
                                        style={{ 
                                            display: 'flex', 
                                            gap: '12px', 
                                            marginBottom: '16px',
                                            flexDirection: mesaj.gonderen_rol === 'admin' ? 'row-reverse' : 'row'
                                        }}
                                    >
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            backgroundColor: mesaj.gonderen_rol === 'admin' ? '#ede9fe' : '#f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '16px',
                                            flexShrink: 0
                                        }}>
                                            {mesaj.gonderen_rol === 'admin' ? '🎧' : '👤'}
                                        </div>
                                        <div style={{ 
                                            flex: 1,
                                            textAlign: mesaj.gonderen_rol === 'admin' ? 'right' : 'left'
                                        }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px', 
                                                marginBottom: '6px',
                                                justifyContent: mesaj.gonderen_rol === 'admin' ? 'flex-end' : 'flex-start'
                                            }}>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                                    {mesaj.gonderen_adi || (mesaj.gonderen_rol === 'admin' ? 'Destek Ekibi' : 'Müşteri')}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                    {formatTarih(mesaj.created_at)}
                                                </span>
                                            </div>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '12px 16px',
                                                backgroundColor: mesaj.gonderen_rol === 'admin' ? '#ede9fe' : '#f1f5f9',
                                                color: mesaj.gonderen_rol === 'admin' ? '#6d28d9' : '#1e293b',
                                                borderRadius: '12px',
                                                fontSize: '14px',
                                                lineHeight: '1.5',
                                                maxWidth: '80%',
                                                textAlign: 'left'
                                            }}>
                                                {mesaj.mesaj}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Mesaj Gönderme */}
                            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <textarea
                                            value={yeniMesaj}
                                            onChange={(e) => setYeniMesaj(e.target.value)}
                                            placeholder="Mesajınızı yazın..."
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: '12px',
                                                fontSize: '14px',
                                                resize: 'none',
                                                minHeight: '80px',
                                                outline: 'none'
                                            }}
                                        />
                                        <button
                                            onClick={() => setShowHazirCevaplar(!showHazirCevaplar)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                bottom: '12px',
                                                background: 'none',
                                                border: 'none',
                                                fontSize: '18px',
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                            title="Hazır cevaplar"
                                        >
                                            📝
                                        </button>

                                        {/* Hazır Cevaplar */}
                                        {showHazirCevaplar && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '100%',
                                                right: 0,
                                                marginBottom: '8px',
                                                width: '300px',
                                                backgroundColor: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                                maxHeight: '200px',
                                                overflowY: 'auto'
                                            }}>
                                                <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Hazır Cevaplar</span>
                                                </div>
                                                {hazirCevaplar.map(cevap => (
                                                    <button
                                                        key={cevap.id}
                                                        onClick={() => applyHazirCevap(cevap)}
                                                        style={{
                                                            width: '100%',
                                                            textAlign: 'left',
                                                            padding: '12px',
                                                            border: 'none',
                                                            borderBottom: '1px solid #f1f5f9',
                                                            backgroundColor: 'transparent',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{cevap.baslik}</p>
                                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {cevap.icerik}
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={sendMessage}
                                        disabled={!yeniMesaj.trim() || sendingMessage}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            backgroundColor: yeniMesaj.trim() ? '#8b5cf6' : '#e2e8f0',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '18px',
                                            cursor: yeniMesaj.trim() ? 'pointer' : 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            alignSelf: 'flex-end'
                                        }}
                                    >
                                        {sendingMessage ? '⏳' : '📤'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sağ: Detaylar */}
                        <div style={{ width: '280px', overflowY: 'auto', padding: '20px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Talep Bilgileri</h4>
                                <button
                                    onClick={() => { setShowDetailModal(false); setSelectedTalep(null); }}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        border: 'none',
                                        backgroundColor: '#f1f5f9',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Durum Değiştir */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                                    Durum
                                </label>
                                <select
                                    value={selectedTalep.durum}
                                    onChange={(e) => updateTalepDurum(selectedTalep.id, e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {durumlar.map(d => (
                                        <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Bilgiler */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Kategori</span>
                                    <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                                        {getKategoriInfo(selectedTalep.kategori).icon} {getKategoriInfo(selectedTalep.kategori).label}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Öncelik</span>
                                    <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '500', color: getOncelikInfo(selectedTalep.oncelik).color }}>
                                        {getOncelikInfo(selectedTalep.oncelik).label}
                                    </p>
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

                                <div>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Müşteri</span>
                                    {selectedTalep.kullanici_adi && (
                                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b' }}>
                                            👤 {selectedTalep.kullanici_adi}
                                        </p>
                                    )}
                                    {selectedTalep.kullanici_email && (
                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#3b82f6' }}>
                                            📧 {selectedTalep.kullanici_email}
                                        </p>
                                    )}
                                    {selectedTalep.kullanici_telefon && (
                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#3b82f6' }}>
                                            📞 {selectedTalep.kullanici_telefon}
                                        </p>
                                    )}
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

                                <div>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Oluşturulma</span>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#1e293b' }}>
                                        {formatTarih(selectedTalep.created_at)}
                                    </p>
                                </div>

                                {selectedTalep.cozum_tarihi && (
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Çözüm Tarihi</span>
                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#10b981' }}>
                                            {formatTarih(selectedTalep.cozum_tarihi)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Hızlı İşlemler */}
                            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedTalep.durum !== 'cozuldu' && (
                                    <button
                                        onClick={() => updateTalepDurum(selectedTalep.id, 'cozuldu')}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✅ Çözüldü Olarak İşaretle
                                    </button>
                                )}
                                {selectedTalep.durum !== 'kapali' && (
                                    <button
                                        onClick={() => updateTalepDurum(selectedTalep.id, 'kapali')}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: '#f1f5f9',
                                            color: '#64748b',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🔒 Talebi Kapat
                                    </button>
                                )}
                            </div>
                        </div>
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
        width: '100%',
        padding: '10px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none'
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
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
    }
};

export default DestekTalepleri;
