import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

type AuthMode = "login" | "signup";

type AuthScreenProps = { onAuthenticated: () => void };


export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Layanan masuk belum siap. Silakan coba lagi nanti.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { display_name: displayName },
                emailRedirectTo: window.location.origin,
              },
            });
      if (result.error) {
        console.error("Authentication request failed", {
          status: result.error.status,
          code: result.error.code,
        });
        const errorMessage = result.error.message.toLowerCase();
        if (
          errorMessage.includes("already registered") ||
          errorMessage.includes("already been registered")
        ) {
          setMessage("Email ini sudah terdaftar. Silakan masuk.");
        } else if (errorMessage.includes("password")) {
          setMessage(
            "Kata sandi belum memenuhi syarat. Gunakan kata sandi yang lebih kuat.",
          );
        } else if (errorMessage.includes("email")) {
          setMessage("Periksa kembali alamat email Anda.");
        } else {
          setMessage("Layanan masuk sedang tidak tersedia. Silakan coba lagi.");
        }
        return;
      }
      if (mode === "signup" && !result.data.session) {
        setMessage(
          "Akun berhasil dibuat. Periksa email untuk konfirmasi, lalu masuk.",
        );
        setMode("login");
        return;
      }
      onAuthenticated();
    } catch (error) {
      console.error("Unexpected authentication error", error instanceof Error ? error.name : "unknown");
      setMessage(
        "Tidak dapat terhubung ke layanan. Periksa koneksi internet Anda.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <div className="brand">
          <span className="brand-mark">+</span>
          <span>NEXUS</span>
        </div>
        <p className="eyebrow accent-text">ACADEMIC CLARITY</p>
        <h1>
          {mode === "login" ? "Selamat datang kembali." : "Rapikan minggu kuliahmu."}
        </h1>
        <p className="auth-intro">
          Semua tanggung jawab akademikmu, dalam satu ruang yang tenang.
        </p>
        <div className="setup-message">
          <strong>
            {isSupabaseConfigured
              ? "Ruang akademikmu siap digunakan."
              : "Layanan masuk sedang disiapkan."}
          </strong>
          <span>
            {isSupabaseConfigured
              ? "Masuk untuk melanjutkan ke ruang akademikmu."
              : "Silakan coba lagi nanti atau hubungi administrator aplikasi."}
          </span>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Nama
              <input
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </label>
          )}
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="contoh: student@nexus.test"
            />
          </label>
          <label className="password-field">
            <span>Kata sandi</span>
            <div className="password-input-wrap">
              <input
                required
                minLength={6}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password Anda"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </label>
          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}
          <button
            className="primary-button"
            disabled={isSubmitting || !isSupabaseConfigured}
            type="submit"
          >
            {isSubmitting
              ? "Memproses..."
              : mode === "login"
                ? "Masuk"
                : "Buat akun"}{" "}
            <span>-&gt;</span>
          </button>
        </form>
        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
            setShowPassword(false);
          }}
        >
          {mode === "login"
            ? "Belum punya akun? Daftar"
            : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </main>
  );
}
