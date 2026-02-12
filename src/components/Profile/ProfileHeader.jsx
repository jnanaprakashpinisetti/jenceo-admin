import React from 'react';

const DEFAULT_AVATAR = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

const ProfileHeader = ({ form, uploading, savedAt, handleAvatarPick, handleCoverPick, handleSave, saving }) => {
  
  // Helper function to get the correct avatar URL
  const getAvatarUrl = () => {
    // If there's a temporary local file for preview
    if (form.avatarPreview) {
      return form.avatarPreview;
    }
    // If there's a saved Firebase Storage URL
    if (form.photoURL) {
      return form.photoURL;
    }
    // Fallback to default photo from Firebase Storage
    return DEFAULT_AVATAR;
  };

  // Helper function to get the correct cover URL
  const getCoverUrl = () => {
    // If there's a temporary local file for preview
    if (form.coverPreview) {
      return form.coverPreview;
    }
    // If there's a saved Firebase Storage URL
    if (form.coverURL) {
      return form.coverURL;
    }
    // Fallback to default cover
    return "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1600";
  };

  return (
    <div className="border-0 shadow-soft overflow-hidden mb-3">
      <div className="profile-cover position-relative">
        <img
          src={getCoverUrl()}
          alt="cover"
          className="w-100"
          style={{ maxHeight: 220, objectFit: "cover", filter: "saturate(1.05)" }}
          onError={(e) => {
            // If cover image fails to load, show default cover
            e.target.src = "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1600";
          }}
        />
        <label className="btn btn-sm btn-light position-absolute" style={{ right: 16, bottom: 16 }}>
          {uploading ? "Uploading..." : "Change cover"}
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleCoverPick} 
            hidden 
            disabled={uploading} 
          />
        </label>
      </div>

      <div className="card-body p-3 p-md-4">
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative">
            <img
              src={getAvatarUrl()}
              alt="avatar"
              className="rounded-circle shadow-soft"
              style={{ width: 96, height: 96, objectFit: "cover", border: "3px solid #fff" }}
              onError={(e) => {
                // If image fails to load, show default avatar
                e.target.src = DEFAULT_AVATAR;
              }}
            />
            <label
              className="btn btn-sm btn-outline-secondary position-absolute rounded-circle"
              style={{ 
                right: -6, 
                bottom: -6,
                width: '32px',
                height: '32px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                border: '2px solid #fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              title="Change avatar"
            >
              {uploading ? (
                <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} />
              ) : (
                <i className="bi bi-pencil-fill" style={{ fontSize: '12px' }}></i>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarPick} 
                hidden 
                disabled={uploading} 
              />
            </label>
          </div>

          <div className="flex-grow-1">
            <h4 className="mb-1">{form.name || "Your Name"}</h4>
            <div className="text-muted small">
              {form.email} • {form.location || "Add location"}
            </div>
            {!!savedAt && (
              <div className="text-success small mt-1">
                <i className="bi bi-check-circle-fill me-1"></i>
                Saved at {new Date(savedAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="d-none d-md-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              title="Scroll to top"
            >
              <i className="bi bi-arrow-up"></i>
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleSave} 
              disabled={saving || uploading}
              style={{ minWidth: '110px' }}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Saving...
                </>
              ) : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;