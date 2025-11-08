export const CATEGORIES = {
  "Worker Call": "#22c55e",
  "Petty Cash": "#f59e0b",
  Client: "#3b82f6",
  Development: "#ec4899",
  Design: "#a855f7",
  HR: "#06b6d4",
  Finance: "#10b981",
  Admin: "#f97316",
  "IT Support": "#6366f1",
  Operations: "#0ea5e9",
  Sales: "#e11d48",
  Marketing: "#84cc16",
  Other: "#94a3b8",
};

export const PRIORITIES = {
  Lowest: "#6b7280",
  Low: "#84cc16",
  Medium: "#facc15",
  High: "#fb923c",
  Highest: "#ef4444",
};

export const STATUS = {
  "To Do": { bg: "linear-gradient(135deg,#2b2f43,#353c5a)", border: "#6b7280" },
  "In Progress": {
    bg: "linear-gradient(135deg,#19324a,#1f4a75)",
    border: "#3b82f6",
  },
  "In Review": {
    bg: "linear-gradient(135deg,#7c2d12,#9a3412)",
    border: "#ea580c",
  },
  Done: { bg: "linear-gradient(135deg,#183a2b,#1e4d38)", border: "#22c55e" },
};

export const ISSUE_TYPES = {
  Story: { icon: "📖", color: "#3b82f6" },
  Task: { icon: "✓", color: "#22c55e" },
  Bug: { icon: "🐛", color: "#ef4444" },
  Epic: { icon: "⚡", color: "#8b5cf6" },
  SubTask: { icon: "🔹", color: "#6b7280" },
};

export const PROJECT_TYPES = {
  Product: { icon: "📦", color: "#3b82f6" },
  Engineering: { icon: "⚙️", color: "#10b981" },
  Design: { icon: "🎨", color: "#8b5cf6" },
  Marketing: { icon: "📢", color: "#ec4899" },
  HR: { icon: "👥", color: "#06b6d4" },
  Finance: { icon: "💰", color: "#84cc16" },
  Operations: { icon: "🔧", color: "#f59e0b" },
  "IT Support": { icon: "💻", color: "#6366f1" },
  Admin: { icon: "📋", color: "#6b7280" },
};

export const PROJECT_STATUS = {
  Active: { color: "#22c55e" },
  "On Hold": { color: "#f59e0b" },
  Archived: { color: "#6b7280" },
};

export const VISIBILITY_OPTIONS = {
  Private: "👤 Private",
  Team: "👥 Team", 
  Org: "🏢 Organization"
};

export const TICKET_KEYS = ["JEN", "OPS", "CRM", "FIN", "HR"];