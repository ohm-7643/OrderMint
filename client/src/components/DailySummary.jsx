import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export function DailySummary({ onViewBill }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSummaryData = async (targetDate) => {
    try {
      setLoading(true);
      const [sumData, ordData] = await Promise.all([
        api.getSummary(targetDate),
        api.getOrders({ status: 'approved', date: targetDate })
      ]);
      setSummary(sumData);
      setOrders(ordData.orders || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  useEffect(() => {
    loadSummaryData(date);
  }, [date]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card">
        {/* Header */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title">Bills & Daily Summary</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
              Real-time daily aggregates and invoices computed strictly from approved orders in SQLite.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Select Date:</span>
            <input
              type="date"
              className="input"
              style={{ width: 'auto', fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--red-50)', color: 'var(--red-700)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--slate-500)', padding: '2rem', textAlign: 'center' }}>Computing daily aggregates...</p>
        ) : !summary ? null : (
          <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
              <div className="card stat-card">
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Approved Orders
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: '0.3rem' }}>
                  {summary.approved_orders_count}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem', display: 'block' }}>
                  Completed orders for {date}
                </span>
              </div>

              <div className="card stat-card" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary-hover)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Total Daily Revenue
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-hover)', marginTop: '0.3rem' }}>
                  {summary.total_sales_inr}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-hover)', marginTop: '0.2rem', display: 'block', opacity: 0.9 }}>
                  Deterministic integer paise calculation
                </span>
              </div>
            </div>

            {/* Product Sales Breakdown */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.75rem' }}>
                Product Sales Breakdown
              </h3>

              {summary.items_breakdown.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                    No approved orders recorded for {date}.
                  </p>
                </div>
              ) : (
                <table className="lines-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50%' }}>Product Name</th>
                      <th style={{ width: '25%', textAlign: 'center' }}>Quantity Sold</th>
                      <th style={{ width: '25%', textAlign: 'right' }}>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.items_breakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong style={{ color: 'var(--slate-900)' }}>{item.item_name}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{item.quantity_sold}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong style={{ color: 'var(--slate-900)' }}>{item.revenue_inr}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Approved Orders List with Direct Bill View */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.75rem' }}>
                Approved Orders for {date} ({orders.length})
              </h3>

              {orders.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', background: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  No approved orders for this date.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {orders.map(o => (
                    <div
                      key={o.id}
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
                        <strong style={{ color: 'var(--slate-900)' }}>{o.customer_label}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginLeft: '0.5rem' }}>
                          ({o.lines_count} items)
                        </span>
                        {o.delivery_note && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.15rem' }}>
                            {o.delivery_note}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{o.total_inr}</span>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onViewBill(o.id)}
                        >
                          Print Bill 🧾
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailySummary;
