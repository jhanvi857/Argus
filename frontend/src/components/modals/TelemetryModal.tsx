import React from 'react';
import { X, Terminal, RefreshCw, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import { IngestionTelemetry } from '../../types';

interface TelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: IngestionTelemetry;
  isSyncing: boolean;
  onTriggerSync: () => void;
}

export const TelemetryModal: React.FC<TelemetryModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  isSyncing,
  onTriggerSync
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon-box" style={{ width: '28px', height: '28px' }}>
              <Terminal size={15} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary-navy)' }}>
                ATS Ingestion & Crawler Telemetry
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                Official ATS Direct Endpoints • Diff Engine Snapshots • Zero Aggregator Noise
              </p>
            </div>
          </div>
          <button className="btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Status Metrics Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '12px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Monitored Companies
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-navy)', marginTop: '4px' }}>
                {telemetry.companies_checked} Official ATS
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={11} /> {telemetry.successful_count} healthy
              </div>
            </div>

            <div style={{
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '12px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>
                Postgres Snapshots
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-navy)', marginTop: '4px' }}>
                0 Snapshots
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Database size={11} /> Preserved Indefinitely
              </div>
            </div>

            <div style={{
              background: 'var(--bg-cream-tint)',
              border: '1px solid var(--bg-cream-border)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '12px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--gray-700)', fontWeight: 600, textTransform: 'uppercase' }}>
                New Relevant Detected
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                {telemetry.new_relevant_count} New Roles
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} /> Filtered Against Profile
              </div>
            </div>
          </div>

          {/* Terminal Console Output */}
          <div>
            <div style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: 'var(--gray-700)',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>DAEMON CRAWLER EXECUTION LOGS</span>
              <span style={{ fontSize: '11px', color: 'var(--gray-500)', fontFamily: 'var(--font-mono)' }}>
                Last run: {telemetry.last_run_at}
              </span>
            </div>
            
            <div style={{
              backgroundColor: 'var(--gray-900)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '14px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--bg-cream)',
              lineHeight: 1.6,
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid var(--gray-800)'
            }}>
              <div style={{ color: 'var(--primary-light)', marginBottom: '6px', fontWeight: 600 }}>
                [ARGUS-DAEMON] Waiting for real ingestion data
              </div>
              {telemetry.logs.map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--gray-500)' }}>&gt;</span>
                  <span style={{ color: log.includes('TRUE') || log.includes('200') ? '#8ec29c' : 'var(--bg-cream)' }}>
                    {log}
                  </span>
                </div>
              ))}
              {isSyncing && (
                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                  <span className="pulsing-dot-theme" />
                  <span>Actively polling official career endpoints...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={onTriggerSync}
            disabled={isSyncing}
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Scanning ATS...' : 'Trigger ATS Diff Loop Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
