// src/pages/Profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

// ⬇️ Adjust these two import paths if your project structure differs
import firebaseDB from "../firebase";            // e.g. ../firebase or ../../firebase
import { useAuth } from "../context/AuthContext"; // e.g. ../context/AuthContext

/**
 * User Profile (self-service)
 * - Loads/saves under: JenCeo-DataBase/Users/{uid}/profile
 * - Storage uploads are currently disabled (safe no-op), so ESLint won't complain.
 */
export default function Profile() {
  const { user } = useAuth() || {};
  const uid = user?.uid;
  const readOnlyEmail = user?.email || "";
  const readOnlyRole = user?.role || "Member";

  // ------- local state -------
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: user?.name || "",
    email: readOnlyEmail,
    phone: "",
    about: "",
    location: "",
    languages: [],
    skills: [],
    photoURL: "",
    coverURL: "",
    social: { linkedin: "", twitter: "", instagram: "" },
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  const langInputRef = useRef(null);
  const skillInputRef = useRef(null);

  const knownLanguages = [
    "Telugu",
    "English",
    "Hindi",
    "Urdu",
    "Kannada",
    "Malayalam",
    "Tamil",
    "Bengali",
    "Marathi",
  ];
  const knownSkills = [
    "UI/UX",
    "JavaScript",
    "React",
    "Angular",
    "Photoshop",
    "Illustrator",
    "CorelDraw",
    "Premiere Pro",
    "Cinema 4D",
    "Branding",
    "Wireframes",
  ];

  // ------- helpers -------
  const dbPath = useMemo(
    () => (uid ? `JenCeo-DataBase/Users/${uid}/profile` : null),
    [uid]
  );

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

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  // ------- load existing profile -------
  useEffect(() => {
    const load = async () => {
      if (!dbPath) return;
      setLoading(true);
      setErr("");
      try {
        const snap = await firebaseDB.child(dbPath).get();
        if (snap.exists()) {
          const data = snap.val() || {};
          setForm((f) => ({
            ...f,
            ...data,
            email: readOnlyEmail || data.email || "",
            name: data.name || user?.name || "",
          }));
          setAvatarPreview(data.photoURL || "");
          setCoverPreview(data.coverURL || "");
        }
      } catch (e) {
        console.error(e);
        setErr("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dbPath, readOnlyEmail, user?.name]);

  // ------- upload helpers (no-op; ESLint safe) -------
  // If/when you enable Firebase Storage, replace this with real upload code.
  const uploadIfPossible = async () => null;

  // ------- save -------
  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!uid || !dbPath) return;

    setSaving(true);
    setErr("");
    try {
      let newPhotoURL = form.photoURL;
      let newCoverURL = form.coverURL;

      // These return null for now (no-op). Hook up storage later if needed.
      if (avatarFile) {
        const url = await uploadIfPossible("avatar", avatarFile);
        if (url) newPhotoURL = url;
      }
      if (coverFile) {
        const url = await uploadIfPossible("cover", coverFile);
        if (url) newCoverURL = url;
      }

      const toSave = {
        ...form,
        email: readOnlyEmail,
        photoURL: newPhotoURL || form.photoURL || "",
        coverURL: newCoverURL || form.coverURL || "",
        updatedAt: new Date().toISOString(),
      };

      await firebaseDB.child(dbPath).set(toSave);
      setForm(toSave);
      setSavedAt(new Date());
      if (toSave.photoURL) setAvatarPreview(toSave.photoURL);
      if (toSave.coverURL) setCoverPreview(toSave.coverURL);
    } catch (e) {
      console.error(e);
      setErr("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!uid) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">Please log in to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="container py-3 profile-fade-in">
      {/* Cover */}
      <div className=" border-0 shadow-soft overflow-hidden mb-3">
        <div className="profile-cover position-relative">
          <img
            src={
              coverPreview ||
              form.coverURL ||
              "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1600"
            }
            alt="cover"
            className="w-100"
            style={{ maxHeight: 220, objectFit: "cover", filter: "saturate(1.05)" }}
          />
          <label className="btn btn-sm btn-light position-absolute" style={{ right: 16, bottom: 16 }}>
            Change cover
            <input type="file" accept="image/*" onChange={handleCoverPick} hidden />
          </label>
        </div>

        <div className="card-body p-3 p-md-4">
          <div className="d-flex align-items-center gap-3">
            {/* Avatar */}
            <div className="position-relative">
              <img
                src={
                  avatarPreview ||
                  form.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "User")}&background=0b1220&color=fff`
                }
                alt="avatar"
                className="rounded-circle shadow-soft"
                style={{ width: 96, height: 96, objectFit: "cover", border: "3px solid #fff" }}
              />
              <label
                className="btn btn-sm btn-outline-secondary position-absolute"
                style={{ right: -6, bottom: -6 }}
                title="Change avatar"
              >
                ✎
                <input type="file" accept="image/*" onChange={handleAvatarPick} hidden />
              </label>
            </div>

            <div className="flex-grow-1">
              <h4 className="mb-1">{form.name || "Your Name"}</h4>
              <div className="text-muted small">
                {readOnlyRole} • {form.location || "Add location"}
              </div>
              {!!savedAt && (
                <div className="text-success small mt-1">
                  Saved at {savedAt.toLocaleTimeString()}
                </div>
              )}
            </div>

            <div className="d-none d-md-flex align-items-center gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Scroll top
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form className=" border-0 shadow-soft mb-4" onSubmit={handleSave}>
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

                {/* Languages */}
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
                      <span
                        className="chip"
                        key={l}
                        onClick={() => removeChip("languages", l)}
                        title="Remove"
                      >
                        {l} ✕
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skills */}
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
                      <span
                        className="chip"
                        key={s}
                        onClick={() => removeChip("skills", s)}
                        title="Remove"
                      >
                        {s} ✕
                      </span>
                    ))}
                  </div>
                </div>

                {/* Social */}
                <div className="col-md-4">
                  <label className="form-label">LinkedIn</label>
                  <input
                    className="form-control"
                    value={form.social?.linkedin || ""}
                    onChange={(e) =>
                      onChange("social", { ...form.social, linkedin: e.target.value })
                    }
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Twitter (X)</label>
                  <input
                    className="form-control"
                    value={form.social?.twitter || ""}
                    onChange={(e) =>
                      onChange("social", { ...form.social, twitter: e.target.value })
                    }
                    placeholder="https://x.com/username"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Instagram</label>
                  <input
                    className="form-control"
                    value={form.social?.instagram || ""}
                    onChange={(e) =>
                      onChange("social", { ...form.social, instagram: e.target.value })
                    }
                    placeholder="https://instagram.com/username"
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end mt-4">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </>
          )}
        </div>
      </form>

      {/* Small tips card */}
      <div className=" border-0 shadow-soft">
        <div className="card-body p-3 p-md-4">
          <div className="small text-muted">
            Tip: Click on any language/skill chip to remove it. Your role is shown from your
            account (<em>{readOnlyRole}</em>).
          </div>
        </div>
      </div>

      {/* Scoped styles */}
      <style>{`
        .profile-fade-in { animation: pf-fade .35s ease-out both; }
        @keyframes pf-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }

        .shadow-soft { box-shadow: 0 10px 24px rgba(2,8,23,.08), 0 2px 8px rgba(2,8,23,.08); }
        .card.shadow-soft { border-radius: 16px; }
        .profile-cover img { border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }

        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip {
          background: #0b1220; color: #e2e8f0; border: 1px solid #1f2a44;
          padding: 6px 10px; border-radius: 999px; font-size: 12px; cursor: pointer;
          transition: transform .08s ease, background .15s ease;
        }
        .chip:hover { transform: translateY(-1px); background: #131c2f; }
      `}</style>
    </div>
  );
}
