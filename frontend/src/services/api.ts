import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
})

// ============================================================
// TYPES
// ============================================================

export interface Alert {
  id: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'OPTIMIZE' | 'NORMAL'
  message: string
  timestamp: string
}

export interface DashboardData {
  currentLoad: number
  predictedLoad: number
  fuelConsumption: number
  systemHealth: number
  alerts: Alert[]
  recommendations?: Recommendation[]
}

export interface LoadForecast {
  hours: string[]
  historicalHours: string[]
  historical: number[]
  predicted: number[]
  confidence: number[]
  peakLoad: number
  peakTime: string
  latestObservedLoad: number
  unit: string
  model: string
  metrics: ForecastMetrics
}

export interface FuelForecast {
  hours: string[]
  predicted: number[]
  currentConsumption: number
  expectedConsumption: number
  peakConsumption: number
  trend: 'UP' | 'DOWN' | 'STABLE'
  avoidableFuel: number
  estimatedSavings: number
  confidence: number
  unit: string
  model: string
  metrics: ForecastMetrics
}

export interface RenewableData {
  months: string[]
  solarPotential: number[]
  windPotential: number[]
  renewableIndex: number[]
  currentGeneration: number
  predictedGeneration: number
  batteryChargingPeriods: string[]
  flexibleLoadPeriods: string[]
  unit: string
  note: string
}

export interface ForecastMetrics {
  MAE: number
  RMSE: number
  MAPE: number | null
  R2: number
}

export interface DateLoadForecast {
  date: string
  monthlyForecastKwh: number
  estimatedDailyLoadKwh: number
  actualMonthlyLoadKwh: number | null
  unit: string
  isHistoricalActual: boolean
  dataType: 'HISTORICAL_ACTUAL' | 'FORECAST'
  source: string
  model: string | null
  confidence: number
  metrics: ForecastMetrics
  forecastType: string
}

export interface DateFuelForecast {
  date: string
  monthlyForecastLitres: number
  estimatedDailyFuelLitres: number
  actualMonthlyFuelLitres: number | null
  unit: string
  isHistoricalActual: boolean
  dataType: 'HISTORICAL_ACTUAL' | 'FORECAST'
  source: string
  model: string | null
  confidence: number
  metrics: ForecastMetrics
  forecastType: string
}

export interface DateRenewableForecast {
  date: string
  solar: {
    value: number | null
    unit: string
    potential: number
  }
  wind: {
    value: number | null
    unit: string
    potential: number
  }
  renewableIndex: number
  status: 'HIGH' | 'MODERATE' | 'LOW'
  recommendedAction: string
  dataType: string
  note: string
}

export interface DateForecastResponse {
  date: string
  load: DateLoadForecast
  fuel: DateFuelForecast
  renewable: DateRenewableForecast
  recommendation: Recommendation
  summary: {
    estimatedDailyLoadKwh: number
    estimatedDailyFuelLitres: number
    renewableIndex: number
    estimatedFuelSavingLitres: number
  }
  importantNote: string
}

export interface Recommendation {
  id: string
  severity: 'NORMAL' | 'OPTIMIZE' | 'WARNING' | 'CRITICAL'
  situation: string
  action: string
  reason: string
  expectedImpact: {
    fuelSaved?: number
    peakLoadReduction?: number
    renewableUtilization?: number
    reliabilityImprovement?: string
  }
  timeWindow: string
  confidence: number
  factors: string[]
}

export interface EquipmentItem {
  id: string
  name: string
  health: number
  failureRisk: number
  status: 'HEALTHY' | 'CAUTION' | 'CRITICAL'
  temperature?: number
  vibration?: number
  efficiency?: number
  maintenanceAlert?: string
}

export interface SimulationParams {
  load: number
  renewableGeneration: number
  batterySOC: number
  fuelConsumption: number
}

export interface SimulationResult {
  predictedLoad: number
  fuelImpact: number
  reliabilityScore: number
  estimatedOptimizedFuel: number
  estimatedFuelSaving: number
  recommendation: string
  note: string
}

// ============================================================
// HELPER
// ============================================================

const logApiError = (endpoint: string, error: unknown) => {
  console.error(`API request failed: ${endpoint}`, error)
}

// ============================================================
// DASHBOARD
// ============================================================

export const dashboardAPI = {
  getDashboard: async (): Promise<DashboardData> => {
    try {
      const response = await apiClient.get<DashboardData>(
        '/api/dashboard'
      )

      return response.data
    } catch (error) {
      logApiError('/api/dashboard', error)
      throw error
    }
  },
}

// ============================================================
// LOAD FORECAST
// ============================================================

export const loadForecastAPI = {
  getForecast: async (): Promise<LoadForecast> => {
    try {
      const response = await apiClient.get<LoadForecast>(
        '/api/load-forecast'
      )

      return response.data
    } catch (error) {
      logApiError('/api/load-forecast', error)
      throw error
    }
  },

  getForDate: async (
    forecastDate: string
  ): Promise<DateLoadForecast> => {
    try {
      const response = await apiClient.get<DateForecastResponse>(
        '/api/forecast',
        {
          params: {
            forecast_date: forecastDate,
          },
        }
      )

      return response.data.load
    } catch (error) {
      logApiError(
        `/api/forecast?forecast_date=${forecastDate}`,
        error
      )
      throw error
    }
  },
}

// ============================================================
// FUEL FORECAST
// ============================================================

export const fuelForecastAPI = {
  getForecast: async (): Promise<FuelForecast> => {
    try {
      const response = await apiClient.get<FuelForecast>(
        '/api/fuel-forecast'
      )

      return response.data
    } catch (error) {
      logApiError('/api/fuel-forecast', error)
      throw error
    }
  },

  getForDate: async (
    forecastDate: string
  ): Promise<DateFuelForecast> => {
    try {
      const response = await apiClient.get<DateForecastResponse>(
        '/api/forecast',
        {
          params: {
            forecast_date: forecastDate,
          },
        }
      )

      return response.data.fuel
    } catch (error) {
      logApiError(
        `/api/forecast?forecast_date=${forecastDate}`,
        error
      )
      throw error
    }
  },
}

// ============================================================
// RENEWABLE
// ============================================================

export const renewableAPI = {
  getData: async (): Promise<RenewableData> => {
    try {
      const response = await apiClient.get<RenewableData>(
        '/api/renewable'
      )

      return response.data
    } catch (error) {
      logApiError('/api/renewable', error)
      throw error
    }
  },

  getForDate: async (
    forecastDate: string
  ): Promise<DateRenewableForecast> => {
    try {
      const response = await apiClient.get<DateForecastResponse>(
        '/api/forecast',
        {
          params: {
            forecast_date: forecastDate,
          },
        }
      )

      return response.data.renewable
    } catch (error) {
      logApiError(
        `/api/forecast?forecast_date=${forecastDate}`,
        error
      )
      throw error
    }
  },
}

// ============================================================
// COMPLETE DATE-SPECIFIC FORECAST
// ============================================================

export const forecastAPI = {
  getForDate: async (
    forecastDate: string
  ): Promise<DateForecastResponse> => {
    try {
      const response =
        await apiClient.get<DateForecastResponse>(
          '/api/forecast',
          {
            params: {
              forecast_date: forecastDate,
            },
          }
        )

      return response.data
    } catch (error) {
      logApiError(
        `/api/forecast?forecast_date=${forecastDate}`,
        error
      )
      throw error
    }
  },
}

// ============================================================
// RECOMMENDATIONS
// ============================================================

export const recommendationsAPI = {
  getRecommendations: async (): Promise<Recommendation[]> => {
    try {
      const response =
        await apiClient.get<Recommendation[]>(
          '/api/recommendations'
        )

      return response.data
    } catch (error) {
      logApiError('/api/recommendations', error)
      throw error
    }
  },

  getForDate: async (
    forecastDate: string
  ): Promise<Recommendation> => {
    try {
      const response =
        await apiClient.get<DateForecastResponse>(
          '/api/forecast',
          {
            params: {
              forecast_date: forecastDate,
            },
          }
        )

      return response.data.recommendation
    } catch (error) {
      logApiError(
        `/api/forecast?forecast_date=${forecastDate}`,
        error
      )
      throw error
    }
  },
}

// ============================================================
// SIMULATION
// ============================================================

export const simulationAPI = {
  simulate: async (
    params: SimulationParams
  ): Promise<SimulationResult> => {
    try {
      const response =
        await apiClient.post<SimulationResult>(
          '/api/simulate',
          params
        )

      return response.data
    } catch (error) {
      logApiError('/api/simulate', error)
      throw error
    }
  },
}

// ============================================================
// EQUIPMENT
// Kept temporarily for existing unused page files.
// Not part of the final core Polar Energy scope.
// ============================================================

export const equipmentAPI = {
  getHealth: async (): Promise<EquipmentItem[]> => {
    try {
      const response =
        await apiClient.get<EquipmentItem[]>(
          '/api/equipment-health'
        )

      return response.data
    } catch (error) {
      logApiError('/api/equipment-health', error)
      return []
    }
  },
}

// Compatibility export
export const getEquipment =
  equipmentAPI.getHealth

// ============================================================
// ALERTS
// ============================================================

export const getAlerts = async (): Promise<Alert[]> => {
  try {
    const dashboard =
      await dashboardAPI.getDashboard()

    return dashboard.alerts
  } catch (error) {
    logApiError('/api/dashboard → alerts', error)
    return []
  }
}

// ============================================================
// DATE UTILITIES
// ============================================================

export const getTodayISO = (): string => {
  const today = new Date()

  return today.toISOString().split('T')[0]
}

export const getDatePlusDays = (
  days: number
): string => {
  const date = new Date()

  date.setDate(
    date.getDate() + days
  )

  return date
    .toISOString()
    .split('T')[0]
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default apiClient