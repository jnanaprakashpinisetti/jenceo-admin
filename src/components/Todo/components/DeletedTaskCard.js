import React from "react";
import { fmtDT } from "../utils/helpers";
import { cn } from "../utils/helpers";

const DeletedTaskCard = ({ 
  task, 
  users, 
  hardDeleteTask, 
  restoreTask,
  notify 
}) => {
  const handleHardDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm(`Permanently delete "${task.title}"? This cannot be undone.`)) {
      try {
        await hardDeleteTask(task.id);
        notify("Task permanently deleted");
      } catch {
        notify("Failed to delete task", "error");
      }
    }
  };

  const handleRestore = async (e) => {
    e.stopPropagation();
    try {
      await restoreTask(task.id);
      notify("Task restored");
    } catch {
      notify("Failed to restore task", "error");
    }
  };

  return (
    <div className="deleted-task-card rounded-2 p-2 bg-dark bg-opacity-50">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="flex-grow-1">
          <div className="small text-white-80 mb-1">
            <strong>{task.ticketKey || `#${task.id.slice(-6)}`}</strong>: {task.title}
          </div>
          <div className="tiny text-muted-300">
            Project: {task.projectKey || "No project"} • 
            Deleted: {fmtDT(task.deletedAt)} by {task.deletedByName || "Unknown"}
          </div>
        </div>
        <div className="d-flex gap-1">
          <button
            className="btn btn-sm btn-outline-success"
            onClick={handleRestore}
            title="Restore task"
          >
            ↶
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={handleHardDelete}
            title="Delete permanently"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletedTaskCard;