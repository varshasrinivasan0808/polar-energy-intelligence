export interface SystemAlert {
  id: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  message: string
  timestamp: string
}

const STORAGE_KEY = 'polar_energy_alerts'


// ============================================================
// GET ALERTS
// ============================================================

export const getStoredAlerts = (): SystemAlert[] => {
  try {
    const value = localStorage.getItem(
      STORAGE_KEY
    )

    if (!value) {
      return []
    }

    const parsed = JSON.parse(value)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
  } catch {
    return []
  }
}


// ============================================================
// SAVE ALERTS
// ============================================================

export const setStoredAlerts = (
  alerts: SystemAlert[]
): void => {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(alerts)
  )

  // Notify the current tab immediately.
  window.dispatchEvent(
    new Event('polar-alerts-updated')
  )
}


// ============================================================
// ADD ALERT
// ============================================================

export const addSystemAlert = (
  alert: Omit<
    SystemAlert,
    'id' | 'timestamp'
  >
): void => {

  const current =
    getStoredAlerts()

  // Prevent identical duplicate alerts.
  const duplicate =
    current.some(
      (existing) =>
        existing.severity ===
          alert.severity &&
        existing.message ===
          alert.message
    )

  if (duplicate) {
    return
  }

  const newAlert: SystemAlert = {
    ...alert,

    id:
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,

    timestamp:
      new Date().toISOString(),
  }

  const updated = [
    newAlert,
    ...current,
  ].slice(0, 20)

  setStoredAlerts(updated)
}


// ============================================================
// CLEAR ALL ALERTS
// ============================================================

export const clearSystemAlerts = (): void => {
  setStoredAlerts([])
}