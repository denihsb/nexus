import { useState } from "react";
import { supabase } from "../../lib/supabase";

type OnboardingPageProps = { onComplete: () => void };

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [courses, setCourses] = useState(["", "", ""]);
  const [brainDump, setBrainDump] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const courseNames = courses.map((course) => course.trim()).filter(Boolean);
    const captures = brainDump.split("\n").map((item) => item.trim()).filter(Boolean);
    if (!supabase) {
      onComplete();
      return;
    }

    setIsSaving(true);
    setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSaving(false);
      setMessage("Sesi Anda berakhir. Silakan masuk kembali.");
      return;
    }

    if (courseNames.length > 0) {
      const { error } = await supabase.from("courses").insert(courseNames.map((name) => ({ user_id: user.id, name, code: "", color_token: "teal" })));
      if (error) {
        setIsSaving(false);
        setMessage("Mata kuliah belum dapat disimpan. Silakan coba lagi.");
        return;
      }
    }
    if (captures.length > 0) {
      const { error } = await supabase.from("tasks").insert(captures.map((title) => ({ user_id: user.id, title, notes: "", importance: 2, status: "open" })));
      if (error) {
        setIsSaving(false);
        setMessage("Tugas belum dapat disimpan. Mata kuliah sudah tersimpan.");
        return;
      }
    }
    setIsSaving(false);
    onComplete();
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-panel">
        <p className="eyebrow accent-text">MULAI DENGAN RINGAN</p>
        <h1>Selamat datang di NEXUS.</h1>
        <p className="onboarding-intro">Mari rapikan jadwal kuliahmu dalam 2 menit.</p>
        <form className="onboarding-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Mata kuliah apa yang sedang kamu ambil?</legend>
            {courses.map((course, index) => <input key={index} value={course} onChange={(event) => setCourses((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Mata kuliah ${index + 1} (opsional)`} maxLength={80} />)}
          </fieldset>
          <label htmlFor="brain-dump">Ada tugas, kuis, atau deadline yang paling memenuhi pikiranmu?</label>
          <textarea id="brain-dump" value={brainDump} onChange={(event) => setBrainDump(event.target.value)} placeholder="Tulis satu hal per baris, misalnya: Proposal RPL minggu depan" maxLength={2000} rows={5} />
          {message && <p className="auth-message" role="alert">{message}</p>}
          <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? "Menyimpan..." : "Bereskan sekarang"} <span>-&gt;</span></button>
          <button className="onboarding-skip" type="button" onClick={onComplete}>Lewati dulu</button>
        </form>
      </section>
    </main>
  );
}
