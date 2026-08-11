import { NextResponse } from 'next/server'
import { getService } from '@/lib/defence-service'

/**
 * Returns a snapshot of the current access-control dashboard state.
 * Data is served from the in-memory TypeScript service in this environment.
 */
export function GET() {
  const service = getService()
  return NextResponse.json(service.getDashboard())
}
