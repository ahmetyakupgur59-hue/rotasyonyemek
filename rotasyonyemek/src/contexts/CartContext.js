import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [restoranId, setRestoranId] = useState(null);
  const [restoranAd, setRestoranAd] = useState('');

  // LocalStorage'dan yükle
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedRestoran = localStorage.getItem('cartRestoran');
    
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Sepet yüklenemedi');
      }
    }
    
    if (savedRestoran) {
      try {
        const { id, ad } = JSON.parse(savedRestoran);
        setRestoranId(id);
        setRestoranAd(ad);
      } catch (e) {
        console.error('Restoran bilgisi yüklenemedi');
      }
    }
  }, []);

  // LocalStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    if (restoranId) {
      localStorage.setItem('cartRestoran', JSON.stringify({
        id: restoranId,
        ad: restoranAd
      }));
    }
  }, [cart, restoranId, restoranAd]);

  const addToCart = (item, restoran) => {
    // Farklı restorandan ürün eklemeye çalışıyorsa sepeti temizle
    if (restoranId && restoranId !== restoran.id) {
      if (!window.confirm('Sepetinizde başka restorandan ürünler var. Sepeti temizleyip devam etmek ister misiniz?')) {
        return false;
      }
      setCart([]);
    }

    setRestoranId(restoran.id);
    setRestoranAd(restoran.ad);

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id 
            ? { ...i, adet: i.adet + 1 }
            : i
        );
      }
      return [...prev, { ...item, adet: 1 }];
    });

    return true;
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.adet > 1) {
        return prev.map(i =>
          i.id === itemId
            ? { ...i, adet: i.adet - 1 }
            : i
        );
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const deleteFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setRestoranId(null);
    setRestoranAd('');
    localStorage.removeItem('cart');
    localStorage.removeItem('cartRestoran');
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.fiyat * item.adet), 0);
  const cartCount = cart.reduce((acc, item) => acc + item.adet, 0);

  const value = {
    cart,
    restoranId,
    restoranAd,
    addToCart,
    removeFromCart,
    deleteFromCart,
    clearCart,
    cartTotal,
    cartCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;