// src/pages/admin/admin-components/SistemAyarlari.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import LoadingSpinner from './common/LoadingSpinner';
import { useToast } from './common/Toast';

const SistemAyarlari = () => {
    const [ayarlar, setAyarlar] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('site');
    const [hasChanges, setHasChanges] = useState(false);
    const toast = useToast();

    // Kategoriler
    const kategoriler = [
        { id: 'site', ad: 'Site Bilgileri', icon: '🌐', renk: '#3b82f6' },
        { id: 'iletisim', ad: 'İletişim', icon: '📞', renk: '#10b981' },
        { id: 'sosyal_medya', ad: 'Sosyal Medya', icon: '📱', renk: '#8b5cf6' },
        { id: 'siparis', ad: 'Sipariş Ayarları', icon: '🛒', renk: '#f59e0b' },
        { id: 'komisyon', ad: 'Komisyon & Vergi', icon: '💰', renk: '#ef4444' },
        { id: 'bildirim', ad: 'Bildirimler', icon: '🔔', renk: '#eab308' },
        { id: 'sistem', ad: 'Sistem', icon: '🛡️', renk: '#6b7280' }
    ];

    useEffect(() => {
        fetchAyarlar();
    }, []);

    const fetchAyarlar = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('sistem_ayarlari')
                .select('*')
                .order('kategori', { ascending: true });

            if (error) throw error;

            const ayarlarObj = {};
            data?.forEach(ayar => {
                if (!ayarlarObj[ayar.kategori]) {
                    ayarlarObj[ayar.kategori] = {};
                }
                ayarlarObj[ayar.kategori][ayar.anahtar] = {
                    ...ayar,
                    originalDeger: ayar.deger
                };
            });
            setAyarlar(ayarlarObj);
        } catch (error) {
            console.error('Ayarlar yüklenirken hata:', error);
            toast.error('Ayarlar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (kategori, anahtar, yeniDeger) => {
        setAyarlar(prev => ({
            ...prev,
            [kategori]: {
                ...prev[kategori],
                [anahtar]: {
                    ...prev[kategori][anahtar],
                    deger: yeniDeger
                }
            }
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            const updates = [];
            Object.keys(ayarlar).forEach(kategori => {
                Object.keys(ayarlar[kategori]).forEach(anahtar => {
                    const ayar = ayarlar[kategori][anahtar];
                    if (ayar.deger !== ayar.originalDeger) {
                        updates.push({
                            id: ayar.id,
                            deger: ayar.deger,
                            updated_at: new Date().toISOString()
                        });
                    }
                });
            });

            if (updates.length === 0) {
                toast.info('Değişiklik yapılmadı');
                return;
            }

            for (const update of updates) {
                const { error } = await supabase
                    .from('sistem_ayarlari')
                    .update({ deger: update.deger, updated_at: update.updated_at })
                    .eq('id', update.id);
                
                if (error) throw error;
            }

            toast.success(`${updates.length} ayar başarıyla kaydedildi`);
            setHasChanges(false);
            fetchAyarlar();
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            toast.error('Ayarlar kaydedilirken hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        fetchAyarlar();
        setHasChanges(false);
    };

    const renderInput = (ayar, kategori) => {
        const { anahtar, deger, tip } = ayar;

        const inputStyle = {
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '14px',
            transition: 'all 0.2s',
            outline: 'none',
            backgroundColor: '#fff'
        };

        switch (tip) {
            case 'boolean':
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => handleChange(kategori, anahtar, deger === 'true' ? 'false' : 'true')}
                            style={{
                                width: '56px',
                                height: '28px',
                                borderRadius: '14px',
                                border: 'none',
                                backgroundColor: deger === 'true' ? '#10b981' : '#cbd5e1',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.3s'
                            }}
                        >
                            <span style={{
                                position: 'absolute',
                                top: '2px',
                                left: deger === 'true' ? '30px' : '2px',
                                width: '24px',
                                height: '24px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                transition: 'left 0.3s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </button>
                        <span style={{ 
                            fontSize: '14px', 
                            color: deger === 'true' ? '#10b981' : '#64748b',
                            fontWeight: '500'
                        }}>
                            {deger === 'true' ? 'Aktif' : 'Pasif'}
                        </span>
                    </div>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={deger || ''}
                        onChange={(e) => handleChange(kategori, anahtar, e.target.value)}
                        style={inputStyle}
                    />
                );

            case 'image':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                            type="url"
                            value={deger || ''}
                            onChange={(e) => handleChange(kategori, anahtar, e.target.value)}
                            placeholder="https://example.com/image.png"
                            style={inputStyle}
                        />
                        {deger && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img 
                                    src={deger} 
                                    alt="Önizleme" 
                                    style={{ 
                                        height: '40px', 
                                        width: '40px', 
                                        objectFit: 'contain', 
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '8px',
                                        backgroundColor: '#f8fafc'
                                    }}
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                                <span style={{ fontSize: '12px', color: '#64748b' }}>Önizleme</span>
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <input
                        type="text"
                        value={deger || ''}
                        onChange={(e) => handleChange(kategori, anahtar, e.target.value)}
                        style={inputStyle}
                    />
                );
        }
    };

    if (loading) {
        return <LoadingSpinner message="Sistem ayarları yükleniyor..." />;
    }

    const aktifKategori = kategoriler.find(k => k.id === activeTab);
    const aktifAyarlar = ayarlar[activeTab] || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px'
                        }}>
                            ⚙️
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                                Sistem Ayarları
                            </h1>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                                Platform ayarlarını buradan yönetebilirsiniz
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {hasChanges && (
                            <button
                                onClick={handleCancel}
                                style={{
                                    ...styles.button,
                                    backgroundColor: 'white',
                                    color: '#64748b',
                                    border: '2px solid #e2e8f0'
                                }}
                            >
                                ✕ İptal
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            style={{
                                ...styles.button,
                                backgroundColor: hasChanges ? '#3b82f6' : '#cbd5e1',
                                color: 'white',
                                cursor: hasChanges ? 'pointer' : 'not-allowed',
                                opacity: hasChanges ? 1 : 0.7
                            }}
                        >
                            {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Değişiklik Uyarısı */}
            {hasChanges && (
                <div style={{
                    ...styles.card,
                    backgroundColor: '#fef3c7',
                    borderColor: '#fcd34d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                        Kaydedilmemiş değişiklikler var. Sayfadan ayrılmadan önce kaydetmeyi unutmayın.
                    </p>
                </div>
            )}

            {/* Ana İçerik */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* Sol Menü */}
                <div style={{ width: '260px', flexShrink: 0 }}>
                    <div style={styles.card}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Kategoriler
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {kategoriler.map((kategori) => {
                                const isActive = activeTab === kategori.id;
                                const kategoriAyarlar = ayarlar[kategori.id] || {};
                                const degismisAyarSayisi = Object.values(kategoriAyarlar).filter(
                                    a => a.deger !== a.originalDeger
                                ).length;

                                return (
                                    <button
                                        key={kategori.id}
                                        onClick={() => setActiveTab(kategori.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                            padding: '12px 16px',
                                            border: isActive ? `2px solid ${kategori.renk}` : '2px solid transparent',
                                            borderRadius: '12px',
                                            backgroundColor: isActive ? `${kategori.renk}15` : 'transparent',
                                            color: isActive ? kategori.renk : '#475569',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontSize: '14px',
                                            fontWeight: isActive ? '600' : '500',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '18px' }}>{kategori.icon}</span>
                                            <span>{kategori.ad}</span>
                                        </div>
                                        {degismisAyarSayisi > 0 && (
                                            <span style={{
                                                backgroundColor: '#f97316',
                                                color: 'white',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                padding: '2px 8px',
                                                borderRadius: '10px'
                                            }}>
                                                {degismisAyarSayisi}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sağ İçerik */}
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={styles.card}>
                        {/* Kategori Başlığı */}
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            paddingBottom: '20px',
                            borderBottom: '2px solid #f1f5f9',
                            marginBottom: '24px'
                        }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                backgroundColor: `${aktifKategori?.renk}20`,
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '22px'
                            }}>
                                {aktifKategori?.icon}
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                                    {aktifKategori?.ad}
                                </h2>
                                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                                    {Object.keys(aktifAyarlar).length} ayar
                                </p>
                            </div>
                        </div>

                        {/* Ayar Listesi */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {Object.keys(aktifAyarlar).length === 0 ? (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '48px 24px',
                                    color: '#94a3b8'
                                }}>
                                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⚙️</span>
                                    <p style={{ margin: 0, fontSize: '16px' }}>Bu kategoride ayar bulunmuyor</p>
                                </div>
                            ) : (
                                Object.entries(aktifAyarlar).map(([anahtar, ayar]) => {
                                    const isChanged = ayar.deger !== ayar.originalDeger;

                                    return (
                                        <div 
                                            key={anahtar} 
                                            style={{
                                                padding: '20px',
                                                borderRadius: '12px',
                                                border: isChanged ? '2px solid #f97316' : '2px solid #f1f5f9',
                                                backgroundColor: isChanged ? '#fff7ed' : '#fafafa'
                                            }}
                                        >
                                            <div style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column',
                                                gap: '12px'
                                            }}>
                                                <div>
                                                    <label style={{ 
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: '#1e293b'
                                                    }}>
                                                        {ayar.aciklama || anahtar}
                                                        {isChanged && (
                                                            <span style={{
                                                                fontSize: '11px',
                                                                color: '#f97316',
                                                                fontWeight: '500',
                                                                backgroundColor: '#ffedd5',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px'
                                                            }}>
                                                                değiştirildi
                                                            </span>
                                                        )}
                                                    </label>
                                                    <span style={{ 
                                                        fontSize: '12px', 
                                                        color: '#94a3b8',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {anahtar}
                                                    </span>
                                                </div>
                                                <div>
                                                    {renderInput(ayar, activeTab)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bilgi Kartı */}
            <div style={{
                ...styles.card,
                backgroundColor: '#eff6ff',
                borderColor: '#bfdbfe'
            }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ fontSize: '24px' }}>ℹ️</span>
                    <div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                            Ayarlar Hakkında
                        </h3>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', fontSize: '14px', lineHeight: '1.8' }}>
                            <li>Değişiklikler "Kaydet" butonuna basılana kadar uygulanmaz</li>
                            <li>Bakım modu aktif edildiğinde site ziyaretçilere kapatılır</li>
                            <li>Komisyon ve vergi oranları yeni siparişlere uygulanır</li>
                            <li>Logo ve favicon için geçerli URL'ler kullanın</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Ortak stiller
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
        padding: '12px 24px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    }
};

export default SistemAyarlari;
