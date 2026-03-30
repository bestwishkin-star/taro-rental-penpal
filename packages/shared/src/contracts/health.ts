export interface HealthCheckResponse {
  message: string;
  service: string;
  status: 'ok' | 'degraded';
  timestamp: string;
}
