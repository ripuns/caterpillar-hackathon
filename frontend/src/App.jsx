import React from 'react';
import { OperatorProvider, useOperator } from './context/OperatorContext';
import Sidebar from './components/layout/Sidebar';
import TopHeader from './components/layout/TopHeader';
import AlertBanner from './components/layout/AlertBanner';
import SimulationDrawer from './components/layout/SimulationDrawer';
import CockpitDashboard from './components/dashboard/CockpitDashboard';
import TasksView from './components/tasks/TasksView';
import SafetyView from './components/safety/SafetyView';
import BehaviorView from './components/behavior/BehaviorView';
import EstimatorView from './components/estimator/EstimatorView';
import TrainingView from './components/training/TrainingView';
import ToastContainer from './components/common/ToastContainer';
import './App.css';

function MainLayout() {
  const { activeTab } = useOperator();

  return (
    <div className="app-layout-with-sidebar">
      {/* Sleek Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-viewport">
        {/* Top HUD Header */}
        <TopHeader />

        {/* Critical Safety Alert Banner */}
        <AlertBanner />

        {/* Dynamic View Container */}
        <main className="app-container">
          {activeTab === 'dashboard' && <CockpitDashboard />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'safety' && <SafetyView />}
          {activeTab === 'behavior' && <BehaviorView />}
          {activeTab === 'estimator' && <EstimatorView />}
          {activeTab === 'training' && <TrainingView />}
        </main>

        {/* Panel Presentation Simulator Drawer */}
        <SimulationDrawer />

        {/* In-Cab Toast Notifications */}
        <ToastContainer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <OperatorProvider>
      <MainLayout />
    </OperatorProvider>
  );
}
