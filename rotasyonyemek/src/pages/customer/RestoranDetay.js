import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

export default function RestoranPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    let alive = true;

    const ensureDbUser = async (email) => {
      const { data: existing, error: selErr } = await supabase
        .from("kullanicilar")
        .select("id, email, ad, soyad, rol")
        .eq("email", email)
        .maybeSingle();

      if (selErr) throw selErr;
      if (existing) return existing;

      const { data: inserted, error: insErr } = await supabase
        .from("kullanicilar")
        .insert({ email })
        .select("id, email, ad, soyad, rol")
        .single();

      if (insErr) throw insErr;
      return inserted;
    };

    async function load() {
      setLoading(true);
      setError("");

      try {
        const { data, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const user = data?.user || null;

        if (!alive) return;
        setAuthUser(user);

        if (!user?.email) {
          setDbUser(null);
          setRestaurants([]);
          return;
        }

        const dbRow = await ensureDbUser(user.email);

        if (!alive) return;
        setDbUser(dbRow);

        // Restoranları çek
        const { data: resList, error: resErr } = await supabase
          .from("restoranlar")
          .select(
            "id, ad, aciklama, kategori, puan, min_siparis, teslimat_suresi, aktif, sahip_id, created_at"
          )
          .eq("sahip_id", dbRow.id)
          .order("created_at", { ascending: false });

        if (resErr) throw resErr;

        if (!alive) return;
        setRestaurants(resList || []);
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

  if (!authUser) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Restoran Paneli</h2>
        <p>Bu sayfayı görmek için giriş yapmalısın.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Restoran Paneli</h2>

      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <div>
          <strong>Auth:</strong> {authUser.email}
        </div>
        <div>
          <strong>DB Kullanıcı ID (kullanicilar.id):</strong> {dbUser?.id || "-"}
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {restaurants.length === 0 ? (
        <div>
          <p>Bu kullanıcıya ait restoran bulunamadı.</p>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            Kontrol: <code>restoranlar.sahip_id</code> alanı,{" "}
            <code>kullanicilar.id</code> ile eşleşmeli.
          </p>
        </div>
      ) : (
        <div>
          <h3>Restoranlarım</h3>
          <ul style={{ paddingLeft: 18 }}>
            {restaurants.map((r) => (
              <li key={r.id} style={{ marginBottom: 10 }}>
                <div>
                  <strong>{r.ad}</strong> {r.aktif ? "(Aktif)" : "(Pasif)"}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Kategori: {r.kategori || "-"} | Puan: {r.puan ?? 0} | Min:
                  {" "}{r.min_siparis ?? 0}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}