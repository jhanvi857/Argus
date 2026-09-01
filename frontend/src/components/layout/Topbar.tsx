import React from 'react';
import {
  Bell,
  Menu
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
      {/* Left: Mobile menu toggle (visible on mobile only) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onToggleMobileMenu}
          className="btn-ghost btn-sm"
          style={{ display: 'inline-flex', padding: '6px' }}
          title="Toggle Mobile Menu"
        >
          <Menu size={18} />
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
