import React from 'react';

const ProfileHeader = ({ form, uploading, savedAt, handleAvatarPick, handleCoverPick, handleSave, saving }) => {
  return (
    <div className=" border-0 shadow-soft overflow-hidden mb-3">
      <div className="profile-cover position-relative">
        <img
          src={
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
          <div className="position-relative">
            <img
              src={
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
              {form.email} • {form.location || "Add location"}
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
  );
};

export default ProfileHeader;