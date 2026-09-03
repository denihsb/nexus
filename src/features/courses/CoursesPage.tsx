import { useEffect, useState } from "react";
import {
  getDemoCourses,
  isMissingSupabaseTableError,
  setDemoCourses,
} from "../../lib/demoStore";
import { supabase } from "../../lib/supabase";

export type Course = {
  id: string;
  user_id: string;
  name: string;
  code: string;
  color_token: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type CourseDraft = { name: string; code: string; color_token: string };
const emptyDraft: CourseDraft = { name: "", code: "", color_token: "teal" };
const colors = ["teal", "coral", "amber", "blue"];

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [draft, setDraft] = useState<CourseDraft>(emptyDraft);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (!supabase) {
      const demoCourses = getDemoCourses<Course[]>([]).filter(
        (course) => !course.is_archived,
      );
      if (isMounted) {
        setCourses(demoCourses);
        setIsLoading(false);
      }
      return () => {
        isMounted = false;
      };
    }

    supabase
      .from("courses")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        setIsLoading(false);
        if (error) {
          console.error("Course loading error:", error);
          if (isMissingSupabaseTableError(error)) {
            const demoCourses = getDemoCourses<Course[]>([]).filter(
              (course) => !course.is_archived,
            );
            setCourses(demoCourses);
            setMessage(
              "Data sementara aktif karena struktur database belum siap.",
            );
            return;
          }
          setMessage(
            "Mata kuliah tidak dapat dimuat. Periksa koneksi lalu coba lagi.",
          );
          return;
        }
        setCourses(data as Course[]);
        setDemoCourses(data as Course[]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  function openCreateForm() {
    setEditingCourse(null);
    setDraft(emptyDraft);
    setMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(course: Course) {
    setEditingCourse(course);
    setDraft({
      name: course.name,
      code: course.code,
      color_token: course.color_token,
    });
    setMessage("");
    setIsFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setIsSaving(true);
    setMessage("");
    const values = {
      name: draft.name.trim(),
      code: draft.code.trim().toUpperCase(),
      color_token: draft.color_token,
    };

    if (!supabase) {
      const savedCourse: Course = editingCourse
        ? { ...editingCourse, ...values, updated_at: new Date().toISOString() }
        : {
            id: crypto.randomUUID(),
            user_id: "demo-user",
            name: values.name,
            code: values.code,
            color_token: values.color_token,
            is_archived: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
      const nextCourses = editingCourse
        ? courses.map((course) =>
            course.id === editingCourse.id ? savedCourse : course,
          )
        : [...courses, savedCourse];
      setCourses(nextCourses);
      setDemoCourses(nextCourses);
      setIsSaving(false);
      setIsFormOpen(false);
      setDraft(emptyDraft);
      return;
    }

    let result;
    if (editingCourse) {
      result = await supabase
        .from("courses")
        .update(values)
        .eq("id", editingCourse.id)
        .select()
        .single();
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsSaving(false);
        setMessage("Sesi Anda berakhir. Silakan masuk kembali.");
        return;
      }
      result = await supabase
        .from("courses")
        .insert({ ...values, user_id: user.id })
        .select()
        .single();
    }
    setIsSaving(false);
    if (result.error) {
      console.error("Course save error:", result.error);
      setMessage(
        "Mata kuliah tidak dapat disimpan. Periksa detailnya lalu coba lagi.",
      );
      return;
    }
    setCourses((items) =>
      editingCourse
        ? items.map((item) =>
            item.id === editingCourse.id ? (result.data as Course) : item,
          )
        : [...items, result.data as Course],
    );
    setIsFormOpen(false);
    setDraft(emptyDraft);
  }

  async function archiveCourse(course: Course) {
    if (!window.confirm(`Archive ${course.name}?`)) return;
    if (!supabase) {
      const nextCourses = courses.filter((item) => item.id !== course.id);
      setCourses(nextCourses);
      setDemoCourses(nextCourses);
      return;
    }

    const { error } = await supabase
      .from("courses")
      .update({ is_archived: true })
      .eq("id", course.id);
    if (error) {
      console.error("Course archive error:", error);
      setMessage("Mata kuliah tidak dapat diarsipkan. Silakan coba lagi.");
      return;
    }
    setCourses((items) => items.filter((item) => item.id !== course.id));
  }

  return (
    <div className="page-wrap courses-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow accent-text">KONTEKS AKADEMIK</p>
          <h1>Mata kuliah Anda.</h1>
          <p className="heading-subtitle">
            Simpan konteks agar setiap tanggung jawab punya tempat yang jelas.
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={openCreateForm}
        >
          + Tambah mata kuliah
        </button>
      </section>
      {message && (
        <div className="course-message" role="alert">
          {message}
        </div>
      )}
      {isLoading ? (
        <div className="course-state">Memuat mata kuliah Anda...</div>
      ) : courses.length === 0 ? (
        <div className="course-empty">
          <span className="empty-mark">+</span>
          <h2>Ruang akademik Anda siap.</h2>
          <p>Tambahkan mata kuliah pertama agar tugas memiliki konteks.</p>
          <button
            className="primary-button"
            type="button"
            onClick={openCreateForm}
          >
            Tambah mata kuliah pertama <span>-&gt;</span>
          </button>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((course) => (
            <article
              className={`course-card course-${course.color_token}`}
              key={course.id}
            >
              <div className="course-card-top">
                <span className="course-swatch" aria-hidden="true" />
                <span className="course-code">{course.code || "COURSE"}</span>
                <button
                  className="more-button"
                  type="button"
                  aria-label={`Actions for ${course.name}`}
                  onClick={() => openEditForm(course)}
                >
                  ...
                </button>
              </div>
              <h2>{course.name}</h2>
              <p>Siap untuk tanggung jawab berikutnya</p>
              <div className="course-card-actions">
                <button
                  className="text-button"
                  type="button"
                  onClick={() => openEditForm(course)}
                >
                  Ubah
                </button>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => void archiveCourse(course)}
                >
                  Arsipkan
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {isFormOpen && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="course-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-form-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow accent-text">PENGATURAN MATA KULIAH</p>
                <h2 id="course-form-title">
                  {editingCourse ? "Ubah mata kuliah" : "Tambah mata kuliah"}
                </h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setIsFormOpen(false)}
                aria-label="Close"
              >
                x
              </button>
            </div>
            <form className="course-form" onSubmit={handleSubmit}>
              <label>
                Nama mata kuliah
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  placeholder="misalnya Rekayasa Perangkat Lunak"
                />
              </label>
              <label>
                Kode mata kuliah <span>(opsional)</span>
                <input
                  maxLength={20}
                  value={draft.code}
                  onChange={(event) =>
                    setDraft({ ...draft, code: event.target.value })
                  }
                  placeholder="misalnya RPL"
                />
              </label>
              <fieldset>
                <legend>Warna mata kuliah</legend>
                <div className="color-options">
                  {colors.map((color) => (
                    <button
                      className={`color-option color-${color} ${draft.color_token === color ? "selected" : ""}`}
                      key={color}
                      type="button"
                      aria-label={`Use ${color} color`}
                      onClick={() => setDraft({ ...draft, color_token: color })}
                    >
                      <span />
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="modal-actions">
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                >
                  Batal
                </button>
                <button
                  className="primary-button"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving
                    ? "Menyimpan..."
                    : editingCourse
                      ? "Simpan perubahan"
                      : "Tambah mata kuliah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
