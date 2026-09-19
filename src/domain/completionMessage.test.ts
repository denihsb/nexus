import { describe, expect, it } from "vitest";
import { getCompletionMessage } from "./completionMessage";
import type { Task } from "../features/tasks/TasksPage";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "t1",
    title: "Tugas contoh",
    status: "completed",
    importance: 1,
    effort_minutes: 30,
    due_at: null,
    ...overrides,
  } as Task;
}

describe("getCompletionMessage", () => {
  it("keeps the message plain for a low-importance, low-effort task", () => {
    const task = makeTask({ importance: 1, effort_minutes: 20 });
    expect(getCompletionMessage(task)).toBe('"Tugas contoh" selesai.');
  });

  it("uses a stronger acknowledgment for high-importance tasks", () => {
    const task = makeTask({ importance: 3, effort_minutes: 20 });
    expect(getCompletionMessage(task)).toBe(
      'Tugas berbobot ini terselesaikan dengan baik: "Tugas contoh".',
    );
  });

  it("uses a stronger acknowledgment for high-effort tasks regardless of importance", () => {
    const task = makeTask({ importance: 1, effort_minutes: 200 });
    expect(getCompletionMessage(task)).toBe(
      'Tugas berbobot ini terselesaikan dengan baik: "Tugas contoh".',
    );
  });

  it("uses the mid-tier message for moderately important/effortful tasks", () => {
    const task = makeTask({ importance: 2, effort_minutes: 40 });
    expect(getCompletionMessage(task)).toBe('"Tugas contoh" terselesaikan.');
  });

  it("never uses a casual/exclamatory tone", () => {
    const tasks = [
      makeTask({ importance: 1 }),
      makeTask({ importance: 2 }),
      makeTask({ importance: 3 }),
    ];
    for (const task of tasks) {
      const message = getCompletionMessage(task);
      expect(message).not.toMatch(/kamu|hebat|wah|!/i);
    }
  });
});
