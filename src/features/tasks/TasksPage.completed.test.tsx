import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabase: null,
}));

import { TasksPage } from "./TasksPage";

const TASK_KEY = "nexus-demo-tasks";
const COURSE_KEY = "nexus-demo-courses";

function seedDemoTask() {
  window.localStorage.setItem(
    TASK_KEY,
    JSON.stringify([
      {
        id: "task-1",
        user_id: "demo-user",
        course_id: null,
        inbox_item_id: null,
        title: "Tugas mata kuliah A",
        notes: "",
        due_at: null,
        effort_minutes: 60,
        importance: 2,
        status: "open",
        completed_at: null,
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]),
  );
  window.localStorage.setItem(COURSE_KEY, JSON.stringify([]));
}

describe("TasksPage — complete, Selesai tab, restore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedDemoTask();
  });

  it("keeps a completed task visible under the Selesai tab instead of deleting it", async () => {
    render(<TasksPage />);

    const completeButton = await screen.findByRole("button", {
      name: "Selesaikan Tugas mata kuliah A",
    });
    fireEvent.click(completeButton);

    // The task should disappear from the "Terbuka" (open) tab...
    await waitFor(() =>
      expect(
        screen.queryByText("Tugas mata kuliah A"),
      ).not.toBeInTheDocument(),
    );

    // ...but still exist and be visible under "Selesai", not deleted.
    fireEvent.click(screen.getByRole("tab", { name: "Selesai" }));
    expect(await screen.findByText("Tugas mata kuliah A")).toBeInTheDocument();
  });

  it("restores a task back to Terbuka via the Pulihkan button", async () => {
    render(<TasksPage />);

    const completeButton = await screen.findByRole("button", {
      name: "Selesaikan Tugas mata kuliah A",
    });
    fireEvent.click(completeButton);
    fireEvent.click(await screen.findByRole("tab", { name: "Selesai" }));

    const restoreButton = await screen.findByRole("button", {
      name: "Pulihkan",
    });
    fireEvent.click(restoreButton);

    fireEvent.click(screen.getByRole("tab", { name: "Terbuka" }));
    expect(
      await screen.findByText("Tugas mata kuliah A"),
    ).toBeInTheDocument();
  });

  it("restores a task via the transient undo toast", async () => {
    render(<TasksPage />);

    const completeButton = await screen.findByRole("button", {
      name: "Selesaikan Tugas mata kuliah A",
    });
    fireEvent.click(completeButton);

    const undoButton = await screen.findByRole("button", { name: "Urungkan" });
    fireEvent.click(undoButton);

    expect(
      await screen.findByText("Tugas mata kuliah A"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Selesaikan Tugas mata kuliah A" }),
    ).toBeInTheDocument();
  });
});
