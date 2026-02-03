import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { supabase } from "../../services/supabase";

export default function RestaurantPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const u = userRes?.user;
        if (!u) {
          if (!alive) return;
          setUser(null);
          setRestaurant(null);
          return;
        }

        if (!alive) return;
        setUser(u);

        // owner'a ait restoranı çek
        const { data: r, error: rErr } = await supabase
          .from("restaurants")
          .select("id, name, status, owner_id")
          .eq("owner_id", u.id)
          .maybeSingle();

        if (rErr) throw rErr;

        if (!alive) return;
        setRestaurant(r || null);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Restoran paneli yüklenirken hata oluştu.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Yükleniyor…</div>;

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Restoran Paneli</h2>
        <p style={{ color: "crimson" }}>{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Restoran Paneli</h2>
        <p>Bu sayfayı görmek için giriş yapmalısın.</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Restoran Paneli</h2>
        <p>Bu hesaba bağlı restoran bulunamadı.</p>
        <p>
          Kontrol: <code>restaurants.owner_id</code> kullanıcı ID ile eşleşiyor mu?
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Restoran Paneli</h2>

      <div style={{ marginTop: 8 }}>
        <div><strong>Restoran:</strong> {restaurant.name}</div>
        <div><strong>Durum:</strong> {restaurant.status || "-"}</div>
        <div><strong>Restoran ID:</strong> {restaurant.id}</div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {/* Panel içi sayfaların varsa link bırakıyorum */}
      <nav style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Link to="/restaurant-panel">Dashboard</Link>
        <Link to="/restaurant-panel/menu">Menü Yönetimi</Link>
        <Link to="/restaurant-panel/orders">Siparişler</Link>
      </nav>

      {/* Eğer nested routes kullanıyorsan */}
      <Outlet />
    </div>
  );
}