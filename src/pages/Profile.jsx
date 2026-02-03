// src/pages/Profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import firebaseDB from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";

// Import components
import ProfileHeader from "../components/Profile/ProfileHeader";
import ProfileTabs from "../components/Profile/ProfileTabs";
import SecuritySettings from "../components/Profile/SecuritySettings";
import LoginActivityCards from "../components/Profile/LoginActivityCards";
import ActivityTable from "../components/Profile/ActivityTable";
import SecurityInsights from "../components/Profile/SecurityInsights";
import SecurityDashboard from "../components/Profile/SecurityDashboard";
import ReportSuspiciousActivity from "../components/Profile/ReportSuspiciousActivity";
import SuspiciousActivityReports from '../components/Profile/SuspiciousActivityReports';

export default function Profile() {
  const { user } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [showFullActivity, setShowFullActivity] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [has2FA, setHas2FA] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    about: "",
    location: "",
    languages: [],
    skills: [],
    photoURL: "",
    coverURL: "",
    social: { linkedin: "", twitter: "", instagram: "" },
  });

  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  const langInputRef = useRef(null);
  const skillInputRef = useRef(null);

  const knownLanguages = [
    "Telugu", "English", "Hindi", "Urdu", "Kannada", "Malayalam", "Tamil", "Bengali", "Marathi",
  ];
  const knownSkills = [
    "UI/UX", "JavaScript", "React", "Angular", "Photoshop", "Illustrator", "CorelDraw", "Premiere Pro", "Cinema 4D", "Branding", "Wireframes",
  ];

  const locationHook = useLocation();
  const searchParams = new URLSearchParams(locationHook.search);
  const idFromQuery = (searchParams.get("id") || "").trim();

  const [dbId, setDbId] = useState(
    idFromQuery || user?.dbId || user?.id || user?.key || user?.uid || ""
  );

  // DB ID resolution - Fixed query path
  useEffect(() => {
    const resolveDbId = async () => {
      if (dbId) return;
      if (user?.uid) {
        try {
          // Try different query paths based on your database structure
          const userSnap = await firebaseDB.child(`Users`).orderByChild("authId").equalTo(user.uid).limitToFirst(1).once('value');
          if (userSnap.exists()) {
            const userData = userSnap.val();
            const userId = Object.keys(userData)[0];
            setDbId(userId);
          } else {
            // If not found, try uid directly
            const directSnap = await firebaseDB.child(`Users/${user.uid}`).once('value');
            if (directSnap.exists()) {
              setDbId(user.uid);
            } else {
              // Fallback to user.uid
              setDbId(user.uid);
            }
          }
        } catch (error) {
          console.error("Error resolving user ID:", error);
          // Fallback to user.uid
          setDbId(user.uid);
        }
      }
    };
    resolveDbId();
  }, [dbId, user?.uid]);

  // Check 2FA status
  useEffect(() => {
    const check2FAStatus = async () => {
      if (!dbId) return;
      try {
        const userSnap = await firebaseDB.child(`Users/${dbId}`).once('value');
        if (userSnap.exists()) {
          const userData = userSnap.val();
          setHas2FA(userData?.has2FA || false);
        }
      } catch (error) {
        console.error("Error checking 2FA status:", error);
      }
    };
    check2FAStatus();
  }, [dbId]);

  const profilePath = useMemo(() => {
    if (!dbId) return "";
    // Check if using JenCeo-DataBase structure
    return `Users/${dbId}/profile`;
  }, [dbId]);

  const onChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addChip = (k, v) => {
    const val = String(v || "").trim();
    if (!val) return;
    setForm((f) => {
      const arr = Array.isArray(f[k]) ? f[k] : [];
      if (arr.includes(val)) return f;
      return { ...f, [k]: [...arr, val] };
    });
  };
  const removeChip = (k, v) =>
    setForm((f) => ({ ...f, [k]: (f[k] || []).filter((x) => x !== v) }));

  // Load profile
  useEffect(() => {
    const load = async () => {
      if (!profilePath) return;
      setLoading(true);
      try {
        const snap = await firebaseDB.child(profilePath).once('value');
        if (snap.exists()) {
          const data = snap.val() || {};
          setForm((f) => ({
            ...f,
            ...data,
            email: data.email || f.email || user?.email || "",
            name: data.name || f.name || user?.name || "",
            social: data.social || { linkedin: "", twitter: "", instagram: "" }
          }));
          setAvatarPreview(data.photoURL || "");
          setCoverPreview(data.coverURL || "");
        }
      } catch (e) {
        console.error("Error loading profile:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profilePath, user?.email, user?.name]);

  // Save profile
  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!profilePath) return;

    setSaving(true);
    setErr("");
    try {
      const toSave = {
        ...form,
        updatedAt: new Date().toISOString(),
      };

      // Save to profile path
      await firebaseDB.child(profilePath).set(toSave);
      
      // Also update main user record
      await firebaseDB.child(`Users/${dbId}`).update({
        name: toSave.name || "",
        photoURL: toSave.photoURL || "",
        email: toSave.email || "",
        updatedAt: toSave.updatedAt,
      });

      setForm(toSave);
      setSavedAt(new Date());
      
      // Show success message
      setTimeout(() => {
        setSavedAt(null);
      }, 3000);
      
    } catch (e) {
      console.error("Save error:", e);
      setErr("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      // Create preview
      const previewURL = URL.createObjectURL(file);
      setAvatarPreview(previewURL);
      setForm(f => ({ ...f, photoURL: previewURL }));
      
      // In a real app, you would upload to Firebase Storage here
      // For now, we'll just use the preview URL
      
    } catch (error) {
      console.error("Error handling avatar:", error);
      setErr("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      // Create preview
      const previewURL = URL.createObjectURL(file);
      setCoverPreview(previewURL);
      setForm(f => ({ ...f, coverURL: previewURL }));
      
      // In a real app, you would upload to Firebase Storage here
      
    } catch (error) {
      console.error("Error handling cover:", error);
      setErr("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  if (!dbId) {
    return (
      <div className="container py-5">
        <div className="alert alert-info text-center">
          <div className="spinner-border spinner-border-sm me-2"></div>
          Resolving your profile record…
        </div>
      </div>
    );
  }

  return (
    <div className="container py-3 profile-fade-in">
      {uploading && (
        <div className="alert alert-info text-center">
          <div className="spinner-border spinner-border-sm me-2"></div>
          Uploading image...
        </div>
      )}

      <ProfileHeader
        form={form}
        uploading={uploading}
        savedAt={savedAt}
        handleAvatarPick={handleAvatarPick}
        handleCoverPick={handleCoverPick}
        handleSave={handleSave}
        saving={saving}
      />

      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="row g-4">
        <div className="col-lg-8">
          {activeTab === 'profile' && (
            <form className="border-0 shadow-soft mb-4" onSubmit={handleSave}>
              <div className="card-body p-3 p-md-4">
                {err && <div className="alert alert-danger">{err}</div>}
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-info" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-2">Loading profile...</p>
                  </div>
                ) : (
                  <>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Name</label>
                        <input
                          className="form-control"
                          value={form.name}
                          onChange={(e) => onChange("name", e.target.value)}
                          placeholder="Your full name"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input 
                          className="form-control" 
                          value={form.email} 
                          readOnly 
                          disabled
                        />
                        <small className="text-muted">Contact support to change email</small>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Phone</label>
                        <input
                          className="form-control"
                          value={form.phone}
                          onChange={(e) => onChange("phone", e.target.value)}
                          placeholder="e.g. 9876543210"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Location</label>
                        <input
                          className="form-control"
                          value={form.location}
                          onChange={(e) => onChange("location", e.target.value)}
                          placeholder="City, Country"
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">About</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={form.about}
                          onChange={(e) => onChange("about", e.target.value)}
                          placeholder="Tell us a little about yourself…"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Languages</label>
                        <div className="d-flex gap-2 mb-2">
                          <input
                            ref={langInputRef}
                            className="form-control"
                            placeholder="Add a language and press Enter"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addChip("languages", e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                            list="langList"
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              const v = langInputRef.current?.value || "";
                              addChip("languages", v);
                              if (langInputRef.current) langInputRef.current.value = "";
                            }}
                          >
                            Add
                          </button>
                        </div>
                        <datalist id="langList">
                          {knownLanguages.map((l) => (
                            <option key={l} value={l} />
                          ))}
                        </datalist>
                        <div className="chips mt-2">
                          {(form.languages || []).map((l) => (
                            <span className="chip" key={l} onClick={() => removeChip("languages", l)} title="Remove">
                              {l} <i className="bi bi-x ms-1"></i>
                            </span>
                          ))}
                          {(!form.languages || form.languages.length === 0) && (
                            <small className="text-muted">No languages added yet</small>
                          )}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Skills</label>
                        <div className="d-flex gap-2 mb-2">
                          <input
                            ref={skillInputRef}
                            className="form-control"
                            placeholder="Add a skill and press Enter"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addChip("skills", e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                            list="skillList"
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              const v = skillInputRef.current?.value || "";
                              addChip("skills", v);
                              if (skillInputRef.current) skillInputRef.current.value = "";
                            }}
                          >
                            Add
                          </button>
                        </div>
                        <datalist id="skillList">
                          {knownSkills.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                        <div className="chips mt-2">
                          {(form.skills || []).map((s) => (
                            <span className="chip" key={s} onClick={() => removeChip("skills", s)} title="Remove">
                              {s} <i className="bi bi-x ms-1"></i>
                            </span>
                          ))}
                          {(!form.skills || form.skills.length === 0) && (
                            <small className="text-muted">No skills added yet</small>
                          )}
                        </div>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">LinkedIn</label>
                        <input
                          className="form-control"
                          value={form.social?.linkedin || ""}
                          onChange={(e) => onChange("social", { ...form.social, linkedin: e.target.value })}
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Twitter (X)</label>
                        <input
                          className="form-control"
                          value={form.social?.twitter || ""}
                          onChange={(e) => onChange("social", { ...form.social, twitter: e.target.value })}
                          placeholder="https://x.com/username"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Instagram</label>
                        <input
                          className="form-control"
                          value={form.social?.instagram || ""}
                          onChange={(e) => onChange("social", { ...form.social, instagram: e.target.value })}
                          placeholder="https://instagram.com/username"
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-end mt-4">
                      <button className="btn btn-primary" type="submit" disabled={saving || uploading}>
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Saving...
                          </>
                        ) : "Save changes"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <SecuritySettings user={user} savedAt={savedAt} />
          )}

          {activeTab === 'activity' && (
            <div className="border-0 shadow-soft mb-4">
              <div className="card-body p-3 p-md-4">
                {showFullActivity ? (
                  <ActivityTable userId={dbId} />
                ) : (
                  <LoginActivityCards 
                    userId={dbId}
                    onViewFullLog={() => setShowFullActivity(true)}
                  />
                )}
                {showFullActivity && (
                  <button 
                    className="btn btn-outline-secondary w-100 mt-3"
                    onClick={() => setShowFullActivity(false)}
                  >
                    <i className="bi bi-chevron-up me-2"></i>
                    Back to Recent Activity
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <SecurityInsights userId={dbId} />
          )}

          {activeTab === 'reports' && (
            <SuspiciousActivityReports userId={dbId} />
          )}
        </div>

        <div className="col-lg-4">
          {/* Right column components */}
          <div className="sticky-top" style={{ top: '20px' }}>
            
            {/* Quick Security Dashboard - Always visible */}
            {activeTab !== 'insights' && (
              <div className="mb-4">
                <SecurityDashboard userId={dbId} />
              </div>
            )}
            
            {/* Quick Report Button - Always visible */}
            <div className="mb-4">
              <div className="card border-0 shadow-soft">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="mb-1">Quick Security Actions</h6>
                      <small className="text-muted">Take immediate action if needed</small>
                    </div>
                    <button 
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => setShowReportForm(true)}
                      disabled={showReportForm}
                    >
                      <i className="bi bi-flag"></i>
                    </button>
                  </div>
                  
                  <div className="d-grid gap-2 mt-3">
                    <button 
                      className="btn btn-outline-info btn-sm"
                      onClick={() => setActiveTab('security')}
                    >
                      <i className="bi bi-shield-lock me-2"></i>
                      Security Settings
                    </button>
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setActiveTab('activity')}
                    >
                      <i className="bi bi-clock-history me-2"></i>
                      View Activity Logs
                    </button>
                    <button 
                      className="btn btn-outline-success btn-sm"
                      onClick={() => setActiveTab('insights')}
                    >
                      <i className="bi bi-graph-up me-2"></i>
                      Security Insights
                    </button>
                    <button 
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => setActiveTab('reports')}
                    >
                      <i className="bi bi-flag me-2"></i>
                      View Reports
                    </button>
                  </div>
                </div>
              </div>
            )
            
            {/* Report Suspicious Activity Form - Only shows when triggered */}
            {showReportForm && (
              <div className="mb-4">
                <ReportSuspiciousActivity 
                  userId={dbId} 
                  onClose={() => setShowReportForm(false)}
                />
              </div>
            )}
            
            {/* Security Status Card */}
            <div className="card border-0 shadow-soft mb-4">
              <div className="card-body p-3">
                <h6 className="mb-3">
                  <i className="bi bi-shield-check me-2 text-success"></i>
                  Account Status
                </h6>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">2FA Status</small>
                  <span className={`badge bg-${has2FA ? 'success' : 'warning'}`}>
                    {has2FA ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">Profile Updated</small>
                  <small className="text-info">
                    {savedAt ? savedAt.toLocaleDateString() : 'Never'}
                  </small>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">Account Created</small>
                  <small className="text-muted">
                    {user?.metadata?.creationTime ? 
                      new Date(user.metadata.creationTime).toLocaleDateString() : 
                      'Unknown'}
                  </small>
                </div>
              </div>
            </div>
            
            {/* Security Tips */}
            <div className="card border-0" style={{ 
              background: 'linear-gradient(135deg, #0b1220 0%, #1a2332 100%)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div className="card-body p-3">
                <h6 className="text-light mb-3">
                  <i className="bi bi-lightbulb me-2 text-warning"></i>
                  Security Tips
                </h6>
                <ul className="list-unstyled text-light small">
                  <li className="mb-2">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Use strong, unique passwords
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Enable 2FA for extra security
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Regularly review active sessions
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Report suspicious activity immediately
                  </li>
                  <li className="mb-0">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Keep your recovery email updated
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for chips */}
      <style jsx="true">{`
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          min-height: 2.5rem;
          align-items: center;
        }
        .chip {
          background: rgba(13, 110, 253, 0.1);
          border: 1px solid rgba(13, 110, 253, 0.2);
          color: #0d6efd;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chip:hover {
          background: rgba(13, 110, 253, 0.2);
          border-color: rgba(13, 110, 253, 0.3);
        }
        .chip i {
          font-size: 0.75rem;
          opacity: 0.7;
        }
        .profile-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
    </div>
  );
}