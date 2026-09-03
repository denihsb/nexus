import { useEffect, useState } from "react";
import {
  getDemoInbox,
  isMissingSupabaseTableError,
  setDemoInbox,
} from "../../lib/demoStore";
import { supabase } from "../../lib/supabase";

export type InboxItem = {
  id: string;
  user_id: string;
  raw_text: string;
  status: "unprocessed" | "processed" | "archived";
  captured_at: string;
  processed_at: string | null;
};

type InboxPageProps = {
  onCountChange?: (count: number) => void;
  onContextualize?: (item: InboxItem) => void;
};

export function InboxPage({ onCountChange, onContextualize }: InboxPageProps) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [capture, setCapture] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (!supabase) {
      const nextItems = getDemoInbox<InboxItem[]>([]).filter(
        (item) => item.status === "unprocessed",
      );
      if (isMounted) {
        setItems(nextItems);
        setIsLoading(false);
        onCountChange?.(nextItems.length);
      }
      return () => {
        isMounted = false;
      };
    }

    supabase
      .from("inbox_items")
      .select("*")
      .eq("status", "unprocessed")
      .order("captured_at", { ascending: false })
      .then(({ data, error }) => {
        if (!isMounted) return;
        setIsLoading(false);
        if (error) {
          console.error("Inbox loading error:", error);
          if (isMissingSupabaseTableError(error)) {
            const nextItems = getDemoInbox<InboxItem[]>([]).filter(
              (item) => item.status === "unprocessed",
            );
            setItems(nextItems);
            onCountChange?.(nextItems.length);
            setMessage(
              "Data sementara aktif karena struktur database belum siap.",
            );
            return;
          }
          setMessage(
            "Kotak masuk tidak dapat dimuat. Periksa koneksi lalu coba lagi.",
          );
          return;
        }
        const nextItems = data as InboxItem[];
        setItems(nextItems);
        setDemoInbox(nextItems);
        onCountChange?.(nextItems.length);
      });
    return () => {
      isMounted = false;
    };
  }, [onCountChange]);

  async function handleCapture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawText = capture.trim();
    if (!rawText) return;
    setIsSaving(true);
    setMessage("");

    if (!supabase) {
      const nextItems = [
        {
          id: crypto.randomUUID(),
          user_id: "demo-user",
          raw_text: rawText,
          status: "unprocessed",
          captured_at: new Date().toISOString(),
          processed_at: null,
        } as InboxItem,
        ...items,
      ];
      setItems(nextItems);
      setDemoInbox(nextItems);
      onCountChange?.(nextItems.length);
      setCapture("");
      setIsSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsSaving(false);
      setMessage("Sesi Anda berakhir. Silakan masuk kembali.");
      return;
    }
    const { data, error } = await supabase
      .from("inbox_items")
      .insert({ raw_text: rawText, user_id: user.id })
      .select()
      .single();
    setIsSaving(false);
    if (error) {
      console.error("Inbox capture error:", error);
      setMessage(
        "Catatan tidak dapat disimpan. Periksa koneksi lalu coba lagi.",
      );
      return;
    }
    const nextItems = [data as InboxItem, ...items];
    setItems(nextItems);
    onCountChange?.(nextItems.length);
    setCapture("");
  }

  async function updateItem(id: string, status: "processed" | "archived") {
    if (!supabase) {
      const nextItems = items
        .filter((item) => item.id !== id)
        .map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                processed_at:
                  status === "processed"
                    ? new Date().toISOString()
                    : item.processed_at,
              }
            : item,
        );
      setItems(nextItems.filter((item) => item.status === "unprocessed"));
      setDemoInbox(nextItems);
      onCountChange?.(
        nextItems.filter((item) => item.status === "unprocessed").length,
      );
      return;
    }

    const values =
      status === "processed"
        ? { status, processed_at: new Date().toISOString() }
        : { status };
    const { error } = await supabase
      .from("inbox_items")
      .update(values)
      .eq("id", id);
    if (error) {
      console.error("Inbox update error:", error);
      setMessage("Catatan tidak dapat diperbarui. Silakan coba lagi.");
      return;
    }
    const nextItems = items.filter((item) => item.id !== id);
    setItems(nextItems);
    onCountChange?.(nextItems.length);
  }

  return (
    <div className="page-wrap inbox-page">
      <section className="page-heading">
        <div>
            <p className="eyebrow accent-text">INFORMASI BELUM DIATUR</p>
              <h1>Kotak masuk Anda.</h1>
          <p className="heading-subtitle">
            Tangkap sekarang. Tambahkan konteks saat Anda siap.
          </p>
        </div>
      </section>
      <form className="inbox-capture" onSubmit={handleCapture}>
        <span className="capture-plus" aria-hidden="true">
          +
        </span>
        <input
          autoFocus
          aria-label="Capture academic information"
          maxLength={500}
          value={capture}
          onChange={(event) => setCapture(event.target.value)}
          placeholder="What do you need to remember?"
        />
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Menyimpan..." : "Tangkap"}
        </button>
      </form>
      {message && (
        <div className="course-message" role="alert">
          {message}
        </div>
      )}
      <div className="inbox-heading">
        <div>
          <p className="eyebrow">UNTUK DIATUR</p>
          <h2>
            {items.length} {items.length === 1 ? "catatan" : "catatan"} menunggu konteks
          </h2>
        </div>
      </div>
      {isLoading ? (
        <div className="course-state">Memuat kotak masuk Anda...</div>
      ) : items.length === 0 ? (
        <div className="course-empty">
          <span className="empty-mark">+</span>
          <h2>Belum ada yang perlu diatur.</h2>
          <p>Tangkap pesan, deadline, atau pengingat saat muncul.</p>
        </div>
      ) : (
        <div className="inbox-list">
          {items.map((item) => (
            <article className="inbox-item" key={item.id}>
              <div className="inbox-item-mark" aria-hidden="true">
                +
              </div>
              <div className="inbox-item-content">
                <p>{item.raw_text}</p>
                <span>
                  Ditangkap {new Date(item.captured_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              <div className="inbox-actions">
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    onContextualize
                      ? onContextualize(item)
                      : void updateItem(item.id, "processed")
                  }
                >
                  Tambah konteks
                </button>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => void updateItem(item.id, "archived")}
                >
                  Arsipkan
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
