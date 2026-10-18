import React from 'react';

export function HowItWorksModal({ onClose }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--slate-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🌱</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)' }}>How OrderMint Works</h3>
          </div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--slate-400)' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--slate-700)', display: 'flex', flexDirection: 'column', gap: '1.25rem', lineHeight: 1.6 }}>
          {/* Core Principle Banner */}
          <div style={{ background: 'var(--primary-light)', padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-border)' }}>
            <strong style={{ color: 'var(--primary-hover)', fontSize: '0.95rem' }}>
              Core Philosophy: AI suggests; application code validates; the seller approves.
            </strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-700)', marginTop: '0.25rem' }}>
              The model never finalizes orders, calculates money, or invents products.
            </p>
          </div>

          {/* Pillar 1 */}
          <div>
            <h4 style={{ color: 'var(--slate-900)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>⚙️</span> 1. Deterministic Extraction First
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              Chat messages are normalized, tokenized, and matched against your product catalog and custom aliases in deterministic backend code. Quantities, prices, and delivery notes are extracted with strict bounds.
            </p>
          </div>

          {/* Pillar 2 */}
          <div>
            <h4 style={{ color: 'var(--slate-900)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>💰</span> 2. Integer-Paise Financial Math
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              All monetary amounts are represented as integer paise (1 INR = 100 paise). The AI model is strictly prohibited from computing financial totals, eliminating math hallucinations and floating point rounding bugs.
            </p>
          </div>

          {/* Pillar 3 */}
          <div>
            <h4 style={{ color: 'var(--slate-900)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🛡️</span> 3. Resilient Local AI Fallback
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              When messages contain ambiguous phrasing, complex Hinglish slang, or typos, OrderMint calls local open-weight models via Ollama. If Ollama is offline or times out, the app continues with 100% functional deterministic fallback.
            </p>
          </div>

          {/* Pillar 4 */}
          <div>
            <h4 style={{ color: 'var(--slate-900)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🔒</span> 4. 100% Local Privacy
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              Customer messages, addresses, and phone numbers remain strictly on your computer. Zero cloud API calls, zero tracking telemetry, and zero subscription costs.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--slate-100)', textAlign: 'right' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

export default HowItWorksModal;
