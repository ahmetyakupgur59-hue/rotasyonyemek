// src/pages/admin/admin-components/DuyuruYonetimi.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import LoadingSpinner from './common/LoadingSpinner';
import { useToast } from './common/Toast';
import Pagination from './common/Pagination';

const DuyuruYonetimi = () => {
    const [duyurular, setDuyurular] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDuyuru, setEditingDuyuru] = useState(null);
    const [bolgeler, setBolgeler] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const toast = useToast();
    const itemsPerPage = 10;
    
    const [formData, setFormData] = useState({
        baslik: '',
        icerik: '',
        ozet: '',
        resim_url: '',
        hedef_kitle: 'hepsi',
        hedef_bolge_id: '',
        tip: 'bilgi',
        oncelik: 0,
        aktif: true,
        sabitle: false,
        baslangic_tarihi: new Date().toISOString().slice(0, 16),
        bitis_tarihi: ''
    });
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTip, setFilterTip] = useState('');
    const [stats, setStats] = useState({ toplam: 0, aktif: 0, sabitlenmis: 0 });

    // Duyuru tipleri
    const duyuruTipleri = [
        { value: 'bilgi', label: 'Bilgi', icon: 'ℹ️', color: '#3b82f6' },
        { value: 'uyari', label: 'Uyarı', icon: '⚠️', color: '#f59e0b' },
        { value: 'kampanya', label: 'Kampanya', icon: '🎁', color: '#8b5cf6' },
        { value: 'bakim', label: 'Bakım', icon: '🔧', color: '#f97316' },
        { value: 'guncelleme', label: 'Güncelleme', icon: '🔄', color: '#10b981' }
    ];

    // Hedef kitle seçenekleri
    const hedefKitleler = [
        { value: 'hepsi', label: 'Herkes', icon: '👥' },
        { value: 'musteriler', label: 'Sadece Müşteriler', icon: '🛍️' },
        { value: 'restoranlar', label: 'Sadece Restoranlar', icon: '🏪' },
        { value: 'belirli_bolge', label: 'Belirli Bölge', icon: '📍' }
    ];

    useEffect(() => {
        fetchDuyurular();
        fetchBolgeler();
    }, [searchTerm, filterTip, currentPage]);

    const fetchDuyurular = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('duyurular')
                .select('*', { count: 'exact' })
                .order('sabitle', { ascending: false })
                .order('created_at', { ascending: false });

            if (searchTerm) {
                query = query.or(`baslik.ilike.%${searchTerm}%,icerik.ilike.%${searchTerm}%`);
            }
            if (filterTip) {
                query = query.eq('tip', filterTip);
            }

            const { data, error, count } = await query
                .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
            
            if (error) throw error;

            setDuyurular(data || []);
            setTotalPages(Math.ceil((count || 0) / itemsPerPage));

            // İstatistikler
            let statsQuery = supabase.from('duyurular').select('*');
            if (searchTerm) {
                statsQuery = statsQuery.or(`baslik.ilike.%${searchTerm}%,icerik.ilike.%${searchTerm}%`);
            }
            if (filterTip) {
                statsQuery = statsQuery.eq('tip', filterTip);
            }
            const { data: allData } = await statsQuery;

            const aktifSayisi = allData?.filter(d => d.aktif).length || 0;
            const sabitSayisi = allData?.filter(d => d.sabitle).length || 0;
            setStats({
                toplam: allData?.length || 0,
                aktif: aktifSayisi,
                sabitlenmis: sabitSayisi
            });
        } catch (error) {
            console.error('Duyurular yüklenirken hata:', error);
            toast.error('Duyurular yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const fetchBolgeler = async () => {
        try {
            const { data } = await supabase
                .from('bolgeler')
                .select('*')
                .order('ad', { ascending: true });
            setBolgeler(data || []);
        } catch (error) {
            console.error('Bölgeler yüklenirken hata:', error);
            toast.error('Bölgeler yüklenirken hata oluştu');
        }
    };

    // Modal aç
    const openModal = (duyuru = null) => {
        if (duyuru) {
            setEditingDuyuru(duyuru);
            setFormData({
                baslik: duyuru.baslik || '',
                icerik: duyuru.icerik || '',
                ozet: duyuru.ozet || '',
                resim_url: duyuru.resim_url || '',
                hedef_kitle: duyuru.hedef_kitle || 'hepsi',
                hedef_bolge_id: duyuru.hedef_bolge_id || '',
                tip: duyuru.tip || 'bilgi',
                oncelik: duyuru.oncelik || 0,
                aktif: duyuru.aktif ?? true,
                sabitle: duyuru.sabitle ?? false,
                baslangic_tarihi: duyuru.baslangic_tarihi ? new Date(duyuru.baslangic_tarihi).toISOString().slice(0, 16) : '',
                bitis_tarihi: duyuru.bitis_tarihi ? new Date(duyuru.bitis_tarihi).toISOString().slice(0, 16) : ''
            });
        } else {
            setEditingDuyuru(null);
            setFormData({
                baslik: '',
                icerik: '',
                ozet: '',
                resim_url: '',
                hedef_kitle: 'hepsi',
                hedef_bolge_id: '',
                tip: 'bilgi',
                oncelik: 0,
                aktif: true,
                sabitle: false,
                baslangic_tarihi: new Date().toISOString().slice(0, 16),
                bitis_tarihi: ''
            });
        }
        setShowModal(true);
    };

    // Kaydet
    const handleSave = async () => {
        if (!formData.baslik.trim() || !formData.icerik.trim()) {
            toast.error('Başlık ve içerik zorunludur!');
            return;
        }

        try {
            setSaving(true);

            const duyuruData = {
                baslik: formData.baslik.trim(),
                icerik: formData.icerik.trim(),
                ozet: formData.ozet.trim() || null,
                resim_url: formData.resim_url.trim() || null,
                hedef_kitle: formData.hedef_kitle,
                hedef_bolge_id: formData.hedef_kitle === 'belirli_bolge' ? formData.hedef_bolge_id : null,
                tip: formData.tip,
                oncelik: parseInt(formData.oncelik) || 0,
                aktif: formData.aktif,
                sabitle: formData.sabitle,
                baslangic_tarihi: formData.baslangic_tarihi || new Date().toISOString(),
                bitis_tarihi: formData.bitis_tarihi || null,
                updated_at: new Date().toISOString()
            };

            if (editingDuyuru) {
                const { error } = await supabase
                    .from('duyurular')
                    .update(duyuruData)
                    .eq('id', editingDuyuru.id);
                if (error) throw error;
                toast.success('Duyuru güncellendi');
            } else {
                const { error } = await supabase
                    .from('duyurular')
                    .insert([duyuruData]);
                if (error) throw error;
                toast.success('Duyuru oluşturuldu');
            }

            setShowModal(false);
            setCurrentPage(1);
            fetchDuyurular();
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            toast.error('Kaydetme sırasında hata oluştu!');
        } finally {
            setSaving(false);
        }
    };

    // Sil
    const handleDelete = async (id) => {
        if (!window.confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('duyurular')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success('Duyuru silindi');
            fetchDuyurular();
        } catch (error) {
            console.error('Silme hatası:', error);
            toast.error('Silme sırasında hata oluştu');
        }
    };

    // Aktiflik değiştir
    const toggleAktif = async (duyuru) => {
        try {
            const { error } = await supabase
                .from('duyurular')
                .update({ aktif: !duyuru.aktif, updated_at: new Date().toISOString() })
                .eq('id', duyuru.id);
            if (error) throw error;
            toast.success(duyuru.aktif ? 'Duyuru pasif yapıldı' : 'Duyuru aktif yapıldı');
            fetchDuyurular();
        } catch (error) {
            console.error('Durum değiştirme hatası:', error);
            toast.error('Durum değiştirilemedi');
        }
    };

    // Sabitle/Kaldır
    const toggleSabitle = async (duyuru) => {
        try {
            const { error } = await supabase
                .from('duyurular')
                .update({ sabitle: !duyuru.sabitle, updated_at: new Date().toISOString() })
                .eq('id', duyuru.id);
            if (error) throw error;
            toast.success(duyuru.sabitle ? 'Sabitleme kaldırıldı' : 'Duyuru sabitlendi');
            fetchDuyurular();
        } catch (error) {
            console.error('Sabitleme hatası:', error);
            toast.error('Sabitleme işlemi başarısız');
        }
    };

    // Tip bilgisi
    const getTipInfo = (tip) => {
        return duyuruTipleri.find(t => t.value === tip) || duyuruTipleri[0];
    };

    // Tarih formatla
    const formatTarih = (tarih) => {
        if (!tarih) return '-';
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(tarih));
    };

    const StatCard = ({ icon, title, value, color, onClick }) => (
        <div 
            style={{ 
                ...styles.card, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                cursor: onClick ? 'pointer' : 'default'
            }} 
            onClick={onClick}
        >
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
                <p style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                    {value}
                </p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px'
                        }}>
                            📢
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                                Duyuru Yönetimi
                            </h1>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                                Kullanıcılara duyuru ve bildirimler gönderin
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => openModal()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            backgroundColor: '#f97316',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#ea580c'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
                    >
                        ➕ Yeni Duyuru
                    </button>
                </div>
            </div>

            {/* İstatistikler */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
                gap: '16px'
            }}>
                <StatCard 
                    icon="📢" 
                    title="Toplam Duyuru" 
                    value={stats.toplam}
                    color="#3b82f6"
                />
                <StatCard 
                    icon="✅" 
                    title="Aktif" 
                    value={stats.aktif}
                    color="#10b981"
                />
                <StatCard 
                    icon="📌" 
                    title="Sabitlenmiş" 
                    value={stats.sabitlenmis}
                    color="#8b5cf6"
                />
            </div>

            {/* Filtreler */}
            <div style={{
                display: 'flex',
                flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                gap: '16px',
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '18px'
                    }}>
                        🔍
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        placeholder="Duyuru ara..."
                        style={{
                            width: '100%',
                            paddingLeft: '40px',
                            paddingRight: '16px',
                            paddingTop: '10px',
                            paddingBottom: '10px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>
                <select
                    value={filterTip}
                    onChange={(e) => { setFilterTip(e.target.value); setCurrentPage(1); }}
                    style={{
                        padding: '10px 16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="">Tüm Tipler</option>
                    {duyuruTipleri.map(tip => (
                        <option key={tip.value} value={tip.value}>{tip.icon} {tip.label}</option>
                    ))}
                </select>
            </div>

            {/* Duyuru Listesi */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                {loading ? (
                    <LoadingSpinner message="Duyurular yükleniyor..." />
                ) : duyurular.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
                        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>📢</span>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Duyuru bulunamadı</h3>
                        <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Henüz duyuru eklenmemiş</p>
                        <button
                            onClick={() => openModal()}
                            style={{
                                marginTop: '16px',
                                padding: '10px 20px',
                                backgroundColor: '#f97316',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            İlk Duyuruyu Ekle
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {duyurular.map((duyuru) => {
                                const tipInfo = getTipInfo(duyuru.tip);

                                return (
                                    <div 
                                        key={duyuru.id} 
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '16px',
                                            padding: '16px',
                                            borderBottom: '1px solid #f1f5f9',
                                            backgroundColor: duyuru.sabitle ? '#f3f4f6' : 'white',
                                            borderLeft: duyuru.sabitle ? '4px solid #8b5cf6' : 'none',
                                            opacity: duyuru.aktif ? 1 : 0.6
                                        }}
                                    >
                                        {/* Resim veya İkon */}
                                        {duyuru.resim_url ? (
                                            <img 
                                                src={duyuru.resim_url} 
                                                alt={duyuru.baslik}
                                                style={{
                                                    width: '64px',
                                                    height: '64px',
                                                    objectFit: 'cover',
                                                    borderRadius: '12px',
                                                    flexShrink: 0
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                backgroundColor: `${tipInfo.color}20`,
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '24px',
                                                flexShrink: 0
                                            }}>
                                                {tipInfo.icon}
                                            </div>
                                        )}

                                        {/* İçerik */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                {duyuru.sabitle && (
                                                    <span style={{ fontSize: '14px' }}>📌</span>
                                                )}
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 12px',
                                                    borderRadius: '6px',
                                                    backgroundColor: `${tipInfo.color}20`,
                                                    color: tipInfo.color,
                                                    fontSize: '12px',
                                                    fontWeight: '600'
                                                }}>
                                                    {tipInfo.icon} {tipInfo.label}
                                                </span>
                                                {!duyuru.aktif && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        padding: '4px 12px',
                                                        borderRadius: '6px',
                                                        backgroundColor: '#f1f5f9',
                                                        color: '#64748b',
                                                        fontSize: '12px',
                                                        fontWeight: '600'
                                                    }}>
                                                        Pasif
                                                    </span>
                                                )}
                                            </div>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
                                                {duyuru.baslik}
                                            </h3>
                                            <p style={{ 
                                                margin: '6px 0 0', 
                                                fontSize: '13px', 
                                                color: '#64748b',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}>
                                                {duyuru.ozet || duyuru.icerik}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#94a3b8' }}>
                                                <span>👥 {hedefKitleler.find(h => h.value === duyuru.hedef_kitle)?.label || 'Herkes'}</span>
                                                <span>🕐 {formatTarih(duyuru.created_at)}</span>
                                                <span>👁️ {duyuru.goruntulenme_sayisi || 0} görüntülenme</span>
                                            </div>
                                        </div>

                                        {/* Aksiyonlar */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => toggleSabitle(duyuru)}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    backgroundColor: duyuru.sabitle ? '#ede9fe' : '#f1f5f9',
                                                    color: duyuru.sabitle ? '#8b5cf6' : '#94a3b8',
                                                    cursor: 'pointer',
                                                    fontSize: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title={duyuru.sabitle ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                                            >
                                                📌
                                            </button>
                                            <button
                                                onClick={() => toggleAktif(duyuru)}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#f1f5f9',
                                                    color: duyuru.aktif ? '#10b981' : '#94a3b8',
                                                    cursor: 'pointer',
                                                    fontSize: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title={duyuru.aktif ? 'Pasif Yap' : 'Aktif Yap'}
                                            >
                                                {duyuru.aktif ? '👁️' : '🚫'}
                                            </button>
                                            <button
                                                onClick={() => openModal(duyuru)}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#f1f5f9',
                                                    color: '#3b82f6',
                                                    cursor: 'pointer',
                                                    fontSize: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Düzenle"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(duyuru.id)}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#f1f5f9',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    fontSize: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Sil"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
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

            {/* Duyuru Modal */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={{ ...styles.modal, maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '20px',
                            borderBottom: '1px solid #e2e8f0'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                                {editingDuyuru ? 'Duyuru Düzenle' : 'Yeni Duyuru'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    width: '32px',
                                    height: '32px',
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

                        {/* Content */}
                        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(80vh - 140px)' }}>
                            {/* Başlık */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Başlık <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.baslik}
                                    onChange={(e) => setFormData({ ...formData, baslik: e.target.value })}
                                    placeholder="Duyuru başlığı"
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Özet */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Kısa Özet
                                </label>
                                <input
                                    type="text"
                                    value={formData.ozet}
                                    onChange={(e) => setFormData({ ...formData, ozet: e.target.value })}
                                    placeholder="Listede görünecek kısa açıklama"
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* İçerik */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    İçerik <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    value={formData.icerik}
                                    onChange={(e) => setFormData({ ...formData, icerik: e.target.value })}
                                    placeholder="Duyuru içeriği"
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        minHeight: '100px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Resim URL */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Resim URL
                                </label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        type="url"
                                        value={formData.resim_url}
                                        onChange={(e) => setFormData({ ...formData, resim_url: e.target.value })}
                                        placeholder="https://example.com/image.jpg"
                                        style={{
                                            flex: 1,
                                            padding: '10px 16px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {formData.resim_url && (
                                        <img 
                                            src={formData.resim_url} 
                                            alt="Önizleme" 
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                objectFit: 'cover',
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0'
                                            }}
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                {/* Tip */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                        Duyuru Tipi
                                    </label>
                                    <select
                                        value={formData.tip}
                                        onChange={(e) => setFormData({ ...formData, tip: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        {duyuruTipleri.map(tip => (
                                            <option key={tip.value} value={tip.value}>{tip.icon} {tip.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Hedef Kitle */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                        Hedef Kitle
                                    </label>
                                    <select
                                        value={formData.hedef_kitle}
                                        onChange={(e) => setFormData({ ...formData, hedef_kitle: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        {hedefKitleler.map(kitle => (
                                            <option key={kitle.value} value={kitle.value}>{kitle.icon} {kitle.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Bölge Seçimi */}
                            {formData.hedef_kitle === 'belirli_bolge' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                        Bölge
                                    </label>
                                    <select
                                        value={formData.hedef_bolge_id}
                                        onChange={(e) => setFormData({ ...formData, hedef_bolge_id: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <option value="">Bölge seçin</option>
                                        {bolgeler.map(bolge => (
                                            <option key={bolge.id} value={bolge.id}>{bolge.ad}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                {/* Başlangıç Tarihi */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                        Başlangıç Tarihi
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.baslangic_tarihi}
                                        onChange={(e) => setFormData({ ...formData, baslangic_tarihi: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Bitiş Tarihi */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                        Bitiş Tarihi
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.bitis_tarihi}
                                        onChange={(e) => setFormData({ ...formData, bitis_tarihi: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Checkbox'lar */}
                            <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.aktif}
                                        onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#475569' }}>Aktif</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.sabitle}
                                        onChange={(e) => setFormData({ ...formData, sabitle: e.target.checked })}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#475569' }}>Üstte Sabitle</span>
                                </label>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            padding: '16px 20px',
                            borderTop: '1px solid #e2e8f0'
                        }}>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: '10px 20px',
                                    border: '2px solid #e2e8f0',
                                    backgroundColor: 'white',
                                    color: '#475569',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 24px',
                                    backgroundColor: saving ? '#cbd5e1' : '#f97316',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.8 : 1
                                }}
                            >
                                {saving ? '⏳' : '💾'} {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    card: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
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

export default DuyuruYonetimi;
