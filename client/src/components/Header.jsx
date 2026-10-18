import React, { useState } from 'react';

export default function Header({
  activeTab,
  setActiveTab,
  aiStatus,
  pendingCount = 0,
  onOpenSettings,
  onOpenHowItWorks
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAiOnline = aiStatus && aiStatus.available;

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="app-header no-print">
      <div className="header-container">
        {/* Brand Logo */}
        <div className="brand" onClick={() => handleNavClick('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          </div>
          <div className="brand-text">
            <h1>OrderMint</h1>
            <span>Local AI Order OS</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav" aria-label="Main Navigation">
          <button
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === 'orders' || activeTab === 'review' ? 'active' : ''}`}
            onClick={() => handleNavClick('orders')}
          >
            Orders
            {pendingCount > 0 && (
              <span className="nav-badge">{pendingCount}</span>
            )}
          </button>
          <button
            className={`nav-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => handleNavClick('import')}
          >
            Import Messages
          </button>
          <button
            className={`nav-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => handleNavClick('catalog')}
          >
            Catalog
          </button>
          <button
            className={`nav-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => handleNavClick('summary')}
          >
            Bills & Summary
          </button>
        </nav>

        {/* Right Header Actions */}
        <div className="header-actions">
          {/* AI Status Badge */}
          <div
            className={`ai-status-pill ${isAiOnline ? 'online' : 'offline'}`}
            title={isAiOnline ? `Connected to local model (${aiStatus.activeModel}) via Ollama` : `Local AI offline — deterministic rule-based matching active`}
            tabIndex={0}
            role="status"
            aria-label={isAiOnline ? `AI model ${aiStatus.activeModel} online` : 'AI offline, deterministic rules active'}
          >
            <span className={`status-dot ${isAiOnline ? 'green' : 'amber'}`}></span>
            <span className="ai-status-text">
              {isAiOnline ? `AI: ${aiStatus.activeModel}` : 'Rules Active'}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenHowItWorks}
            title="How OrderMint works"
          >
            How It Works
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenSettings}
            title="Settings"
          >
            ⚙️ Settings
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="Toggle Navigation Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <button
            className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`mobile-nav-item ${activeTab === 'orders' || activeTab === 'review' ? 'active' : ''}`}
            onClick={() => handleNavClick('orders')}
          >
            Orders {pendingCount > 0 ? `(${pendingCount} pending)` : ''}
          </button>
          <button
            className={`mobile-nav-item ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => handleNavClick('import')}
          >
            Import Messages
          </button>
          <button
            className={`mobile-nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => handleNavClick('catalog')}
          >
            Catalog
          </button>
          <button
            className={`mobile-nav-item ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => handleNavClick('summary')}
          >
            Bills & Summary
          </button>
        </div>
      )}
    </header>
  );
}
