import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Inbox, LayoutGrid, Zap, FileText, FolderArchive, RefreshCw, Users as UsersIcon, LogOut, UserRound } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { canSeeScreen } from '../../utils/access.js';
import { screenToPath } from '../../routes.js';
import Modal from '../ui/Modal.jsx';

const NAV = [
  { group: 'Workspace' },
  { id: 'dashboard', label: 'Command Center', Icon: LayoutDashboard },
  { id: 'inbox',     label: 'Inventory Inbox', Icon: Inbox,   badgeKey: 'inbox' },
  { id: 'browser',   label: 'Inventory Browser', Icon: LayoutGrid },
  { group: 'Sell' },
  { id: 'match',    label: 'Smart Match', Icon: Zap },
  { id: 'proposal', label: 'Proposal Builder', Icon: FileText, badgeKey: 'proposal' },
  { id: 'proposals', label: 'Proposals', Icon: FolderArchive },
  { id: 'leads', label: 'Leads', Icon: UserRound },
  { group: 'Maintain' },
  { id: 'freshness', label: 'Freshness', Icon: RefreshCw },
  { group: 'Admin', adminGroup: true },
  { id: 'users', label: 'Users & Access', Icon: UsersIcon },
];

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase() || '?';
}

export default function Sidebar() {
  const location = useLocation();
  const { inbox, proposalIds, authUser, logout } = useApp();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await logout();
  };

  const getBadge = (key) => {
    if (key === 'inbox')    return inbox.length;
    if (key === 'proposal') return proposalIds.length;
    return 0;
  };

  // Filter the nav to what this user is allowed to see; drop now-empty groups.
  const visibleNav = [];
  for (let i = 0; i < NAV.length; i += 1) {
    const item = NAV[i];
    if (item.group) {
      // include the group header only if at least one following item (before the
      // next group) is visible
      let hasVisible = false;
      for (let j = i + 1; j < NAV.length && !NAV[j].group; j += 1) {
        if (canSeeScreen(authUser, NAV[j].id)) { hasVisible = true; break; }
      }
      if (hasVisible) visibleNav.push(item);
    } else if (canSeeScreen(authUser, item.id)) {
      visibleNav.push(item);
    }
  }

  const roleLabel = authUser?.role === 'admin'
    ? 'Administrator'
    : `Member · ${(authUser?.cities || []).join(', ') || 'No city'}`;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo"><img src="/icon.png" alt="Spacehaat" className="logo-img" /></div>
        <div>
          <div className="name">Spacehaat</div>
          <div className="sub">Command Center</div>
        </div>
      </div>

      <nav id="nav">
        {visibleNav.map((item, i) => {
          if (item.group) {
            return <div key={`g-${item.group}-${i}`} className="nav-label">{item.group}</div>;
          }
          const { id, label, Icon, badgeKey } = item;
          const count = badgeKey ? getBadge(badgeKey) : 0;
          return (
            <NavLink
              key={id}
              to={screenToPath(id)}
              className={({ isActive }) => {
                const onEdit = id === 'proposal'
                  && /^\/proposals\/[^/]+\/edit$/.test(location.pathname);
                return `nav-item${isActive || onEdit ? ' active' : ''}`;
              }}
            >
              <Icon />
              <span>{label}</span>
              {count > 0 && (
                <span className={`badge${badgeKey === 'inbox' ? ' amber' : ''}`}>{count}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="spacer" />

      <div className="who">
        <div className="avatar">{initials(authUser?.name)}</div>
        <div className="who-meta">
          <div className="nm">{authUser?.name || '—'}</div>
          <div className="rl">{roleLabel}</div>
        </div>
        <button
          className="who-logout"
          onClick={() => setLogoutOpen(true)}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut />
        </button>
      </div>

      <Modal
        show={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Log out?"
        footer={(
          <>
            <button className="btn ghost" onClick={() => setLogoutOpen(false)}>Cancel</button>
            <button className="btn primary" onClick={confirmLogout}>
              <LogOut /> Log out
            </button>
          </>
        )}
      >
        <p className="logout-confirm-text">
          Are you sure that you want to log out?
        </p>
      </Modal>
    </aside>
  );
}
