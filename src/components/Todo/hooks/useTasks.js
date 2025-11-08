import { useState } from "react";
import firebaseDB from "../../../firebase";

const getRef = (path) => {
  if (!firebaseDB) return null;
  const p = String(path || "").trim();
  if (!p) {
    return typeof firebaseDB.child === "function"
      ? firebaseDB.child("ToDo")
      : firebaseDB.ref("ToDo");
  }
  return typeof firebaseDB.child === "function" 
    ? firebaseDB.child(p) 
    : firebaseDB.ref(p);
};

export const useTasks = (currentUser, users, notify) => {
  const [loading, setLoading] = useState(false);

  const pushHistory = async (taskId, entry) => {
    const now = Date.now();
    try {
      await getRef(`ToDo/${taskId}/history/${now}`).set({
        ...entry,
        user: currentUser.id,
        userName: currentUser.name,
        timestamp: now,
      });
      await getRef(`ToDo/${taskId}`).update({ updatedAt: now });
    } catch (err) {
      console.error("Failed to push history", err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    setLoading(true);
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}`);
      await ref.update({ status: newStatus, updatedAt: now });
      await pushHistory(taskId, {
        action: "status_changed",
        field: "status",
        from: null,
        to: newStatus,
      });
      notify("Status updated");
    } catch (error) {
      console.error("Failed to update task status:", error);
      notify("Failed to update status", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateTaskField = async (taskId, field, value) => {
    setLoading(true);
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}`);
      await ref.update({ [field]: value, updatedAt: now });
      
      await pushHistory(taskId, {
        action: "field_updated",
        field,
        from: null,
        to: value,
      });

      if (field === "assignedTo") {
        const u = users[value] || {};
        await ref.update({
          assignedToName: u.name || value,
          assignedToAvatar: u.photoURL || "",
        });
      }
      
      notify("Field updated");
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      notify(`Failed to update ${field}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId) => {
    setLoading(true);
    try {
      await getRef(`ToDo/${taskId}`).remove();
      notify("Task deleted");
    } catch (error) {
      console.error("Failed to delete task:", error);
      notify("Failed to delete task", "error");
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (taskId, text) => {
    const body = (text || "").trim();
    if (!body) return;
    
    setLoading(true);
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}/comments`);
      const payload = {
        text: body,
        author: currentUser.id,
        authorName: currentUser.name,
        authorPhoto: currentUser.photoURL || "",
        timestamp: now,
        type: "comment",
      };
      
      if (typeof ref.push === "function") {
        await ref.push(payload);
      } else {
        await getRef(`ToDo/${taskId}/comments/${now}`).set(payload);
      }
      
      await pushHistory(taskId, {
        action: "comment_added",
        field: "comment",
        from: null,
        to: body.slice(0, 80),
      });
      
      notify("Comment added");
    } catch (error) {
      console.error("Failed to add comment:", error);
      notify("Failed to add comment", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add other task-related functions as needed (addSubtask, attachFiles, removeAttachment, etc.)

  return {
    loading,
    updateTaskStatus,
    updateTaskField,
    deleteTask,
    addComment,
    // Include other functions you need
  };
};