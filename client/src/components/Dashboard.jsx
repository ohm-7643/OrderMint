import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export function Dashboard({ onNavigate, onSelectOrder, onViewBill, showToast }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [todaySummary, setTodaySummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [catalogCount, setCatalogCount] = useState(0);
  const [error, setError] = useState(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [settRes, sumRes, ordRes, catRes] = await Promise.all([
        api.getSettings().catch(() => ({ settings: {} })),
        api.getSummary(todayStr).catch(() => null),
        api.getOrders().catch(() => ({ orders: [] })),
        api.getCatalog().catch(() => ({ items: [] }))
      ]);

      setSettings(settRes.settings || {});
      setTodaySummary(sumRes);
      setRecentOrders((ordRes.orders || []).slice(0, 5));
      setCatalogCount((catRes.items || []).length);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const pendingReviewCount = recentOrders.filter(o => o.status === 'draft' || o.flags_count > 0).length;
  const approvedCount = todaySummary ? todaySummary.approved_orders_count : 0;
  const totalRevenueInr = todaySummary ? todaySummary.total_sales_inr : '₹0';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const businessName = settings.business_name || 'My Kitchen';

  return (
    <div className="dashboard-page">
      <div className="card dashboard-hero">
        <div className="dashboard-hero-inner">
          <div className="dashboard-hero-copy">
            <div className="hero-badge">
              <span className="hero-badge-mark">●</span> Local-First AI Commerce
            </div>
            <h2>
              {getGreeting()}, {businessName}
            </h2>
            <p>
              Turn customer chat messages into verified, printable orders with zero cloud dependency.
            </p>
          </div>

          <div className="dashboard-hero-actions">
            <button
              className="btn btn-primary dashboard-primary-btn"
              onClick={() => onNavigate('import')}
            >
              Paste & Import Chat
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('orders')}
            >
              Review Inbox
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-50)', color: 'var(--red-700)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="card stat-card">
          <div className="stat-header">
            <span>Today's Revenue</span>
            <span className="stat-icon">₹</span>
          </div>
          <div className="stat-value">
            {loading ? '...' : totalRevenueInr}
          </div>
          <span className="stat-caption">Verified approved sales</span>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span>Approved Today</span>
            <span className="stat-icon success">✓</span>
          </div>
          <div className="stat-value success-value">
            {loading ? '...' : approvedCount}
          </div>
          <span className="stat-caption">Ready for kitchen prep & billing</span>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span>Needs Review</span>
            <span className="stat-icon warning">!</span>
          </div>
          <div className="stat-value review-value">
            {loading ? '...' : pendingReviewCount}
          </div>
          <span className="stat-caption">
            {pendingReviewCount > 0 ? 'Pending seller verification' : 'All caught up!'}
          </span>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span>Catalog Items</span>
            <span className="stat-icon">▣</span>
          </div>
          <div className="stat-value">
            {loading ? '...' : catalogCount}
          </div>
          <span className="stat-caption">Active products with aliases</span>
        </div>
      </div>

      {/* Grid: Recent Orders & Quick Actions */}
      <div className="dashboard-content-grid">
        <div className="card dashboard-panel">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Orders</h3>
              <p className="card-subtitle">Latest orders imported from customer chats</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('orders')}>
              View All ({recentOrders.length}) →
            </button>
          </div>

          {loading ? (
            <p style={{ color: 'var(--slate-500)', padding: '1rem', textAlign: 'center' }}>Loading orders...</p>
          ) : recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <h4 style={{ fontWeight: 600, color: 'var(--slate-800)' }}>No orders yet</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', maxWidth: '320px', margin: '0.3rem auto 1rem auto' }}>
                Paste your customer's WhatsApp or Instagram message to create your first order.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('import')}>
                Import First Order
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentOrders.map(order => (
                <div
                  key={order.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    border: '1px solid var(--slate-100)',
                    borderRadius: 'var(--radius-sm)',
                    background: '#ffffff',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--slate-900)' }}>{order.customer_label}</strong>
                      <span className={`badge badge-${order.status}`}>{order.status}</span>
                      {order.flags_count > 0 && order.status !== 'approved' && (
                        <span className="badge badge-flagged">⚠️ {order.flags_count} issue(s)</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.15rem', display: 'block' }}>
                      {order.lines_count} item(s) • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--slate-900)' }}>
                      {order.total_inr}
                    </span>
                    {order.status === 'approved' ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewBill(order.id)}
                      >
                        Bill 🧾
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          onSelectOrder(order.id);
                          onNavigate('orders');
                        }}
                      >
                        Review →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Quick Actions & Top Products */}
        <div className="dashboard-side-column">
          <div className="card dashboard-aside-card">
            <h3 className="card-title secondary-title">Quick Navigation</h3>
            <div className="quick-action-stack">
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.6rem 0.85rem' }}
                onClick={() => onNavigate('import')}
              >
                <span>📥</span>
                <span style={{ marginLeft: '0.4rem' }}>Import Messages</span>
              </button>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.6rem 0.85rem' }}
                onClick={() => onNavigate('catalog')}
              >
                <span>📦</span>
                <span style={{ marginLeft: '0.4rem' }}>Manage Catalog ({catalogCount})</span>
              </button>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.6rem 0.85rem' }}
                onClick={() => onNavigate('summary')}
              >
                <span>📊</span>
                <span style={{ marginLeft: '0.4rem' }}>Daily Sales Summary</span>
              </button>
            </div>
          </div>

          {/* Today's Sales Snapshot */}
          <div className="card dashboard-aside-card">
            <h3 className="card-title secondary-title">Today's Item Sales</h3>
            {!todaySummary || todaySummary.items_breakdown.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                No items sold yet today. Approved orders will appear here automatically.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {todaySummary.items_breakdown.slice(0, 4).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--slate-800)', fontWeight: 500 }}>
                      {item.item_name} <span style={{ color: 'var(--slate-500)' }}>×{item.quantity_sold}</span>
                    </span>
                    <strong style={{ color: 'var(--slate-900)' }}>{item.revenue_inr}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
