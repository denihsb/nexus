import { useEffect, useState } from "react";
import {
  getDemoCourses,
  getDemoTasks,
  isMissingSupabaseTableError,
  setDemoTasks,
} from "../../lib/demoStore";
import { supabase } from "../../lib/supabase";
import type { Course } from "../courses/CoursesPage";
import type { InboxItem } from "../inbox/InboxPage";

export type Task = {
  id: string;
  user_id: string;
  course_id: string | null;
  inbox_item_id: string | null;
  title: string;
  notes: string;
  due_at: string | null;
  effort_minutes: number | null;
  importance: 1 | 2 | 3;
  status: "open" | "completed" | "archived";
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type TaskDraft = {
  title: string;
  course_id: string;
  due_at: string;
  effort_minutes: string;
  importance: "1" | "2" | "3";
};
const emptyDraft: TaskDraft = {
  title: "",
  course_id: "",
  due_at: "",
  effort_minutes: "",
  importance: "2",
};

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}
function dateKey(value: string) {
  return value.slice(0, 10);
}

export function formatTaskDue(value: string | null, now = new Date()) {
  if (!value) return "Tanpa deadline";
  const dueDate = new Date(`${dateKey(value)}T12:00:00`);
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const label = dueDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return dueDate < today ? `Terlambat · ${label}` : `Deadline ${label}`;
}

type TasksPageProps = {
  initialInboxItem?: InboxItem | null;
  onInboxProcessed?: (id: string) => void;
  onTasksChanged?: (tasks: Task[]) => void;
};

export function TasksPage({
  initialInboxItem,
  onInboxProcessed,
  onTasksChanged,
}: TasksPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (!supabase) {
      const demoTasks = getDemoTasks<Task[]>([]).filter(
        (task) => task.status === "open",
      );
      const demoCourses = getDemoCourses<Course[]>([]).filter(
        (course) => !course.is_archived,
      );
      if (isMounted) {
        setTasks(demoTasks);
        setCourses(demoCourses);
        setIsLoading(false);
      }
      return () => {
        isMounted = false;
      };
    }

    Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("status", "open")
        .order("due_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("courses")
        .select("*")
        .eq("is_archived", false)
        .order("name"),
    ]).then(([taskResult, courseResult]) => {
      if (!isMounted) return;
      setIsLoading(false);
      if (taskResult.error || courseResult.error) {
        const missingTableError = taskResult.error ?? courseResult.error;
        console.error("Task loading error:", missingTableError);
        if (isMissingSupabaseTableError(missingTableError)) {
          const demoTasks = getDemoTasks<Task[]>([]).filter(
            (task) => task.status === "open",
          );
          const demoCourses = getDemoCourses<Course[]>([]).filter(
            (course) => !course.is_archived,
          );
          setTasks(demoTasks);
          setCourses(demoCourses);
          setMessage(
            "Data sementara aktif karena struktur database belum siap.",
          );
          return;
        }
        setMessage("Tugas tidak dapat dimuat. Periksa koneksi lalu coba lagi.");
        return;
      }
      setTasks(taskResult.data as Task[]);
      setCourses(courseResult.data as Course[]);
      setDemoTasks(taskResult.data as Task[]);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  function openCreateForm(item?: InboxItem) {
    setEditingTask(null);
    setDraft({ ...emptyDraft, title: item?.raw_text ?? "" });
    setMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setDraft({
      title: task.title,
      course_id: task.course_id ?? "",
      due_at: toDateInput(task.due_at),
      effort_minutes: task.effort_minutes?.toString() ?? "",
      importance: String(task.importance) as TaskDraft["importance"],
    });
    setMessage("");
    setIsFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setIsSaving(true);
    setMessage("");
    const values = {
      title: draft.title.trim(),
      course_id: draft.course_id || null,
      due_at: draft.due_at ? `${draft.due_at}T12:00:00.000Z` : null,
      effort_minutes: draft.effort_minutes
        ? Number(draft.effort_minutes)
        : null,
      importance: Number(draft.importance),
    };

    if (!supabase) {
      const nextImportance = Number(values.importance) as 1 | 2 | 3;
      const savedTask: Task = editingTask
        ? {
            ...editingTask,
            ...values,
            importance: nextImportance,
            updated_at: new Date().toISOString(),
          }
        : {
            id: crypto.randomUUID(),
            user_id: "demo-user",
            course_id: values.course_id,
            inbox_item_id: initialInboxItem?.id ?? null,
            title: values.title,
            notes: "",
            due_at: values.due_at,
            effort_minutes: values.effort_minutes,
            importance: nextImportance,
            status: "open",
            completed_at: null,
            archived_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
      const nextTasks = editingTask
        ? tasks.map((task) => (task.id === editingTask.id ? savedTask : task))
        : [...tasks, savedTask];
      setTasks(nextTasks);
      onTasksChanged?.(nextTasks);
      setDemoTasks(nextTasks);
      setIsSaving(false);
      setIsFormOpen(false);
      setDraft(emptyDraft);
      if (initialInboxItem) onInboxProcessed?.(initialInboxItem.id);
      return;
    }

    let result;
    if (editingTask) {
      result = await supabase
        .from("tasks")
        .update(values)
        .eq("id", editingTask.id)
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
        .from("tasks")
        .insert({
          ...values,
          user_id: user.id,
          inbox_item_id: initialInboxItem?.id ?? null,
        })
        .select()
        .single();
    }
    setIsSaving(false);
    if (result.error) {
      console.error("Task save error:", result.error);
      setMessage("Tugas tidak dapat disimpan. Periksa detailnya lalu coba lagi.");
      return;
    }
    const saved = result.data as Task;
    setTasks((items) =>
      editingTask
        ? items.map((item) => (item.id === saved.id ? saved : item))
        : [...items, saved].sort((a, b) =>
            (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999"),
          ),
    );
    onTasksChanged?.(
      editingTask
        ? tasks.map((item) => (item.id === saved.id ? saved : item))
        : [...tasks, saved],
    );
    setIsFormOpen(false);
    setDraft(emptyDraft);
    if (initialInboxItem) onInboxProcessed?.(initialInboxItem.id);
  }

  async function updateStatus(task: Task, status: "completed" | "archived") {
    if (!supabase) {
      const nextTasks = tasks.filter((item) => item.id !== task.id);
      setTasks(nextTasks);
      onTasksChanged?.(nextTasks);
      setDemoTasks(nextTasks);
      return;
    }
    const values =
      status === "completed"
        ? { status, completed_at: new Date().toISOString() }
        : { status, archived_at: new Date().toISOString() };
    const { error } = await supabase
      .from("tasks")
      .update(values)
      .eq("id", task.id);
    if (error) {
      console.error("Task status error:", error);
      setMessage("Tugas tidak dapat diperbarui. Silakan coba lagi.");
      return;
    }
    setTasks((items) => items.filter((item) => item.id !== task.id));
    onTasksChanged?.(tasks.filter((item) => item.id !== task.id));
    setMessage(status === "completed" ? `${task.title} selesai.` : `${task.title} diarsipkan.`);
  }

  async function rescheduleTask(task: Task) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T12:00:00.000Z`;
    if (!supabase) return;
    const { data, error } = await supabase
      .from("tasks")
      .update({ due_at: nextDueDate })
      .eq("id", task.id)
      .select()
      .single();
    if (error) {
      setMessage("Tugas tidak dapat dijadwalkan ulang. Silakan coba lagi.");
      return;
    }
    const nextTasks = tasks.map((item) => (item.id === task.id ? (data as Task) : item));
    setTasks(nextTasks);
    onTasksChanged?.(nextTasks);
    setMessage(`${task.title} dijadwalkan ulang untuk besok.`);
  }

  function formatDue(value: string | null) {
    return formatTaskDue(value);
  }

  return (
    <div className="page-wrap tasks-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow accent-text">TANGGUNG JAWAB AKADEMIK</p>
          <h1>Tugas Anda.</h1>
          <p className="heading-subtitle">
            Ubah deadline menjadi langkah berikutnya yang jelas.
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => openCreateForm()}
        >
          + Tambah tugas
        </button>
      </section>
      {message && (
        <div className="course-message" role="alert">
          {message}
        </div>
      )}
      {isLoading ? (
        <div className="course-state">Memuat tugas Anda...</div>
      ) : tasks.length === 0 ? (
        <div className="course-empty">
          <span className="empty-mark">+</span>
          <h2>Daftar tugas Anda masih kosong.</h2>
          <p>
            Tangkap sesuatu di Kotak Masuk atau tambahkan tanggung jawab baru di sini.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={() => openCreateForm()}
          >
            Tambah tugas <span>-&gt;</span>
          </button>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => {
            const course = courses.find((item) => item.id === task.course_id);
            return (
              <article className="task-item" key={task.id}>
                <button
                  className="task-check"
                  type="button"
                  aria-label={`Selesaikan ${task.title}`}
                  onClick={() => void updateStatus(task, "completed")}
                >
                  {" "}
                </button>
                <div className="task-main">
                  <h2>{task.title}</h2>
                  <div className="task-meta">
                    <span>{course?.code || course?.name || "Unassigned"}</span>
                    <span
                      className={
                        task.due_at && new Date(task.due_at) < new Date()
                          ? "overdue-text"
                          : ""
                      }
                    >
                      {formatDue(task.due_at)}
                    </span>
                    <span>
                      {task.effort_minutes
                        ? `${task.effort_minutes} menit`
                        : "Durasi belum diatur"}
                    </span>
                  </div>
                </div>
                <span className={`importance importance-${task.importance}`}>
                  {task.importance === 3
                    ? "Tinggi"
                    : task.importance === 2
                      ? "Sedang"
                      : "Rendah"}
                </span>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => openEditForm(task)}
                >
                  Ubah
                </button>
                {task.due_at && new Date(`${dateKey(task.due_at)}T12:00:00`) < new Date(new Date().setHours(12, 0, 0, 0)) && (
                  <button className="text-button" type="button" onClick={() => void rescheduleTask(task)}>
                    Jadwalkan besok
                  </button>
                )}
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => void updateStatus(task, "archived")}
                >
                  Arsipkan
                </button>
              </article>
            );
          })}
        </div>
      )}
      {isFormOpen && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="course-modal task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-form-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow accent-text">TASK CONTEXT</p>
                <h2 id="task-form-title">
                  {editingTask ? "Ubah tugas" : "Tambah tugas"}
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
                Nama tugas
                <input
                  autoFocus
                  required
                  maxLength={160}
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                  placeholder="Apa yang perlu dikerjakan?"
                />
              </label>
              <label>
                Mata kuliah <span>(opsional)</span>
                <select
                  value={draft.course_id}
                  onChange={(event) =>
                    setDraft({ ...draft, course_id: event.target.value })
                  }
                >
                  <option value="">Belum ada mata kuliah</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ? `${course.code} · ` : ""}
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Deadline <span>(opsional)</span>
                <input
                  type="date"
                  value={draft.due_at}
                  onChange={(event) =>
                    setDraft({ ...draft, due_at: event.target.value })
                  }
                />
              </label>
              <label>
                Perkiraan durasi dalam menit <span>(opsional)</span>
                <input
                  min="1"
                  max="1440"
                  type="number"
                  value={draft.effort_minutes}
                  onChange={(event) =>
                    setDraft({ ...draft, effort_minutes: event.target.value })
                  }
                  placeholder="misalnya 90"
                />
              </label>
              <label>
                Prioritas
                <select
                  value={draft.importance}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      importance: event.target.value as TaskDraft["importance"],
                    })
                  }
                >
                  <option value="1">Rendah</option>
                  <option value="2">Sedang</option>
                  <option value="3">Tinggi</option>
                </select>
              </label>
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
                    : editingTask
                      ? "Simpan perubahan"
                      : "Tambah tugas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
