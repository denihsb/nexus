import { useEffect, useState } from "react";
import type { Task } from "../features/tasks/TasksPage";

// "H-1": remind for tasks due within the next 24 hours.
const REMIND_WINDOW_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "nexus-deadline-reminders-shown";

type ReminderRecord = Record<string, string>; // taskId -> ISO date (day) last reminded

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readRecord(): ReminderRecord {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRecord(record: ReminderRecord) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage full/unavailable — reminder just won't be deduped, harmless.
  }
}

export type NotificationSupport =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.requestPermission();
}

/**
 * Checks open tasks for ones due within the reminder window (H-1) that
 * haven't already been reminded about today. Fires a browser notification
 * when permission is granted; either way, returns the qualifying list so
 * the caller can render an in-app banner — the guaranteed fallback that
 * works regardless of notification permission or browser support.
 *
 * NOTE: this only runs while the app is open/in the foreground. It cannot
 * wake the user up while the browser is fully closed — that requires Web
 * Push (VAPID keys + a server-side scheduler), which is not implemented
 * here.
 */
export function useDeadlineReminders(tasks: Task[]) {
  const [dueSoon, setDueSoon] = useState<Task[]>([]);

  useEffect(() => {
    if (tasks.length === 0) {
      setDueSoon([]);
      return;
    }

    const now = Date.now();
    const qualifying = tasks.filter((task) => {
      if (task.status !== "open" || !task.due_at) return false;
      const diff = new Date(task.due_at).getTime() - now;
      return diff > 0 && diff <= REMIND_WINDOW_MS;
    });
    setDueSoon(qualifying);

    if (qualifying.length === 0) return;

    const record = readRecord();
    const today = todayKey();
    const notYetRemindedToday = qualifying.filter(
      (task) => record[task.id] !== today,
    );
    if (notYetRemindedToday.length === 0) return;

    if (getNotificationSupport() === "granted") {
      const title =
        notYetRemindedToday.length === 1
          ? `Deadline mendekat: ${notYetRemindedToday[0].title}`
          : `${notYetRemindedToday.length} tugas mendekati deadline`;
      const body =
        notYetRemindedToday.length === 1
          ? "Jatuh tempo dalam 24 jam ke depan."
          : notYetRemindedToday.map((task) => `- ${task.title}`).join("\n");

      navigator.serviceWorker
        ?.getRegistration()
        .then((registration) => {
          if (registration) {
            return registration.showNotification(title, {
              body,
              icon: "/pwa-192x192.png",
            });
          }
          new Notification(title, { body, icon: "/pwa-192x192.png" });
        })
        .catch(() => {
          // Notification failing to show shouldn't break the in-app banner.
        });
    }

    const nextRecord = { ...record };
    for (const task of notYetRemindedToday) {
      nextRecord[task.id] = today;
    }
    writeRecord(nextRecord);
  }, [tasks]);

  return dueSoon;
}
