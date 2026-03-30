import type { HealthCheckResponse } from '@shared/contracts/health';

import { pool } from '@/lib/mysql';

export async function getSystemStatus(): Promise<HealthCheckResponse> {
  try {
    await pool.execute('SELECT 1');

    return {
      service: 'backend',
      status: 'ok',
      message: 'MySQL connection is healthy.',
      timestamp: new Date().toISOString()
    };
  } catch {
    return {
      service: 'backend',
      status: 'degraded',
      message: 'MySQL is unavailable. Check MYSQL_* environment variables and database connectivity.',
      timestamp: new Date().toISOString()
    };
  }
}
