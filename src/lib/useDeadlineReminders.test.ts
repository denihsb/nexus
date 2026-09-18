import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDeadlineReminders } from "./useDeadlineReminders";
import type { Task } from "../features/tasks/TasksPage";

const HOUR = 60 * 60 * 1000;

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "Untitled",
    status: "open",
    due_at: null,
    effort_minutes: 60,
    ...overrides,
  } as Task;
}

describe("useDeadlineReminders", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes an open task due within 24 hours", () => {
    const tasks = [
      makeTask({
        id: "a",
        due_at: new Date(Date.now() + 3 * HOUR).toISOString(),
      }),
    ];
    const { result } = renderHook(() => useDeadlineReminders(tasks));
    expect(result.current.map((t) => t.id)).toEqual(["a"]);
  });

  it("excludes tasks due further than 24 hours away", () => {
    const tasks = [
      makeTask({
        id: "b",
        due_at: new Date(Date.now() + 48 * HOUR).toISOString(),
      }),
    ];
    const { result } = renderHook(() => useDeadlineReminders(tasks));
    expect(result.current).toEqual([]);
  });

  it("excludes tasks that are not open", () => {
    const tasks = [
      makeTask({
        id: "c",
        status: "completed",
        due_at: new Date(Date.now() + 3 * HOUR).toISOString(),
      }),
    ];
    const { result } = renderHook(() => useDeadlineReminders(tasks));
    expect(result.current).toEqual([]);
  });

  it("excludes already-overdue tasks", () => {
    const tasks = [
      makeTask({
        id: "d",
        due_at: new Date(Date.now() - HOUR).toISOString(),
      }),
    ];
    const { result } = renderHook(() => useDeadlineReminders(tasks));
    expect(result.current).toEqual([]);
  });

  it("does not loop or throw when given a stable task array across re-renders", () => {
    // Regression guard: passing a memoized (reference-stable) array used to
    // be fine, but an earlier version of the calling code passed a freshly
    // filtered array on every render, which combined with this hook's
    // effect caused an infinite render loop. Re-rendering with the SAME
    // array reference repeatedly should settle immediately, not hang.
    const tasks = [
      makeTask({ id: "e", due_at: new Date(Date.now() + HOUR).toISOString() }),
    ];
    const { result, rerender } = renderHook(
      ({ t }: { t: Task[] }) => useDeadlineReminders(t),
      { initialProps: { t: tasks } },
    );
    for (let i = 0; i < 5; i += 1) {
      rerender({ t: tasks });
    }
    expect(result.current.map((t) => t.id)).toEqual(["e"]);
  });
});
