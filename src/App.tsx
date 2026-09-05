import { useEffect, useState } from "react";
import { buildFocusSuggestion } from "./domain/priority";
import { computeDailyWorkload } from "./domain/workload";
import { useTheme } from "./lib/useTheme";
import { AuthScreen } from "./features/auth/AuthScreen";
import { CoursesPage } from "./features/courses/CoursesPage";
import { InboxPage } from "./features/inbox/InboxPage";
import { OnboardingPage } from "./features/onboarding/OnboardingPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TasksPage } from "./features/tasks/TasksPage";
import type { InboxItem } from "./features/inbox/InboxPage";
import type { Task } from "./features/tasks/TasksPage";
import {
  getDemoInbox,
  isMissingSupabaseTableError,
  setDemoInbox,
} from "./lib/demoStore";
import { supabase } from "./lib/supabase";
import "./App.css";

type View =
  | "Today"
  | "Inbox"
  | "Tasks"
  | "Timeline"
  | "Workload"
  | "Courses"
  | "Settings";

const navigation: { label: View; title: string; icon: string }[] = [
  { label: "Today", title: "Hari ini", icon: "O" },
  { label: "Inbox", title: "Kotak masuk", icon: "I" },
  { label: "Tasks", title: "Tugas", icon: "T" },
  { label: "Timeline", title: "Timeline", icon: "L" },
  { label: "Workload", title: "Beban kerja", icon: "W" },
  { label: "Courses", title: "Mata kuliah", icon: "C" },
  { label: "Settings", title: "Pengaturan", icon: "S" },
];
const weekdayLabels: Record<string, string> = {
  Sun: "Minggu",
  Mon: "Senin",
  Tue: "Selasa",
  Wed: "Rabu",
  Thu: "Kamis",
  Fri: "Jumat",
  Sat: "Sabtu",
};

function calendarDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`);
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<View>("Today");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const [userId, setUserId] = useState("");
  const [contextualizingItem, setContextualizingItem] =
    useState<InboxItem | null>(null);
  const [capture, setCapture] = useState("");
  const [inboxCount, setInboxCount] = useState(() =>
    !supabase ? getDemoInbox<InboxItem[]>([]).length : 0,
  );
  const [profileName, setProfileName] = useState("");
  const [liveTasks, setLiveTasks] = useState<Task[]>([]);
  const [isLiveData, setIsLiveData] = useState(Boolean(supabase));
  const openTasks = liveTasks.filter((task) => task.status === "open");
  const focusSource = openTasks;
  const focusSuggestions = buildFocusSuggestion(focusSource).slice(0, 2);
  const focusSuggestion = focusSuggestions[recommendationIndex] ?? {
    id: "empty",
    title: "Tangkap tugas pertama",
    score: 0,
    explanation: ["Belum ada tugas aktif"],
  };
  const weekLoad = computeDailyWorkload(openTasks, 7);
  const heaviestDay =
    openTasks.length > 0
      ? weekLoad.reduce(
          (heavy, item) => (item.value > heavy.value ? item : heavy),
          weekLoad[0] ?? { day: "", value: 0 },
        )
      : { day: "", value: 0 };
  const heaviestDayLabel = weekdayLabels[heaviestDay.day] ?? "Hari ini";
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase();
  const timelineSource = openTasks
    .filter((task) => task.due_at)
    .map((task) => {
      const dueDate = calendarDate(task.due_at as string);
      return {
        day: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
          dueDate,
        ),
        date: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "2-digit",
        }).format(dueDate),
        title: task.title,
        detail: task.effort_minutes
          ? `${task.effort_minutes} menit perkiraan`
          : "Tugas terbuka",
        time: new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(dueDate),
      };
    });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTasks = openTasks.filter(
    (task) =>
      task.due_at &&
      calendarDate(task.due_at).toDateString() === todayStart.toDateString(),
  );
  const upcomingTasks = openTasks
    .filter((task) => task.due_at && calendarDate(task.due_at) >= todayStart)
    .slice(0, 4);
  const upcoming = upcomingTasks.map((task) => {
    const dueDate = calendarDate(task.due_at as string);
    return {
      date: `${new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(dueDate)}, ${new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(dueDate)}`,
      title: task.title,
      course: "Open task",
      effort: task.effort_minutes
        ? `${Math.round(task.effort_minutes / 60)}h`
        : "Flexible",
    };
  });
  const timelineEmptyState =
    timelineSource.length > 0
      ? timelineSource
      : [
          {
            day: "",
            date: "",
            title: "Timeline Anda masih kosong.",
            detail: "Tambahkan deadline agar tugas muncul di sini.",
            time: "",
          },
        ];
  const timelineItemsWithEmptyState = timelineEmptyState;
  const workloadSummary =
    openTasks.length === 0
      ? []
      : [
          { label: "Tugas terbuka", value: openTasks.length, tone: "teal" },
          {
            label: "Menit terencana",
            value: openTasks.reduce(
              (total, task) => total + (task.effort_minutes ?? 0),
              0,
            ),
            tone: "amber",
          },
          {
            label: "Hari terjadwal",
            value: new Set(
              openTasks
                .filter((task) => task.due_at)
                .map((task) => new Date(task.due_at as string).toDateString()),
            ).size,
            tone: "coral",
          },
        ];
  const pulseMessage =
    openTasks.length === 0
      ? "Minggu ini masih longgar. Istirahatlah, pelajari hal baru, atau siapkan minggu depan dengan tenang."
      : `Ada ${openTasks.length} ${openTasks.length === 1 ? "tugas terbuka" : "tugas terbuka"}. Kerjakan langkah kecil berikutnya dan jaga fokus Anda.`;

  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error("Session initialization failed", { code: error.code });
        setIsAuthenticated(false);
        return;
      }
      const session = data.session;
      setIsAuthenticated(Boolean(session));
      setUserId(session?.user.id ?? "");
      setProfileName(
        session?.user.user_metadata?.display_name ||
          session?.user.email?.split("@")[0] ||
          "",
      );
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setIsAuthenticated(Boolean(session));
        setUserId(session?.user.id ?? "");
        setProfileName(
          session?.user.user_metadata?.display_name ||
            session?.user.email?.split("@")[0] ||
            "",
        );
      },
    );
    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !isAuthenticated) return;
    const client = supabase;
    client.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setProfileName(
        user.user_metadata?.display_name || user.email?.split("@")[0] || "",
      );
      const { data: profile } = await client
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) setProfileName(profile.display_name);
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!supabase || !isAuthenticated) {
      setIsCheckingOnboarding(false);
      return;
    }
    const client = supabase;
    Promise.all([
      client.from("courses").select("id", { count: "exact", head: true }),
      client.from("tasks").select("id", { count: "exact", head: true }),
    ]).then(([courseResult, taskResult]) => {
      const onboardingComplete =
        window.localStorage.getItem(`nexus-onboarding-complete-${userId}`) ===
        "true";
      setNeedsOnboarding(
        !onboardingComplete &&
          !courseResult.error &&
          !taskResult.error &&
          (courseResult.count ?? 0) === 0 &&
          (taskResult.count ?? 0) === 0,
      );
      setIsCheckingOnboarding(false);
    });
  }, [isAuthenticated, userId]);

  useEffect(() => {
    setRecommendationIndex(0);
  }, [liveTasks]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!supabase) {
      setLiveTasks([]);
      setIsLiveData(true);
      return;
    }

    let isMounted = true;
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("Today task loading error:", error);
          if (isMissingSupabaseTableError(error)) {
            setLiveTasks([]);
            setIsLiveData(true);
          }
          return;
        }
        setLiveTasks((data ?? []) as Task[]);
        setIsLiveData(true);
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!supabase) {
      setInboxCount(getDemoInbox<InboxItem[]>([]).length);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated)
    return (
      <AuthScreen
        onAuthenticated={() => {
          setIsAuthenticated(true);
        }}
      />
    );

  if (isCheckingOnboarding)
    return (
      <main className="onboarding-page">
        <p className="onboarding-loading">Menyiapkan ruang akademikmu...</p>
      </main>
    );
  if (needsOnboarding)
    return (
      <OnboardingPage
        onComplete={() => {
          window.localStorage.setItem(
            `nexus-onboarding-complete-${userId}`,
            "true",
          );
          setNeedsOnboarding(false);
        }}
      />
    );

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setUserId("");
    setProfileName("");
    setActiveView("Today");
    setContextualizingItem(null);
    setCapture("");
    setIsMoreOpen(false);
  }

  async function handleCapture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = capture.trim();
    if (!value) return;

    if (!supabase) {
      const items = getDemoInbox<InboxItem[]>([]);
      const nextItem: InboxItem = {
        id: crypto.randomUUID(),
        user_id: "demo-user",
        raw_text: value,
        status: "unprocessed",
        captured_at: new Date().toISOString(),
        processed_at: null,
      };
      const nextItems = [nextItem, ...items];
      setDemoInbox(nextItems);
      setInboxCount(nextItems.length);
      setCapture("");
      setIsQuickCaptureOpen(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("inbox_items")
      .insert({ raw_text: value, user_id: user.id });
    if (error) {
      console.error("Today capture error:", error);
      return;
    }
    setInboxCount((count) => count + 1);
    setCapture("");
    setIsQuickCaptureOpen(false);
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">+</span>
          <span>NEXUS</span>
        </div>
        <div className="workspace-label">RUANG AKADEMIK SAYA</div>
        <nav aria-label="Primary navigation">
          {navigation.map((item) => (
            <button
              className={`nav-item ${activeView === item.label ? "active" : ""}`}
              key={item.label}
              onClick={() => setActiveView(item.label)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.title}
              {item.label === "Inbox" && inboxCount > 0 && (
                <span className="nav-count">{inboxCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">
              {(profileName || "U").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{profileName || "Akun Anda"}</strong>
              <span>Akun mahasiswa</span>
            </div>
            <span className="profile-more">...</span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">+</span>NEXUS
          </div>
          <div className="date-context">
            <span className="eyebrow">{todayLabel}</span>
            <span className="live-dot">
              {isLiveData
                ? "Tersinkron dengan akun Anda"
                : "Menunggu sinkronisasi akun"}
            </span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Ganti ke mode terang"
                  : "Ganti ke mode gelap"
              }
              title={
                theme === "dark"
                  ? "Ganti ke mode terang"
                  : "Ganti ke mode gelap"
              }
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
        </header>
        {isQuickCaptureOpen && (
          <div className="modal-backdrop" role="presentation">
            <div
              className="quick-capture-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-capture-title"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow accent-text">TANGKAP CEPAT</p>
                  <h2 id="quick-capture-title">Apa yang ingin kamu ingat?</h2>
                </div>
                <button
                  className="modal-close"
                  type="button"
                  onClick={() => {
                    setIsQuickCaptureOpen(false);
                    setCapture("");
                  }}
                  aria-label="Tutup"
                >
                  x
                </button>
              </div>
              <form className="quick-capture-form" onSubmit={handleCapture}>
                <textarea
                  autoFocus
                  required
                  rows={4}
                  maxLength={500}
                  value={capture}
                  onChange={(event) => setCapture(event.target.value)}
                  placeholder="Misalnya: kumpulkan laporan RPL hari Jumat"
                />
                <div className="modal-actions">
                  <button
                    className="quiet-button"
                    type="button"
                    onClick={() => {
                      setIsQuickCaptureOpen(false);
                      setCapture("");
                    }}
                  >
                    Batal
                  </button>
                  <button className="primary-button" type="submit">
                    Simpan ke kotak masuk
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {activeView === "Courses" ? (
          <CoursesPage />
        ) : activeView === "Tasks" ? (
          <TasksPage
            initialInboxItem={contextualizingItem}
            onTasksChanged={setLiveTasks}
            onInboxProcessed={(id) => {
              setContextualizingItem(null);
              setInboxCount((count) => Math.max(0, count - (id ? 1 : 0)));
            }}
          />
        ) : activeView === "Inbox" ? (
          <InboxPage
            onCountChange={setInboxCount}
            onContextualize={(item) => {
              setContextualizingItem(item);
              setActiveView("Tasks");
            }}
          />
        ) : activeView === "Timeline" ? (
          <div className="page-wrap">
            <section className="page-heading">
              <div>
                <p className="eyebrow accent-text">LANGKAH BERIKUTNYA</p>
                <h1>Timeline Anda.</h1>
                <p className="heading-subtitle">
                  Beberapa hari ke depan tersusun agar fokus Anda tetap
                  realistis.
                </p>
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={() => setActiveView("Today")}
              >
                Kembali ke hari ini <span>-&gt;</span>
              </button>
            </section>
            <div className="inbox-list">
              {timelineItemsWithEmptyState.map((item) => (
                <article
                  className="inbox-item"
                  key={`${item.day}-${item.title}`}
                >
                  <div className="inbox-item-mark" aria-hidden="true">
                    •
                  </div>
                  <div className="inbox-item-content">
                    <p>{item.title}</p>
                    <span>
                      {item.day
                        ? `${item.day}, ${item.date} · ${item.time}`
                        : "Belum ada deadline terjadwal"}
                    </span>
                  </div>
                  <div className="inbox-actions">
                    <span className="muted-label">{item.detail}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : activeView === "Workload" ? (
          <div className="page-wrap">
            <section className="page-heading">
              <div>
                <p className="eyebrow accent-text">MELIHAT BEBAN MINGGU INI</p>
                <h1>Beban kerja Anda.</h1>
                <p className="heading-subtitle">
                  Lihat pembagian beban kerja Anda dalam satu pandangan.
                </p>
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={() => setActiveView("Today")}
              >
                Kembali ke hari ini <span>-&gt;</span>
              </button>
            </section>
            <div className="lower-grid">
              <div className="load-panel">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">BEBAN MINGGUAN</p>
                    <h2>Usaha per hari</h2>
                  </div>
                  <span className="muted-label">7 hari ke depan</span>
                </div>
                <div className="load-chart">
                  {weekLoad.map((item, index) => (
                    <div className={`load-bar ${item.value > 0 && item.day === heaviestDay.day && item.value === heaviestDay.value ? "is-heavy" : ""}`} key={`${item.day}-${index}`}>
                      <span className="bar-track">
                        <i style={{ height: `${item.value}%` }} />
                      </span>
                      <small>{item.day}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pulse-panel">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">BALANCE</p>
                    <h2>Arah minggu Anda</h2>
                  </div>
                </div>
                {workloadSummary.length === 0 ? (
                  <div className="workload-empty">
                    <strong>Minggu Anda masih longgar.</strong>
                    <p>
                      Gunakan waktu ini untuk beristirahat, mempelajari hal
                      baru, atau menyiapkan minggu depan.
                    </p>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setActiveView("Tasks")}
                    >
                      Tambah tugas <span>-&gt;</span>
                    </button>
                  </div>
                ) : (
                  workloadSummary.map((item) => (
                    <div className="upcoming-item" key={item.label}>
                      <div className="date-block">
                        <strong>{item.value}</strong>
                        <span>{item.label}</span>
                      </div>
                      <div className="upcoming-detail">
                        <strong>
                          {item.tone === "teal"
                            ? "Tugas terbuka"
                            : item.tone === "amber"
                              ? "Waktu terencana"
                              : "Hari terjadwal"}
                        </strong>
                        <span>
                          {item.tone === "teal"
                            ? "Tugas yang masih perlu dikerjakan."
                            : item.tone === "amber"
                              ? "Perkiraan waktu dari tugas terbuka."
                              : "Hari yang memiliki deadline."}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : activeView === "Settings" ? (
          <SettingsPage onSignOut={handleSignOut} />
        ) : activeView === "Today" ? (
          <div className="page-wrap">
            <section className="page-heading">
              <div>
                <p className="eyebrow accent-text">FOKUS ANDA</p>
                <h1 className="greeting-title">Selamat datang, {profileName || "di ruang Anda"}.</h1>
                <p className="heading-subtitle">
                  Inilah hal yang layak mendapat perhatian Anda hari ini.
                </p>
              </div>
              <button className="text-button" type="button">
                View week <span>-&gt;</span>
              </button>
            </section>
            <section className="focus-section" aria-labelledby="focus-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">YANG PERLU DIDAHULUKAN</p>
                  <h2 id="focus-title">{focusSuggestion.title}</h2>
                </div>
                <div
                  className="recommendation-controls"
                  aria-label="Pilihan rekomendasi"
                >
                  <button
                    type="button"
                    aria-label="Rekomendasi sebelumnya"
                    disabled={focusSuggestions.length < 2}
                    onClick={() =>
                      setRecommendationIndex(
                        (recommendationIndex + focusSuggestions.length - 1) %
                          focusSuggestions.length,
                      )
                    }
                  >
                    &lt;
                  </button>
                  <span>
                    {focusSuggestions.length
                      ? `${recommendationIndex + 1} dari ${focusSuggestions.length}`
                      : "Belum ada"}
                  </span>
                  <button
                    type="button"
                    aria-label="Rekomendasi berikutnya"
                    disabled={focusSuggestions.length < 2}
                    onClick={() =>
                      setRecommendationIndex(
                        (recommendationIndex + 1) % focusSuggestions.length,
                      )
                    }
                  >
                    &gt;
                  </button>
                </div>
              </div>
              <div className="focus-content">
                <div>
                  <p className="focus-reason">
                    Rekomendasi ini mempertimbangkan kedekatan deadline, durasi,
                    dan beban kerja Anda saat ini.
                  </p>
                  <div className="reason-list">
                    {focusSuggestion.explanation.map((item) => (
                      <span key={item}>
                        <b className="reason-dot coral" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setActiveView("Tasks")}
                >
                  Mulai mengerjakan <span>-&gt;</span>
                </button>
              </div>
            </section>
            <div className="content-grid">
              <section aria-labelledby="today-title">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">HARI INI</p>
                    <h2 id="today-title">Ringkasan hari Anda</h2>
                  </div>
                  <span className="muted-label">
                    {todayTasks.length}{" "}
                    {todayTasks.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="schedule">
                  {todayTasks.length === 0 ? (
                    <p className="empty-inline">
                      Tidak ada tugas hari ini. Gunakan waktu ini untuk
                      istirahat atau bersiap lebih awal.
                    </p>
                  ) : (
                    todayTasks.map((task) => (
                      <div className="schedule-row" key={task.id}>
                        <span className="schedule-time">
                          {task.due_at
                            ? new Intl.DateTimeFormat("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(task.due_at))
                            : "--"}
                        </span>
                        <span className="schedule-line" />
                        <div>
                          <strong>{task.title}</strong>
                          <span className="schedule-meta">
                            {task.effort_minutes
                              ? `${task.effort_minutes} menit perkiraan`
                              : "Tugas terbuka"}{" "}
                            <i>Tugas</i>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
              <section aria-labelledby="upcoming-title">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">SEGERA HADIR</p>
                    <h2 id="upcoming-title">Yang akan datang</h2>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Buka timeline"
                    onClick={() => setActiveView("Timeline")}
                  >
                    -&gt;
                  </button>
                </div>
                <div className="upcoming-list">
                  {upcoming.length === 0 ? (
                    <p className="empty-inline">
                      Belum ada jadwal. Anda bebas menentukan langkah
                      berikutnya.
                    </p>
                  ) : (
                    upcoming.map((item) => (
                      <div className="upcoming-item" key={item.title}>
                        <div className="date-block">
                          <strong>{item.date.split(",")[0]}</strong>
                          <span>{item.date.split(",")[1]}</span>
                        </div>
                        <div className="upcoming-detail">
                          <strong>{item.title}</strong>
                          <span>
                            {item.course} <b>{item.effort}</b>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
            <section className="lower-grid">
              <div className="pulse-panel">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">IRAMA AKADEMIK</p>
                    <h2>Gambaran minggu Anda</h2>
                  </div>
                  <span className="pulse-spark">~</span>
                </div>
                <p className="pulse-copy">
                  {openTasks.length > 0 && (
                    <strong>
                      {heaviestDayLabel} adalah hari terpadat Anda.{" "}
                    </strong>
                  )}
                  {pulseMessage}
                </p>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setActiveView("Workload")}
                >
                  Lihat beban kerja <span>-&gt;</span>
                </button>
              </div>
              <div className="load-panel">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">BEBAN MINGGUAN</p>
                    <h2>Usaha per hari</h2>
                  </div>
                  <span className="muted-label">7 hari ke depan</span>
                </div>
                <div className="load-chart">
                  {weekLoad.map((item, index) => {
                    const isHeavy =
                      item.day === heaviestDay.day &&
                      item.value === heaviestDay.value;
                    return (
                      <div
                        className={`load-bar ${isHeavy ? "is-heavy" : ""}`}
                        key={`${item.day}-${index}`}
                      >
                        <span className="bar-track">
                          <i style={{ height: `${item.value}%` }} />
                        </span>
                        <small>{item.day}</small>
                      </div>
                    );
                  })}
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="legend-dot" />
                    Planned effort
                  </span>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setActiveView("Workload")}
                  >
                    Open workload <span>-&gt;</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="placeholder-view">
            <p className="eyebrow accent-text">NEXUS FOUNDATION</p>
            <h1>{activeView}</h1>
            <p>
              This view is ready for the next implementation slice. Your
              navigation and application shell are in place.
            </p>
            <button
              className="primary-button"
              onClick={() => setActiveView("Today")}
              type="button"
            >
              Back to Today <span>-&gt;</span>
            </button>
          </section>
        )}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => (
          <button
            className={activeView === item.label ? "active" : ""}
            key={item.label}
            onClick={() => {
              setActiveView(item.label);
              setIsMoreOpen(false);
            }}
            type="button"
          >
            <span>{item.icon}</span>
            {item.title}
          </button>
        ))}
        <button
          className="mobile-add"
          type="button"
          onClick={() => setIsQuickCaptureOpen(true)}
          aria-label="Buka tangkap cepat"
        >
          +
        </button>
        <button
          className={
            isMoreOpen ||
            ["Workload", "Courses", "Settings"].includes(activeView)
              ? "active"
              : ""
          }
          type="button"
          onClick={() => setIsMoreOpen((open) => !open)}
        >
          <span>...</span>Lainnya
        </button>
        {isMoreOpen && (
          <div className="mobile-more-menu">
            <button
              type="button"
              onClick={() => {
                setActiveView("Workload");
                setIsMoreOpen(false);
              }}
            >
              Workload
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView("Courses");
                setIsMoreOpen(false);
              }}
            >
              Courses
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView("Settings");
                setIsMoreOpen(false);
              }}
            >
              Settings
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
export default App;
