import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export function BillView({ orderId, onBack, onOpenSettings }) {
  const [orderData, setOrderData] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [ord, set] = await Promise.all([
          api.getOrder(orderId),
          api.getSettings()
        ]);
        setOrderData(ord);
        setSettings(set.settings || {});
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError(err.message);
      }
    }
    load();
  }, [orderId]);

  if (loading) {
    return <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>Loading invoice details...</p>;
  }

  if (error || !orderData) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--red-600)', marginBottom: '1rem' }}>{error || 'Order not found'}</p>
        <button className="btn btn-secondary" onClick={onBack}>← Back to Orders</button>
      </div>
    );
  }

  const { order, lines } = orderData;
  const prefix = settings.bill_prefix || 'OM-';
  const billNumber = `${prefix}${String(order.id).padStart(4, '0')}`;
  const billDate = order.approved_at
    ? new Date(order.approved_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div>
      {/* Screen-only Action Toolbar */}
      <div className="no-print" style={{ maxWidth: '720px', margin: '0 auto 1.25rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          ← Back to Orders
        </button>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={onOpenSettings}>
            ✏️ Edit Business Info
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="bill-container">
        {order.is_demo === 1 && (
          <div className="demo-watermark">
            DEMO DATA
          </div>
        )}

        {/* Invoice Header */}
        <div className="bill-header">
          <div className="bill-biz">
            <h2>{settings.business_name || 'OrderMint Business'}</h2>
            <p>{settings.business_address || 'Local Commerce Kitchen'}</p>
            {settings.business_phone && <p>Tel: {settings.business_phone}</p>}
          </div>

          <div className="bill-meta">
            <h3>ORDER INVOICE</h3>
            <p><strong>Invoice No:</strong> {billNumber}</p>
            <p><strong>Date:</strong> {billDate}</p>
            <p><strong>Status:</strong> {order.status.toUpperCase()}</p>
          </div>
        </div>

        {/* Customer & Delivery Card */}
        <div className="bill-customer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--slate-500)', fontWeight: 600 }}>
                Customer
              </span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-900)', marginTop: '0.15rem' }}>
                {order.customer_label}
              </div>
            </div>

            {order.delivery_note && (
              <div style={{ textAlign: 'right', maxWidth: '300px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--slate-500)', fontWeight: 600 }}>
                  Delivery Instructions
                </span>
                <div style={{ color: 'var(--slate-700)', fontSize: '0.875rem', marginTop: '0.15rem' }}>
                  {order.delivery_note}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <table className="bill-table">
          <thead>
            <tr>
              <th style={{ width: '48%' }}>Item Description</th>
              <th style={{ width: '14%', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '18%', textAlign: 'right' }}>Unit Price</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id || i}>
                <td>
                  <strong style={{ color: 'var(--slate-900)' }}>{l.item_name}</strong>
                  {l.note && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.15rem' }}>
                      {l.note}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>{l.quantity}</td>
                <td style={{ textAlign: 'right' }}>{l.effective_unit_price_inr}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.line_total_inr}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="bill-totals">
          <div className="bill-total-row">
            <span>Subtotal:</span>
            <strong>{order.total_inr}</strong>
          </div>
          <div className="bill-total-row grand">
            <span>Total Amount Due:</span>
            <span>{order.total_inr}</span>
          </div>
        </div>

        {/* Invoice Footer */}
        <div style={{ marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--slate-200)', fontSize: '0.75rem', color: 'var(--slate-400)', textAlign: 'center' }}>
          Thank you for supporting small business! • Generated locally with OrderMint
        </div>
      </div>
    </div>
  );
}

export default BillView;
