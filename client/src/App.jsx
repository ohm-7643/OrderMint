import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import ReviewOrders from './components/ReviewOrders.jsx';
import ImportMessages from './components/ImportMessages.jsx';
import CatalogManager from './components/CatalogManager.jsx';
import DailySummary from './components/DailySummary.jsx';
import BillView from './components/BillView.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import HowItWorksModal from './components/HowItWorksModal.jsx';
import { api } from './api.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [viewBillOrderId, setViewBillOrderId] = useState(null);
  const [aiStatus, setAiStatus] = useState({ available: false, activeModel: null });
  const [pendingCount, setPendingCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const checkAI = async () => {
    try {
      const status = await api.getAIStatus();
      setAiStatus(status);
    } catch {
      setAiStatus({ available: false, activeModel: null });
    }
  };

  const fetchPendingOrdersCount = async () => {
    try {
      const data = await api.getOrders({ status: 'draft' });
      const drafts = data.orders || [];
      setPendingCount(drafts.length);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    checkAI();
    fetchPendingOrdersCount();
    const aiInterval = setInterval(checkAI, 25000);
    const orderInterval = setInterval(fetchPendingOrdersCount, 30000);
    return () => {
      clearInterval(aiInterval);
      clearInterval(orderInterval);
    };
  }, []);

  const handleImportSuccess = (result) => {
    showToast(`✓ Extracted ${result.orders_created} order(s) successfully!`);
    fetchPendingOrdersCount();
    if (result.orders && result.orders.length > 0) {
      setSelectedOrderId(result.orders[0].order_id);
    }
    setActiveTab('orders');
  };

  const handleViewBill = (orderId) => {
    setViewBillOrderId(orderId);
    setActiveTab('bill');
  };

  const handleSelectOrderFromDashboard = (orderId) => {
    setSelectedOrderId(orderId);
    setActiveTab('orders');
  };

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'bill') setViewBillOrderId(null);
          setActiveTab(tab);
        }}
        aiStatus={aiStatus}
        pendingCount={pendingCount}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHowItWorks={() => setShowHowItWorks(true)}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigate={(tab) => {
              if (tab !== 'bill') setViewBillOrderId(null);
              setActiveTab(tab);
            }}
            onSelectOrder={handleSelectOrderFromDashboard}
            onViewBill={handleViewBill}
            showToast={showToast}
          />
        )}

        {(activeTab === 'orders' || activeTab === 'review') && (
          <ReviewOrders
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            onViewBill={handleViewBill}
            showToast={showToast}
          />
        )}

        {activeTab === 'import' && (
          <ImportMessages
            onImportSuccess={handleImportSuccess}
            aiStatus={aiStatus}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogManager
            showToast={showToast}
          />
        )}

        {activeTab === 'summary' && (
          <DailySummary
            onViewBill={handleViewBill}
          />
        )}

        {activeTab === 'bill' && viewBillOrderId && (
          <BillView
            orderId={viewBillOrderId}
            onBack={() => setActiveTab('orders')}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
      </main>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          onClose={() => {
            setShowSettings(false);
            checkAI();
          }}
          showToast={showToast}
        />
      )}

      {showHowItWorks && (
        <HowItWorksModal
          onClose={() => setShowHowItWorks(false)}
        />
      )}

      {/* Toast Notification Container */}
      <div className="toast-container no-print" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
