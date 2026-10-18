import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export function SettingsModal({ onClose, showToast }) {
  const [activeSection, setActiveSection] = useState('profile'); // 'profile', 'ai', 'data'
  const [settings, setSettings] = useState({
    business_name: '',
    business_phone: '',
    business_address: '',
    bill_prefix: 'OM-'
  });
  const [aiStatus, setAiStatus] = useState(null);
  const [testingAi, setTestingAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [setRes, aiRes] = await Promise.all([
          api.getSettings(),
          api.getAIStatus().catch(() => ({ available: false }))
        ]);
        setSettings(prev => ({ ...prev, ...(setRes.settings || {}) }));
        setAiStatus(aiRes);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError(err.message);
      }
    }
    load();
  }, []);

  const handleTestAi = async () => {
    try {
      setTestingAi(true);
      const res = await api.getAIStatus();
      setAiStatus(res);
      setTestingAi(false);
      if (res.available) {
        showToast(`✓ Local AI Connected (${res.activeModel})`);
      } else {
        showToast('Local AI unreachable — deterministic rules active');
      }
    } catch {
      setTestingAi(false);
      setAiStatus({ available: false });
      showToast('Local AI unreachable');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings(settings);
      setSaving(false);
      showToast('Settings saved successfully');
      onClose();
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Are you sure you want to delete synthetic demo orders? Real customer orders will be preserved.')) {
      return;
    }
    try {
      setResetting(true);
      await api.resetDemo();
      setResetting(false);
      showToast('Demo data safely cleaned up');
      onClose();
    } catch (err) {
      setResetting(false);
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '620px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--slate-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚙️</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)' }}>Settings & Diagnostics</h3>
          </div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--slate-400)' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--red-50)', color: 'var(--red-700)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            className={`nav-btn ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            Business Profile
          </button>
          <button
            type="button"
            className={`nav-btn ${activeSection === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveSection('ai')}
          >
            Local AI Diagnostics
          </button>
          <button
            type="button"
            className={`nav-btn ${activeSection === 'data' ? 'active' : ''}`}
            onClick={() => setActiveSection('data')}
          >
            Data Management
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--slate-500)', padding: '1.5rem', textAlign: 'center' }}>Loading configuration...</p>
        ) : (
          <div>
            {/* Section 1: Business Profile */}
            {activeSection === 'profile' && (
              <form onSubmit={handleSave}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Business / Kitchen Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={settings.business_name}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem', display: 'block' }}>
                    Displayed on generated customer bills and printable invoices.
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={settings.business_phone}
                    onChange={(e) => setSettings({ ...settings, business_phone: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Business Address
                  </label>
                  <textarea
                    className="input"
                    rows="2"
                    style={{ resize: 'vertical' }}
                    value={settings.business_address}
                    onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
                  ></textarea>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Invoice Bill Prefix
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '130px' }}
                    value={settings.bill_prefix}
                    onChange={(e) => setSettings({ ...settings, bill_prefix: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem', display: 'block' }}>
                    e.g. "OM-" produces bills like "OM-0001", "OM-0002"
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--slate-100)' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* Section 2: Local AI Diagnostics */}
            {activeSection === 'ai' && (
              <div>
                <div style={{ padding: '1rem', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                      Local Ollama Status
                    </span>
                    <span className={`badge ${aiStatus && aiStatus.available ? 'badge-approved' : 'badge-flagged'}`}>
                      {aiStatus && aiStatus.available ? 'ONLINE' : 'OFFLINE (RULES FALLBACK)'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--slate-600)', lineHeight: '1.5' }}>
                    {aiStatus && aiStatus.available
                      ? `Connected to local endpoint at ${aiStatus.host}. Active model: ${aiStatus.activeModel}.`
                      : 'Ollama is unreachable. OrderMint automatically uses deterministic rules for order extraction. The app remains 100% functional.'}
                  </p>

                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={testingAi}
                      onClick={handleTestAi}
                    >
                      {testingAi ? 'Testing connection...' : '🔄 Test AI Connection'}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--slate-700)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <strong>How Local AI Works in OrderMint:</strong>
                  <ul style={{ paddingLeft: '1.2rem', color: 'var(--slate-600)', fontSize: '0.8rem' }}>
                    <li>100% on-device inference via Ollama HTTP API (`127.0.0.1:11434`).</li>
                    <li>No customer chat messages, phone numbers, or addresses are ever transmitted across the internet.</li>
                    <li>Called only on lines where deterministic rules raise uncertainty.</li>
                    <li>The seller must review and approve before any order is finalized.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Section 3: Data Management */}
            {activeSection === 'data' && (
              <div>
                <div style={{ padding: '1rem', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-900)', marginBottom: '0.25rem' }}>
                    Synthetic Demonstration Orders
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginBottom: '0.75rem' }}>
                    Reset sample orders created during testing. This deletes only orders tagged as `DEMO DATA` in the local SQLite database. All real business orders are strictly preserved.
                  </p>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={resetting}
                    onClick={handleResetDemo}
                  >
                    {resetting ? 'Cleaning up...' : '🗑️ Delete Demo Orders'}
                  </button>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  <strong>Storage:</strong> Data is persisted in local SQLite with Write-Ahead Logging at <code>server/data/ordermint.db</code>.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsModal;
