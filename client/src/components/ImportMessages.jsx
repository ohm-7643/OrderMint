import React, { useState } from 'react';
import { api } from '../api.js';

const SAMPLES = [
  {
    key: 'cakeRevision',
    title: '🎂 Cake Order with Revision',
    desc: 'Multi-message modification with price & delivery note',
    text: `[12/10/26, 14:00:01] Priya Sharma: 2 choc cakes for sat 700 each
[12/10/26, 14:02:15] Priya Sharma: add 1 brownie box 250
[12/10/26, 14:05:00] Priya Sharma: actually make cakes 3`
  },
  {
    key: 'multiCustomer',
    title: '🍱 Multi-Customer Lunch Tiffins',
    desc: 'Blank-line separated customer blocks with timing',
    text: `Customer 1:
2 veg thali for lunch tomorrow by 1pm

Customer 2:
3 paneer roll and 1 samosa box for evening pickup`
  },
  {
    key: 'hinglishDelivery',
    title: '🍛 Hinglish Order with Address',
    desc: 'Hinglish number words (do, teen) with delivery note',
    text: `Rahul Mehta: do choc cakes and teen samosa box deliver to Bandra West by 6pm eggless`
  }
];

export function ImportMessages({ onImportSuccess, aiStatus }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [extractionResult, setExtractionResult] = useState(null);

  const handleExtract = async () => {
    if (!text.trim()) {
      setError('Please enter or paste customer chat messages to parse.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const source = fileInfo ? `upload:${fileInfo.name}` : 'paste';
      const res = await api.importText(text, source);
      setLoading(false);
      setExtractionResult(res);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to parse order messages.');
    }
  };

  const handleKeyDown = (e) => {
    // Support Cmd+Enter / Ctrl+Enter shortcut
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleExtract();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setError('Only plain text (.txt) files are supported.');
      return;
    }
    if (file.size > 512 * 1024) {
      setError('File exceeds maximum size limit of 512 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setText(content);
      setFileInfo({ name: file.name, size: file.size });
      setExtractionResult(null);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const loadSample = (sample) => {
    setText(sample.text);
    setFileInfo(null);
    setExtractionResult(null);
    setError(null);
  };

  const isAiOnline = aiStatus && aiStatus.available;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header section */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>
            Import Order Messages
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginTop: '0.2rem' }}>
            Paste unstructured customer chats or upload WhatsApp text exports to extract structured orders.
          </p>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: isAiOnline ? 'var(--primary-light)' : 'var(--amber-50)', color: isAiOnline ? 'var(--primary-hover)' : 'var(--amber-800)', border: `1px solid ${isAiOnline ? 'var(--primary-border)' : 'var(--amber-100)'}` }}>
          <span>{isAiOnline ? '⚡ Model Connected' : '🛡️ Deterministic Rules Active'}</span>
          <span>•</span>
          <span>100% On-Device</span>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-100)', color: 'var(--red-700)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Extraction Result Preview (if completed) */}
      {extractionResult ? (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--primary-border)', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              ✓
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                Extracted {extractionResult.orders_created} Order(s)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>
                Deterministic catalog validation completed. Orders saved as drafts for your review.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {(extractionResult.orders || []).map((ord, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#ffffff',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--slate-900)' }}>{ord.customer_label}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.15rem' }}>
                    {ord.lines_count} line item(s) extracted
                  </div>
                </div>
                <div>
                  {ord.flags && ord.flags.length > 0 ? (
                    <span className="badge badge-flagged">
                      ⚠️ {ord.flags.length} issue(s) to verify
                    </span>
                  ) : (
                    <span className="badge badge-approved">
                      Clean match
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--slate-50)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--slate-700)', borderLeft: '3px solid var(--primary)' }}>
            <strong>Human Verification Step:</strong> The AI extracts candidate items; application code validates quantities and prices; you inspect and approve before the bill is finalized.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setExtractionResult(null); setText(''); }}
            >
              Parse Another Message
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.95rem' }}
              onClick={() => onImportSuccess(extractionResult)}
            >
              Proceed to Order Review & Approval →
            </button>
          </div>
        </div>
      ) : (
        /* Input & Configuration Card */
        <div className="card">
          {/* Quick-load Sample Chips */}
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: '0.4rem' }}>
              Try sample customer messages:
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {SAMPLES.map(sample => (
                <button
                  key={sample.key}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadSample(sample)}
                  title={sample.desc}
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          {/* Large Comfortable Textarea */}
          <div style={{ marginBottom: '1.25rem' }}>
            <textarea
              className="textarea"
              style={{ minHeight: '220px', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
              placeholder={`Paste customer WhatsApp message or DM here, for example:\n\n[12/10/26, 14:00] Priya: 2 choc cakes for sat 700 each\n[12/10/26, 14:02] Priya: add 1 brownie box 250\n[12/10/26, 14:05] Priya: actually make cakes 3`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            ></textarea>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--slate-400)' }}>
              <span>Shortcut: Press <strong>⌘ + Enter</strong> or <strong>Ctrl + Enter</strong> to parse</span>
              <span>{text.length} characters</span>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--slate-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                📁 Upload .txt Export
                <input
                  type="file"
                  accept=".txt,text/plain"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>

              {fileInfo ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-700)' }}>
                  {fileInfo.name} ({(fileInfo.size / 1024).toFixed(1)} KB)
                  <button
                    style={{ background: 'none', border: 'none', color: 'var(--red-600)', marginLeft: '0.4rem', cursor: 'pointer' }}
                    onClick={() => { setFileInfo(null); setText(''); }}
                  >
                    Remove
                  </button>
                </span>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {text && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setText(''); setFileInfo(null); setError(null); }}
                >
                  Clear
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary"
                disabled={loading || !text.trim()}
                onClick={handleExtract}
                style={{ padding: '0.6rem 1.4rem', fontSize: '0.95rem' }}
              >
                {loading ? 'Processing Orders...' : '✨ Parse & Extract Orders'}
              </button>
            </div>
          </div>

          {/* Privacy Guarantee Footer */}
          <div style={{ marginTop: '1.75rem', padding: '0.85rem 1rem', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', fontSize: '0.8rem', color: 'var(--slate-600)' }}>
            <div>
              <strong style={{ color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>🔒</span> Absolute Local Privacy
              </strong>
              <p style={{ marginTop: '0.2rem' }}>
                Messages are processed entirely on this machine. No third-party clouds, telemetry, or external APIs receive your customer names, addresses, or phone numbers.
              </p>
            </div>
            <div>
              <strong style={{ color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>⚙️</span> Deterministic Validation
              </strong>
              <p style={{ marginTop: '0.2rem' }}>
                Catalog matching, price comparison, and multi-message quantity edits are evaluated in deterministic code. Totals are calculated in exact integer paise.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportMessages;
