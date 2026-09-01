import React, { useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  FolderGit2,
  Wrench,
  ClipboardList,
  User,
  Settings,
  LogOut,
  ChevronDown,
  UserCheck,
  Plus
} from 'lucide-react';
import { AppRoute, UserProfile } from '../../types';
import { AuthService } from '../../services/auth';

interface SidebarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (userId: string) => void;
  newPostingsCount: number;
  inFlightAppsCount: number;
  onOpenNewUserModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  currentUser,
  allUsers,
  onSwitchUser,
  newPostingsCount,
  inFlightAppsCount,
  onOpenNewUserModal
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const mainNavItems = [
    {
      route: 'dashboard' as AppRoute,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      route: 'opportunities' as AppRoute,
      label: 'Jobs',
      icon: Briefcase,
      badge: newPostingsCount > 0 ? newPostingsCount : null,
      badgeCrimson: true
    },
    {
      route: 'profile_projects' as AppRoute,
      label: 'Projects',
      icon: FolderGit2,
      badge: currentUser.projects?.length || null
    },
    {
      route: 'profile_skills' as AppRoute,
      label: 'Skills',
      icon: Wrench,
      badge: currentUser.skills?.length || null
    },
    {
      route: 'applications' as AppRoute,
      label: 'Applications',
      icon: ClipboardList,
      badge: inFlightAppsCount > 0 ? inFlightAppsCount : null
    },
    {
      route: 'profile_overview' as AppRoute,
      label: 'Profile',
      icon: User,
      badge: null
    }
  ];

  const isRouteActive = (route: AppRoute) => {
    if (route === 'profile_overview') {
      return ['profile_overview', 'profile_experience', 'profile_education', 'profile_achievements', 'profile_resumes'].includes(currentRoute);
    }
    return currentRoute === route;
  };

  return (
    <aside className="argus-sidebar">
      {/* Brand Header */}
      <div className="argus-sidebar-brand" style={{ cursor: 'pointer' }} onClick={() => onNavigate('landing')} title="Go to Argus Landing / CTA page">
        <span className="brand-name" style={{ fontSize: '22px' }}>Argus</span>
      </div>

      {/* Main Navigation */}
      <div className="sidebar-nav-container">
        <ul className="sidebar-nav-list">
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive = isRouteActive(item.route);
            return (
              <li key={item.route}>
                <button
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => onNavigate(item.route)}
                >
                  <div className="nav-label-group">
                    <Icon size={18} className="nav-icon" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge !== null && (
                    <span className={`nav-badge ${item.badgeCrimson ? 'nav-badge-crimson' : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom Actions */}
      <div className="sidebar-user-footer" style={{ position: 'relative' }}>
        {/* User Switcher Dropdown */}
        {userDropdownOpen && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '12px',
            right: '12px',
            marginBottom: '8px',
            backgroundColor: 'var(--bg-white)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--gray-200)',
            padding: '8px',
            zIndex: 50
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', padding: '6px 8px', textTransform: 'uppercase' }}>
              Switch Account
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
              {allUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSwitchUser(u.id);
                    setUserDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: 'none',
                    background: u.id === currentUser.id ? 'var(--primary-navy-tint)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'var(--primary)', color: 'white',
                      fontSize: '11px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {u.full_name.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.full_name}
                      </div>
                    </div>
                  </div>
                  {u.id === currentUser.id && <UserCheck size={14} color="var(--primary)" />}
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: '6px', paddingTop: '6px' }}>
              <button
                onClick={() => {
                  setUserDropdownOpen(false);
                  onOpenNewUserModal();
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 8px', borderRadius: 'var(--border-radius-sm)',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: 'var(--primary)', fontSize: '12px', fontWeight: 600, width: '100%'
                }}
              >
                <Plus size={14} />
                <span>Add New Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* Settings & Logout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button
            className="sidebar-nav-item"
            onClick={() => onNavigate('settings')}
            style={{ color: 'var(--gray-500)', fontSize: '13px' }}
          >
            <div className="nav-label-group">
              <Settings size={17} className="nav-icon" />
              <span>Settings</span>
            </div>
          </button>
          <button
            className="sidebar-nav-item"
            onClick={() => {
              AuthService.logout();
              onNavigate('landing');
            }}
            style={{ color: 'var(--gray-500)', fontSize: '13px' }}
          >
            <div className="nav-label-group">
              <LogOut size={17} className="nav-icon" />
              <span>Log out</span>
            </div>
          </button>
        </div>

        {/* Current User */}
        <div
          className="user-profile-summary"
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          title="Click to switch active user profile"
          style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '10px' }}
        >
          <div className="user-avatar-fallback" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
            {currentUser.full_name ? currentUser.full_name.charAt(0) : 'U'}
          </div>
          <div className="user-info-text">
            <div className="user-name" style={{ fontSize: '13px' }}>{currentUser.full_name || 'Guest User'}</div>
          </div>
          <ChevronDown size={14} color="var(--gray-500)" style={{
            transform: userDropdownOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease'
          }} />
        </div>
      </div>
    </aside>
  );
};
