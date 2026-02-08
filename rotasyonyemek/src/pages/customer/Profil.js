import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  // Şifre Güncelleme Fonksiyonu
  const updateMyPassword = async (newPassword) => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage("❌ Şifre en az 6 karakter olmalıdır");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordMessage("");

      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Şifre güncelleme hatası:", error);
        setPasswordMessage("❌ Şifre güncellenirken hata oluştu: " + error.message);
      } else {
        console.log("✅ Şifre başarıyla güncellendi!");
        setPasswordMessage("✅ Şifreniz güncellendi!");
      }
    } catch (e) {
      console.error("Beklenmeyen hata:", e);
      setPasswordMessage("❌ Bir hata oluştu");
    } finally {
      setPasswordLoading(false);
    }
  };

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

      <h3>Şifre Değiştir</h3>
      <PasswordChangeForm onSubmit={updateMyPassword} loading={passwordLoading} message={passwordMessage} />

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

// Şifre Değiştirme Form Komponenti
function PasswordChangeForm({ onSubmit, loading, message }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      alert("Tüm alanları doldurun");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Şifreler eşleşmiyor");
      return;
    }

    onSubmit(newPassword);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="newPassword" style={{ display: "block", marginBottom: 4 }}>
          Yeni Şifre:
        </label>
        <input
          id="newPassword"
          type="password"
          placeholder="Min 6 karakter"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "14px",
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: 4 }}>
          Şifreyi Onayla:
        </label>
        <input
          id="confirmPassword"
          type="password"
          placeholder="Şifreyi tekrar girin"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "14px",
            boxSizing: "border-box"
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "10px 20px",
          backgroundColor: loading ? "#ccc" : "#ff6b35",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "bold"
        }}
      >
        {loading ? "⏳ Güncelleniyor..." : "Şifreyi Güncelle"}
      </button>

      {message && (
        <div
          style={{
            marginTop: 12,
            padding: "10px",
            borderRadius: "4px",
            backgroundColor: message.includes("✅") ? "#e6ffe6" : "#ffe6e6",
            color: message.includes("✅") ? "#008000" : "#cc0000",
            fontSize: "14px"
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
}