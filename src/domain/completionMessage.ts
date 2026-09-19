import type { Task } from "../features/tasks/TasksPage";

/**
 * Formal, acknowledgment-only completion message — calibrated to how
 * significant the task was (importance + effort). Never gushing ("kamu
 * hebat!"), never framed as emotional/psychological support — this is a
 * one-time, transient acknowledgment of effort, shown in the undo toast
 * right after a task is marked done. See the NEXUS product brief:
 * badges/achievements are explicitly out of scope, and this must not be
 * positioned as a "support system".
 */
export function getCompletionMessage(task: Task): string {
  const effort = task.effort_minutes ?? 0;
  const isHeavy = task.importance === 3 || effort > 180;
  const isNotable = task.importance === 2 || effort > 60;

  if (isHeavy) {
    return `Tugas berbobot ini terselesaikan dengan baik: "${task.title}".`;
  }
  if (isNotable) {
    return `"${task.title}" terselesaikan.`;
  }
  return `"${task.title}" selesai.`;
}
