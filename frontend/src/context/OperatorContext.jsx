import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getTasks,
  updateTaskStatus as apiUpdateTaskStatus,
  getSafetyAlerts,
  logIncident as apiLogIncident,
  getBehaviorFlags,
  getTrainingModules,
  checkBackendStatus,
  getFleetCostSummary,
} from '../services/api';
import {
  INITIAL_OPERATOR,
  INITIAL_MACHINES,
  TELEMETRY_HISTORY,
} from '../services/mockData';

const OperatorContext = createContext(null);

export function OperatorProvider({ children }) {
  // Active Operator & Machine Context
  const [operator, setOperator] = useState(INITIAL_OPERATOR);
  const [machines, setMachines] = useState(INITIAL_MACHINES);
  const [activeMachineId, setActiveMachineId] = useState('M-12');

  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | tasks | safety | behavior | estimator | training
  const [isDemoDrawerOpen, setIsDemoDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default as requested

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // Core Data States (The 5 Outcomes)
  const [tasks, setTasks] = useState([]);
  const [safetyAlerts, setSafetyAlerts] = useState([]);
  const [behaviorFlags, setBehaviorFlags] = useState([]);
  const [trainingModules, setTrainingModules] = useState([]);

  // Fleet Cost/ROI Rollup (§14)
  const [fleetCostSummary, setFleetCostSummary] = useState(null);

  // Telemetry & Live Sensor Feeds
  const [telemetry, setTelemetry] = useState({
    engineHours: 1420.5,
    fuelLevelPct: 78,
    idlingTimeMin: 52, // Current idling minutes (Threshold: 45)
    distanceToObjectMeters: 2.1, // Proximity reading (Threshold: < 3.0m)
    seatbeltFastened: false, // Rule trigger: Seatbelt unfastened
    engineRpm: 1850,
    hydraulicPressurePsi: 3200,
    coolantTempC: 88,
    loadCycles: 74,
  });

  const [telemetryHistory, setTelemetryHistory] = useState(TELEMETRY_HISTORY);

  // Backend Connectivity Status
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((title, message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type, timestamp: new Date() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Load & Refresh
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [backendLive, taskRes, alertRes, flagRes, trainingRes, costRes] = await Promise.all([
        checkBackendStatus(),
        getTasks(),
        getSafetyAlerts(),
        getBehaviorFlags(),
        getTrainingModules(),
        getFleetCostSummary(),
      ]);

      setIsBackendLive(backendLive);
      setTasks(taskRes.data || []);
      setSafetyAlerts(alertRes.data || []);
      setBehaviorFlags(flagRes.data || []);
      setTrainingModules(trainingRes.data || []);
      setFleetCostSummary(costRes.data || null);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('[Context] Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();

    // Periodic telemetry jitter & polling interval (5 seconds)
    const interval = setInterval(async () => {
      const live = await checkBackendStatus();
      setIsBackendLive(live);

      // Subtle live sensor fluctuation for dynamic cockpit feel
      setTelemetry((prev) => ({
        ...prev,
        engineRpm: Math.floor(1800 + Math.random() * 80),
        hydraulicPressurePsi: Math.floor(3180 + Math.random() * 60),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshAll]);

  // Task Actions
  const updateTaskStatus = async (taskId, newStatus) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.taskId === taskId) {
          const updated = { ...t, status: newStatus };
          if (newStatus === 'completed') {
            updated.progressPct = 100;
            updated.actualTimeMin = updated.actualTimeMin || updated.estimatedTimeMin;
          } else if (newStatus === 'in_progress') {
            updated.progressPct = Math.max(updated.progressPct || 25, 25);
          }
          return updated;
        }
        return t;
      })
    );
    addToast('Task Updated', `Task ${taskId} is now ${newStatus.replace('_', ' ')}.`, 'success');

    try {
      await apiUpdateTaskStatus(taskId, newStatus);
    } catch (e) {
      console.warn('Backend update failed:', e);
    }
  };

  const addTask = (newTask) => {
    const task = {
      taskId: `T00${tasks.length + 1}`,
      scheduledStart: new Date().toISOString(),
      status: 'pending',
      progressPct: 0,
      ...newTask,
    };
    setTasks((prev) => [task, ...prev]);
    addToast('Task Scheduled', `New task ${task.taskId} added to schedule.`, 'info');
  };

  // Safety Alert Actions
  const acknowledgeAlert = (alertId) => {
    setSafetyAlerts((prev) =>
      prev.map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a))
    );
    addToast('Alert Acknowledged', `Safety alert ${alertId} marked as reviewed.`, 'info');
  };

  const logIncident = async (incidentData) => {
    const newAlert = {
      alertId: `A00${safetyAlerts.length + 1}`,
      machineId: activeMachineId,
      operatorId: operator.operatorId,
      timestamp: new Date().toISOString(),
      type: 'incident',
      severity: incidentData.severity || 'medium',
      message: `Incident Logged: ${incidentData.title || incidentData.description}`,
      details: incidentData.details || incidentData.description || 'Manually logged in-cab incident.',
      acknowledged: false,
    };
    setSafetyAlerts((prev) => [newAlert, ...prev]);
    addToast('Incident Recorded', 'New incident log logged and synced to audit history.', 'warning');

    try {
      await apiLogIncident({
        machineId: activeMachineId,
        operatorId: operator.operatorId,
        description: incidentData.title ? `${incidentData.title}: ${incidentData.details || ''}` : incidentData.description,
        severity: incidentData.severity || 'medium',
      });
    } catch (e) {
      console.warn('Backend incident logging failed:', e);
    }
  };

  // Training Module Actions
  const toggleModuleComplete = (moduleId) => {
    setTrainingModules((prev) =>
      prev.map((m) =>
        m.moduleId === moduleId
          ? {
              ...m,
              completionStatus: m.completionStatus === 'Completed' ? 'In Progress' : 'Completed',
              lastReviewed: new Date().toISOString().split('T')[0],
            }
          : m
      )
    );
    addToast('Training Updated', `Module ${moduleId} status updated.`, 'success');
  };

  // Interactive Demonstration Trigger (For Panel Checkpoints)
  const triggerSimulation = (type, customValue) => {
    if (type === 'TOGGLE_SEATBELT') {
      const newState = !telemetry.seatbeltFastened;
      setTelemetry((prev) => ({ ...prev, seatbeltFastened: newState }));
      if (!newState) {
        const alert = {
          alertId: `A00${safetyAlerts.length + 1}`,
          machineId: activeMachineId,
          operatorId: operator.operatorId,
          timestamp: new Date().toISOString(),
          type: 'seatbelt',
          message: 'CRITICAL: Operator seatbelt unfastened while engine engaged',
          severity: 'high',
          acknowledged: false,
        };
        setSafetyAlerts((prev) => [alert, ...prev]);
        addToast('SAFETY INTERLOCK TRIP', 'Seatbelt unfastened! High severity safety alert triggered.', 'error');
      } else {
        addToast('Safety Restored', 'Seatbelt fastened. Interlock cleared.', 'success');
      }
    } else if (type === 'SET_PROXIMITY') {
      const distance = customValue !== undefined ? Number(customValue) : (telemetry.distanceToObjectMeters < 3.0 ? 5.2 : 1.8);
      setTelemetry((prev) => ({ ...prev, distanceToObjectMeters: distance }));
      if (distance < 3.0) {
        const alert = {
          alertId: `A00${safetyAlerts.length + 1}`,
          machineId: activeMachineId,
          operatorId: operator.operatorId,
          timestamp: new Date().toISOString(),
          type: 'proximity',
          message: `Proximity Hazard: Object detected at ${distance.toFixed(1)}m (Danger threshold < 3.0m)`,
          severity: distance < 2.0 ? 'high' : 'medium',
          acknowledged: false,
        };
        setSafetyAlerts((prev) => [alert, ...prev]);
        addToast('PROXIMITY WARNING', `Hazard detected at ${distance.toFixed(1)}m!`, 'error');
      } else {
        addToast('Radar Clear', `Obstacle cleared to safe distance (${distance.toFixed(1)}m).`, 'info');
      }
    } else if (type === 'TRIGGER_IDLING_SPIKE') {
      const newIdle = 58;
      setTelemetry((prev) => ({ ...prev, idlingTimeMin: newIdle }));
      const flag = {
        flagId: `F00${behaviorFlags.length + 1}`,
        machineId: activeMachineId,
        operatorId: operator.operatorId,
        timestamp: new Date().toISOString(),
        type: 'excessive_idling',
        value: newIdle,
        threshold: 45,
        message: `Idling time ${newIdle} min exceeds 45 min threshold`,
        severity: 'medium',
        status: 'Active',
      };
      setBehaviorFlags((prev) => [flag, ...prev]);
      addToast('BEHAVIOR FLAG TRIGGERED', `Excessive idling detected: ${newIdle}m (Threshold: 45m).`, 'warning');
    } else if (type === 'RESET_DEMO') {
      refreshAll();
      setTelemetry({
        engineHours: 1420.5,
        fuelLevelPct: 78,
        idlingTimeMin: 32,
        distanceToObjectMeters: 4.8,
        seatbeltFastened: true,
        engineRpm: 1840,
        hydraulicPressurePsi: 3200,
        coolantTempC: 88,
        loadCycles: 74,
      });
      addToast('Demo Reset', 'Telemetry and sample state restored to nominal baseline.', 'info');
    }
  };

  // Active high severity alerts count for badges & banners
  const unacknowledgedHighAlerts = safetyAlerts.filter((a) => a.severity === 'high' && !a.acknowledged);

  const activeMachine =
    machines.find((m) => m.id === activeMachineId) ||
    machines[0] || {
      id: 'M-12',
      name: 'CAT 336 Hydraulic Excavator',
      type: 'Excavator',
      model: '336 Next Gen',
      age: 3,
      healthStatus: 'OPTIMAL',
    };

  return (
    <OperatorContext.Provider
      value={{
        operator,
        setOperator,
        machines,
        activeMachine,
        activeMachineId,
        setActiveMachineId,
        activeTab,
        setActiveTab,
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebar,
        isDemoDrawerOpen,
        setIsDemoDrawerOpen,
        tasks,
        updateTaskStatus,
        addTask,
        safetyAlerts,
        acknowledgeAlert,
        logIncident,
        unacknowledgedHighAlerts,
        behaviorFlags,
        trainingModules,
        toggleModuleComplete,
        fleetCostSummary,
        telemetry,
        telemetryHistory,
        isBackendLive,
        isLoading,
        lastSyncTime,
        refreshAll,
        triggerSimulation,
        toasts,
        removeToast,
        addToast,
      }}
    >
      {children}
    </OperatorContext.Provider>
  );
}

export function useOperator() {
  const context = useContext(OperatorContext);
  if (!context) {
    throw new Error('useOperator must be used within an OperatorProvider');
  }
  return context;
}
