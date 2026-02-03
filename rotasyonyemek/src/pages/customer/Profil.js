import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);

  useEffect(() => {
    let alive = true;

    const ensureDbUser = async (email) => {
      // 1) email ile kullanıcı var mı?
      const { data: existing, error: selErr } = await supabase
        .from("kullanicilar")
        .select("id, email, ad, soyad, telefon, adres, rol, created_at")
        .eq("email", email)
        .maybeSingle();

      if (selErr) throw selErr;
      if (existing) return existing;

      // 2) yoksa oluştur
      const { data: inserted, error: insErr } = await supabase
        .from("kullanicilar")
        .insert({ email })
        .select("id, email, ad, soyad, telefon, adres, rol, created_at")
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
          return;
        }

        const dbRow = await ensureDbUser(user.email);

        if (!alive) return;
        setDbUser(dbRow);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Profil yüklenirken hata oluştu.");
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
        <h2>Profil</h2>
        <p style={{ color: "crimson" }}>{error}</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Profil</h2>
        <p>Bu sayfayı görmek için giriş yapmalısın.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Profil</h2>

      <div style={{ marginTop: 12 }}>
        <div>
          <strong>Auth E-posta:</strong> {authUser.email}
        </div>
        <div>
          <strong>Auth Kullanıcı ID:</strong> {authUser.id}
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <h3>Veritabanı Kullanıcı Kaydı (kullanicilar)</h3>

      {dbUser ? (
        <div style={{ lineHeight: 1.8 }}>
          <div>
            <strong>DB ID:</strong> {dbUser.id}
          </div>
          <div>
            <strong>Email:</strong> {dbUser.email}
          </div>
          <div>
            <strong>Ad:</strong> {dbUser.ad || "-"}
          </div>
          <div>
            <strong>Soyad:</strong> {dbUser.soyad || "-"}
          </div>
          <div>
            <strong>Telefon:</strong> {dbUser.telefon || "-"}
          </div>
          <div>
            <strong>Adres:</strong> {dbUser.adres || "-"}
          </div>
          <div>
            <strong>Rol:</strong> {dbUser.rol || "musteri"}
          </div>
        </div>
      ) : (
        <p>kullanicilar tablosunda kayıt bulunamadı.</p>
      )}
    </div>
  );
}