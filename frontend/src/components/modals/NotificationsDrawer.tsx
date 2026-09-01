import React from 'react';
import { X, Bell, Compass } from 'lucide-react';
import { AppRoute } from '../../types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: AppRoute) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100vh',
          backgroundColor: 'var(--bg-white)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.15s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--gray-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>
              Notifications
            </h3>
          </div>
          <button className="btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginBottom: '12px', fontWeight: 600 }}>
            ARGUS ALERTS
          </div>

          <div style={{
            padding: '28px 18px',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--gray-200)',
            backgroundColor: 'var(--gray-25)',
            textAlign: 'center'
          }}>
            <Bell size={28} color="var(--gray-400)" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-800)' }}>
              No notifications yet
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
              Alerts will appear after real ATS ingestion finds relevant postings.
            </div>
          </div>
        </div>

        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--gray-200)',
          backgroundColor: 'var(--gray-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '11.5px', color: 'var(--gray-500)' }}>
            Argus notifies on official new posts only
          </span>
          <button
            className="btn-primary btn-sm"
            onClick={() => {
              onClose();
              onNavigate('opportunities');
            }}
          >
            <Compass size={13} />
            <span>Open Feed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
