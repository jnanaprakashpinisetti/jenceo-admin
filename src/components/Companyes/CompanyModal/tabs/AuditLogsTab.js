import React from "react";

const AuditLogsTab = ({ formData, expandedLogIndex, setExpandedLogIndex, formatDDMMYY, formatTime12h }) => {
  const logs = Array.isArray(formData.fullAuditLogs) ? formData.fullAuditLogs : [];
  
  // Sort logs by date (newest first)
  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  const formatChange = (change) => {
    if (!change) return "No changes";
    
    if (change.type === "summary") {
      return change.message || "Summary change";
    }
    
    if (change.type === "full") {
      return `Changed ${change.field} from '${change.before || "(empty)"}' to '${change.after || "(empty)"}'`;
    }
    
    return JSON.stringify(change);
  };

  const getChangeTypeColor = (type) => {
    switch (type) {
      case "create": return "success";
      case "update": return "primary";
      case "delete": return "danger";
      case "status": return "warning";
      default: return "secondary";
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Audit Logs</h5>
        <span className="badge bg-info">{sortedLogs.length} log entries</span>
      </div>

      {sortedLogs.length === 0 ? (
        <div className="alert alert-info text-center text-info">
          <i className="bi bi-info-circle me-2"></i>
          No audit logs available for this company.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-hover">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>User</th>
                <th>Type</th>
                <th>Changes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map((log, index) => (
                <React.Fragment key={index}>
                  <tr>
                    <td>
                      <div className="small">
                        {log.dateLabel || formatDDMMYY(log.date)}
                      </div>
                      <div className="text-muted smaller">
                        {formatTime12h(log.date)}
                      </div>
                    </td>
                    <td>
                      <strong>{log.user || "System"}</strong>
                    </td>
                    <td>
                      <span className={`badge bg-${getChangeTypeColor(log.type || "update")}`}>
                        {log.type || "update"}
                      </span>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: "300px" }}>
                        {log.message || formatChange(log.changes?.[0])}
                        {log.changes && log.changes.length > 1 && ` (+${log.changes.length - 1} more)`}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => setExpandedLogIndex(expandedLogIndex === index ? null : index)}
                      >
                        {expandedLogIndex === index ? "Hide" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {expandedLogIndex === index && (
                    <tr>
                      <td colSpan="5" className="bg-dark">
                        <div className="p-3">
                          <h6>Detailed Changes</h6>
                          <ul className="list-unstyled mb-0">
                            {Array.isArray(log.changes) ? (
                              log.changes.map((change, idx) => (
                                <li key={idx} className="mb-2">
                                  <div className="d-flex">
                                    <div className="me-3">
                                      <span className={`badge bg-${getChangeTypeColor(change.type)}`}>
                                        {change.type || "change"}
                                      </span>
                                    </div>
                                    <div>
                                      <strong>{change.field || change.friendly || "Field"}:</strong>
                                      <span className="text-muted ms-2">
                                        '{change.before || "(empty)"}' → '{change.after || "(empty)"}'
                                      </span>
                                    </div>
                                  </div>
                                </li>
                              ))
                            ) : (
                              <li className="text-muted">No detailed change data available</li>
                            )}
                          </ul>
                          {log.notes && (
                            <div className="mt-2">
                              <strong>Notes:</strong> {log.notes}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="alert alert-secondary mt-3">
        <h6 className="alert-heading"><i className="bi bi-history me-2"></i>About Audit Logs</h6>
        <p className="mb-0 small">
          Audit logs track all changes made to this company record. Each entry includes the date, time,
          user who made the change, and details of what was modified. This helps maintain transparency
          and accountability for all data modifications.
        </p>
      </div>
    </div>
  );
};

export default AuditLogsTab;