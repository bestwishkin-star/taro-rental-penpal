import type { HealthCheckResponse } from '@shared/contracts/health';
import { NextResponse } from 'next/server';


import { getSystemStatus } from '@/modules/system/system.service';

export async function GET() {
  const payload: HealthCheckResponse = await getSystemStatus();

  return NextResponse.json(payload);
}
