// src/pages/Profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

// ⬇️ Adjust paths if needed
import firebaseDB, { firebaseStorage, uploadFile, getDownloadURL } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom"

/**
 * User Profile (self-service)
 * Works with username-based login (no Firebase Auth UID).
 * - Resolves the user's DB key (e.g., "-OahSH...") by:
 *   1) user.dbId || user.id || user.key
 *   2) else scanning JenCeo-DataBase/Users to match username/name
 * - Persists under: JenCeo-DataBase/Users/{dbId}/profile
 * - Mirrors { name, photoURL } at JenCeo-DataBase/Users/{dbId}
 * - Images saved in Firebase Storage with proper URLs
 */
export default function Profile() {
  const { user } = useAuth() || {};
  // From your logs, you have user.name = "Prakash" and username records like "prakash"
  const canonicalUsername = (user?.username || user?.name || "")
    .toString()
    .trim()
    .toLowerCase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: user?.name || "", // keep showing current header name initially
    email: user?.email || "", // your users seemed to have empty email; still keep the field
    phone: "",
    about: "",
    location: "",
    languages: [],
    skills: [],
    photoURL: "", // avatar (storage URL)
    coverURL: "", // cover  (storage URL)
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

  // read id from query string (e.g., /profile?id=-OahSHDNZqZG2YkKnaAb)
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const idFromQuery = (searchParams.get("id") || "").trim();

  const [dbId, setDbId] = useState(
    idFromQuery ||
    user?.dbId ||
    user?.id ||
    user?.key ||
    user?.uid ||
    user?.userId ||
    "" // will resolve via DB if empty
  );

  // Helper: normalize
  const norm = (v) => (v == null ? "" : String(v).trim().toLowerCase());

  // Build a set of "auth candidates" to match
  const authCandidates = [
    user?.dbId,
    user?.id,
    user?.key,
    user?.uid,
    user?.userId,
    user?.username,
    user?.userName,
    user?.name,
    user?.displayName,
    user?.email,
    user?.mobile,
    user?.phone,
  ]
    .map(norm)
    .filter(Boolean);

  // Try session cache (fast path)
  useEffect(() => {
    if (dbId) return;
    // try cache by username/name/email if present
    const cacheKeysToTry = [
      norm(user?.dbId || user?.id || user?.key || ""),
      norm(user?.username || user?.userName || ""),
      norm(user?.name || user?.displayName || ""),
      norm(user?.email || ""),
    ].filter(Boolean);

    for (const k of cacheKeysToTry) {
      const cached = sessionStorage.getItem(`dbId:${k}`);
      if (cached) {
        setDbId(cached);
        return;
      }
    }
  }, [dbId, user]);

  // Resolve DB id by scanning Users and matching multiple fields
  useEffect(() => {
    const resolveDbId = async () => {
      if (dbId) return; // already known or from URL

      try {
        const usersSnap = await firebaseDB.child("Users").get();
        if (!usersSnap.exists()) return;

        const all = usersSnap.val() || {};
        let foundKey = "";

        // First pass: exact match on any candidate vs any record field
        outer: for (const [key, val] of Object.entries(all)) {
          const recordFields = [
            val?.username,
            val?.userName,
            val?.name,
            val?.displayName,
            val?.email,
            val?.mobile,
            val?.phone,
          ]
            .map(norm)
            .filter(Boolean);

          for (const cand of authCandidates) {
            if (recordFields.includes(cand)) {
              foundKey = key;
              break outer;
            }
          }
        }

        // Second pass: if multiple people share same name, prefer active:true
        if (!foundKey && user?.name) {
          const target = norm(user.name);
          const candidates = Object.entries(all).filter(
            ([, v]) =>
              [v?.name, v?.displayName].map(norm).includes(target)
          );
          const activeFirst = candidates.find(([, v]) => v?.active === true);
          if (activeFirst) foundKey = activeFirst[0];
          else if (candidates.length) foundKey = candidates[0][0];
        }

        if (foundKey) {
          setDbId(foundKey);
          // cache by handy handles so future loads are instant
          const handles = [
            norm(user?.username || user?.userName || ""),
            norm(user?.name || user?.displayName || ""),
            norm(user?.email || ""),
          ].filter(Boolean);
          handles.forEach((h) => sessionStorage.setItem(`dbId:${h}`, foundKey));
        } else {
          // leave dbId empty; UI will show "Resolving..." message
        }
      } catch (e) {
        console.error("DB id resolution failed", e);
      }
    };

    resolveDbId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbId, JSON.stringify(authCandidates)]);

  const userRootPath = useMemo(
    () => (dbId ? `Users/${dbId}` : ""),
    [dbId]
  );
  const profilePath = useMemo(
    () => (dbId ? `${userRootPath}/profile` : ""),
    [userRootPath]
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

  // Upload file to Firebase Storage and return download URL
  const uploadToStorage = async (file, filePath) => {
    try {
      const snapshot = await uploadFile(filePath, file);
      const downloadURL = await getDownloadURL(snapshot);
      return downloadURL;
    } catch (error) {
      console.error("Upload error:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  };

  // Handle avatar image upload
  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setErr('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErr('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    setErr("");

    try {
      // Create preview
      const previewURL = URL.createObjectURL(file);
      setAvatarPreview(previewURL);

      // Upload to Firebase Storage
      const filePath = `user-avatars/${dbId}/avatar_${Date.now()}.jpg`;
      const downloadURL = await uploadToStorage(file, filePath);
      
      setForm((f) => ({ ...f, photoURL: downloadURL }));
    } catch (error) {
      setErr(error.message);
      setAvatarPreview("");
    } finally {
      setUploading(false);
    }
  };

  // Handle cover image upload
  const handleCoverPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setErr('Please select a valid image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErr('Cover image size should be less than 10MB');
      return;
    }

    setUploading(true);
    setErr("");

    try {
      // Create preview
      const previewURL = URL.createObjectURL(file);
      setCoverPreview(previewURL);

      // Upload to Firebase Storage
      const filePath = `user-covers/${dbId}/cover_${Date.now()}.jpg`;
      const downloadURL = await uploadToStorage(file, filePath);
      
      setForm((f) => ({ ...f, coverURL: downloadURL }));
    } catch (error) {
      setErr(error.message);
      setCoverPreview("");
    } finally {
      setUploading(false);
    }
  };

  // Load existing profile once we know dbId
  useEffect(() => {
    const load = async () => {
      if (!profilePath) return;
      setLoading(true);
      setErr("");
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
        } else {
          // Seed some defaults
          setForm((f) => ({
            ...f,
            email: f.email || user?.email || "",
            name: f.name || user?.name || "",
          }));
        }
      } catch (e) {
        console.error(e);
        setErr("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profilePath, user?.email, user?.name]);

  // Save (writes both profile and a couple of mirrored fields at user root)
  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!profilePath || !userRootPath) {
      setErr("User record not resolved yet. Please try again.");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      const toSave = {
        ...form,
        // Remove any base64 data URLs if they exist (shouldn't happen now)
        photoURL: form.photoURL && form.photoURL.startsWith('data:') ? '' : form.photoURL,
        coverURL: form.coverURL && form.coverURL.startsWith('data:') ? '' : form.coverURL,
        updatedAt: new Date().toISOString(),
      };

      // Save profile
      await firebaseDB.child(profilePath).set(toSave);

      // Mirror name/photoURL at user root for Admin panel to see
      const mirror = {
        name: toSave.name || "",
        photoURL: toSave.photoURL || "",
        updatedAt: toSave.updatedAt,
      };
      await firebaseDB.child(userRootPath).update(mirror);

      setForm(toSave);
      setSavedAt(new Date());
      
      // Clean up object URLs
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      if (coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview);
      }
      
    } catch (e) {
      console.error(e);
      setErr("Could not save your profile. Please check database rules and try again.");
    } finally {
      setSaving(false);
    }
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      if (coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [avatarPreview, coverPreview]);

  // If we still don't know which record to modify, show a gentle notice
  if (!dbId) {
    return (
      <div className="container py-5">
        <div className="alert alert-info">
          Resolving your profile record… If this stays here, ensure your Users node has
          <code> username: "{canonicalUsername}"</code> or pass <code>dbId</code> in AuthContext.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-3 profile-fade-in">
      {/* Uploading indicator */}
      {uploading && (
        <div className="alert alert-info text-center">
          <div className="spinner-border spinner-border-sm me-2"></div>
          Uploading image...
        </div>
      )}

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
            {uploading ? "Uploading..." : "Change cover"}
            <input type="file" accept="image/*" onChange={handleCoverPick} hidden disabled={uploading} />
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
                {uploading ? "⏳" : "✎"}
                <input type="file" accept="image/*" onChange={handleAvatarPick} hidden disabled={uploading} />
              </label>
            </div>

            <div className="flex-grow-1">
              <h4 className="mb-1">{form.name || "Your Name"}</h4>
              <div className="text-muted small">
                {(user?.role || "Member")} • {form.location || "Add location"}
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
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || uploading}>
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
                      <span className="chip" key={l} onClick={() => removeChip("languages", l)} title="Remove">
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
                      <span className="chip" key={s} onClick={() => removeChip("skills", s)} title="Remove">
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

      {/* Tips */}
      <div className=" border-0 shadow-soft">
        <div className="card-body p-3 p-md-4">
          <div className="small text-muted">
            Tip: Click on any language/skill chip to remove it.
          </div>
        </div>
      </div>

      {/* Styles */}
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