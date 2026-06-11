export interface TransformerReading {
  Timestamp: string | Date;
  Ambient_Temperature_C: number | null;
  Age_yr: number | null;
  Maintenance_Count: number | null;
  No_of_Short_Circuits: number | null;
  Outages_hours_per_year: number | null;
  Current_A: number | null;
  Voltage_kV: number | null;
  Temp_score: number | null;
  Age_score: number | null;
  Maintenance_score: number | null;
  ShortCircuit_score: number | null;
  Outage_score: number | null;
  Current_score: number | null;
  Voltage_score: number | null;
  HI: number | null;
  Predicted_HI: number | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

export interface LatestReadingResponse {
  success: boolean;
  data: TransformerReading | null;
}

export interface ChartDataPoint {
  Timestamp: string | Date;
  HI: number | null;
  Predicted_HI: number | null;
  Ambient_Temperature_C: number | null;
  Current_A: number | null;
  Voltage_kV: number | null;
}

export interface ChartDataResponse {
  success: boolean;
  data: ChartDataPoint[];
}

export interface StatsData {
  avgHI: number | null;
  avgPredictedHI: number | null;
  maxHI: number | null;
  minHI: number | null;
  recordCount: number;
}

export interface StatsResponse {
  success: boolean;
  data: StatsData;
}

export interface HealthMetrics {
  status: 'GOOD' | 'MONITOR' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  healthIndex: number | null;
  ageYr: number | null;
  ambientTemp: number | null;
  currentA: number | null;
  voltageKV: number | null;
  lastUpdated: string | Date | null;
}

export interface HealthMetricsResponse {
  success: boolean;
  data: HealthMetrics;
}
