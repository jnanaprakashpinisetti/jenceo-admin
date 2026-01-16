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

export default function Profile() {
  const { user } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [showFullActivity, setShowFullActivity] = useState(false);

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
    idFromQuery || user?.dbId || user?.id || user?.key || ""
  );

  // DB ID resolution (keep existing logic)
  useEffect(() => {
    const resolveDbId = async () => {
      if (dbId) return;
      // ... existing dbId resolution logic
    };
    resolveDbId();
  }, [dbId]);

  const profilePath = useMemo(() => (dbId ? `Users/${dbId}/profile` : ""), [dbId]);

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
        const snap = await firebaseDB.child(profilePath).get();
        if (snap.exists()) {
          const data = snap.val() || {};
          setForm((f) => ({
            ...f,
            ...data,
            email: data.email || f.email || user?.email || "",
            name: data.name || f.name || user?.name || "",
          }));
          setAvatarPreview(data.photoURL || "");
          setCoverPreview(data.coverURL || "");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profilePath]);

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

      await firebaseDB.child(profilePath).set(toSave);
      await firebaseDB.child(`Users/${dbId}`).update({
        name: toSave.name || "",
        photoURL: toSave.photoURL || "",
        updatedAt: toSave.updatedAt,
      });

      setForm(toSave);
      setSavedAt(new Date());
    } catch (e) {
      console.error(e);
      setErr("Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!dbId) {
    return (
      <div className="container py-5">
        <div className="alert alert-info">
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
        handleAvatarPick={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const previewURL = URL.createObjectURL(file);
            setAvatarPreview(previewURL);
            setForm(f => ({ ...f, photoURL: previewURL }));
          }
        }}
        handleCoverPick={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const previewURL = URL.createObjectURL(file);
            setCoverPreview(previewURL);
            setForm(f => ({ ...f, coverURL: previewURL }));
          }
        }}
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
                  <div className="text-muted">Loading profile…</div>
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
                        <input className="form-control" value={form.email} readOnly />
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
                        <div className="chips">
                          {(form.languages || []).map((l) => (
                            <span className="chip" key={l} onClick={() => removeChip("languages", l)} title="Remove">
                              {l} ✕
                            </span>
                          ))}
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
                        <div className="chips">
                          {(form.skills || []).map((s) => (
                            <span className="chip" key={s} onClick={() => removeChip("skills", s)} title="Remove">
                              {s} ✕
                            </span>
                          ))}
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
                        {saving ? "Saving..." : "Save changes"}
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
                  <ActivityTable userId={user?.uid} />
                ) : (
                  <LoginActivityCards 
                    userId={user?.uid}
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
            <SecurityInsights userId={user?.uid} />
          )}
        </div>

        <div className="col-lg-4">
          {/* Right column components can be added here */}
        </div>
      </div>

      
    </div>
  );
}