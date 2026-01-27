import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Sepet = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Tüm localStorage anahtarlarını kontrol et
        const sepetAnahtarlari = Object.keys(localStorage).filter(key => key.startsWith('sepet_'));

        let hedefRestoranId = null;

        // Dolu olan ilk sepeti bul
        for (const key of sepetAnahtarlari) {
            try {
                const sepet = JSON.parse(localStorage.getItem(key));
                if (Array.isArray(sepet) && sepet.length > 0) {
                    // Key formatı: sepet_RESTORANID
                    hedefRestoranId = key.replace('sepet_', '');
                    break;
                }
            } catch (e) {
                console.error("Sepet okuma hatası", e);
            }
        }

        if (hedefRestoranId) {
            // Sepet bulundu, o restorana yönlendir ve modalı açtır
            navigate(`/restoran/${hedefRestoranId}?sepetAc=true`, { replace: true });
        } else {
            // Sepet yoksa yüklemeyi bitir (Boş ekranı göster)
            setLoading(false);
        }
    }, [navigate]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column' }}>
                <div style={{ fontSize: '40px', marginBottom: '20px' }}>🔄</div>
                <div>Sepetiniz Analiz Ediliyor...</div>
            </div>
        );
    }

    return (
        <div style={{ textAlign: 'center', padding: '50px 20px', maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🛒</div>
            <h2 style={{ marginBottom: '10px' }}>Sepetiniz Boş</h2>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>
                Henüz sepete bir şey eklememişsiniz. Lezzetli yemekler sizi bekliyor!
            </p>
            <button
                onClick={() => navigate('/')}
                style={{
                    background: '#ea580c',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    width: '100%'
                }}
            >
                Restoranları Keşfet
            </button>
        </div>
    );
};

export default Sepet;
