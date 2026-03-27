import { safeAvatar } from '../utils/safeAvatar';

const ProfileModal = ({ profile, onClose, isOwnProfile = false, isAdminView = false }) => {
  if (!profile) return null;

  const showEmail = isOwnProfile || isAdminView;
  const showRole  = isOwnProfile || isAdminView;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Banner */}
        <div className="modal-banner" />

        {/* Avatar */}
        <div className="modal-avatar-wrap">
          <img src={safeAvatar(profile.avatar)} alt={profile.displayName} className="modal-avatar" />
          {isOwnProfile && <span className="modal-you-badge">You</span>}
          {profile.role === 'admin' && !isOwnProfile && (
            <span className="modal-admin-badge">Admin</span>
          )}
          {isAdminView && profile.role === 'user' && (
            <span className="modal-you-badge">User</span>
          )}
        </div>

        {/* Info */}
        <div className="modal-body">
          <h2 className="modal-name">{profile.displayName || profile.username}</h2>
          <p className="modal-handle">@{profile.username}</p>

          {showEmail && profile.email && (
            <div className="modal-field">
              <span className="modal-field-label">Email</span>
              <span className="modal-field-value">{profile.email}</span>
            </div>
          )}

          <div className="modal-field">
            <span className="modal-field-label">GitHub</span>
            <a
              href={`https://github.com/${profile.username}`}
              target="_blank"
              rel="noreferrer"
              className="modal-field-link"
            >
              github.com/{profile.username} ↗
            </a>
          </div>

          {showRole && (
            <div className="modal-field">
              <span className="modal-field-label">Role</span>
              <span className={`modal-role-badge ${profile.role}`}>{profile.role}</span>
            </div>
          )}

          {isAdminView && profile.githubId && (
            <div className="modal-field">
              <span className="modal-field-label">GitHub ID</span>
              <span className="modal-field-value">{profile.githubId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
