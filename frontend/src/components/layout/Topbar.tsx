import React from 'react';
import {
  Bell,
  Menu,
  SlidersHorizontal,
  Globe
} from 'lucide-react';
import { UserProfile, AppRoute } from '../../types';

interface TopbarProps {
  currentUser: UserProfile;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
  onOpenTelemetry: () => void;
  onOpenNotifications: () => void;
  unreadAlertsCount: number;
  profileCompletion: { percentage: number };
  onNavigate: (route: AppRoute) => void;
  onToggleMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentUser,
  onOpenNotifications,
  unreadAlertsCount,
  onNavigate,
  onToggleMobileMenu
}) => {
  return (
    <header className="argus-topbar">
      {/* Left: Sidebar toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onToggleMobileMenu}
          className="btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', cursor: 'pointer', borderRadius: '6px' }}
          title="Toggle Sidebar"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Center: Quick Preferences & Differential Status Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onNavigate('preferences')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '16px',
            backgroundColor: 'var(--cream-light)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--gray-800)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Click to change your career stage (Intern / New Grad / Experienced), target countries, and role preferences"
        >
          <SlidersHorizontal size={13} color="var(--primary-navy)" />
          <span style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
            {currentUser.preferences?.role_level === 'intern'
              ? 'Internships'
              : currentUser.preferences?.role_level === 'new_grad'
                ? 'New Grad'
                : currentUser.preferences?.role_level === 'experienced'
                  ? 'Experienced / SDE'
                  : 'All Levels'}
          </span>
          <span style={{ color: 'var(--gray-400)' }}>•</span>
          <span style={{ color: 'var(--gray-600)', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Globe size={11} />
            {currentUser.preferences?.locations?.length
              ? `${currentUser.preferences.locations.length} Countries`
              : 'Global'}
          </span>
        </button>
      </div>


      {/* Right: Notification bell + User avatar */}
      <div className="topbar-actions">
        <button
          className="btn-ghost btn-sm"
          onClick={onOpenNotifications}
          style={{ position: 'relative', padding: '8px' }}
          title="Notifications"
        >
          <Bell size={18} color="var(--gray-600)" />
          {unreadAlertsCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--primary)',
              borderRadius: '50%',
              boxShadow: '0 0 0 2px white'
            }} />
          )}
        </button>

        <div
          onClick={() => onNavigate('profile_overview')}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0
          }}
          title={currentUser.full_name}
        >
          {currentUser.full_name?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  );
};
