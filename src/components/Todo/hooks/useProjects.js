import { useState, useEffect } from "react";
import firebaseDB from "../../../firebase";

const getRef = (path) => {
  // Use your existing firebaseDB instance
  const firebaseDB = require("../../../firebase").default;
  if (!firebaseDB) return null;
  const p = String(path || "").trim();
  if (!p) {
    return typeof firebaseDB.child === "function" ?
      firebaseDB.child("Projects") :
      firebaseDB.ref("Projects");
  }
  return typeof firebaseDB.child === "function" ?
    firebaseDB.child(p) :
    firebaseDB.ref(p);
};

export const useProjects = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const ref = getRef("Projects");
    if (!ref) return;

    const cb = (snap) => {
      const val = snap.val?.() ?? snap;
      const obj = val || {};
      const list = Object.entries(obj).map(([id, v]) => ({
        id,
        ...v,
      }));
      list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      setProjects(list);
    };

    try {
      if (typeof ref.on === "function") {
        ref.on("value", cb);
        return () => {
          try {
            ref.off("value", cb);
          } catch {}
        };
      }
      ref.once?.("value", (s) => cb(s));
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }, []);

  const createProject = async (projectData) => {
    try {
      const now = Date.now();
      const ref = getRef("Projects");
      const project = {
        ...projectData,
        createdAt: now,
        updatedAt: now,
        sequence: 0,
      };

      let projectId;
      if (typeof ref.push === "function") {
        const res = await ref.push(project);
        projectId = res.key;
      } else {
        projectId = String(now);
        await getRef(`Projects/${projectId}`).set(project);
      }

      return projectId;
    } catch (error) {
      console.error("Failed to create project:", error);
      throw error;
    }
  };

  const incrementProjectSeq = async (projectId) => {
    try {
      const ref = getRef(`Projects/${projectId}/sequence`);
      let nextSeq = 1;
      
      if (typeof ref.transaction === "function") {
        await ref.transaction((curr) => {
          nextSeq = (curr || 0) + 1;
          return nextSeq;
        });
      } else {
        const snap = await ref.get?.();
        const curr = snap?.val?.() ?? snap?.val ?? 0;
        nextSeq = (Number(curr) || 0) + 1;
        await ref.set(nextSeq);
      }
      
      return nextSeq;
    } catch (error) {
      console.error("Failed to increment project sequence:", error);
      throw error;
    }
  };

  const softDeleteTask = async (taskId, user) => {
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}`);
      await ref.update({
        deleted: true,
        deletedAt: now,
        deletedBy: user.id,
        deletedByName: user.name,
        updatedAt: now,
      });
    } catch (error) {
      console.error("Failed to soft delete task:", error);
      throw error;
    }
  };

  return {
    projects,
    createProject,
    incrementProjectSeq,
    softDeleteTask,
  };
};