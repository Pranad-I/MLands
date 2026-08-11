import { NextResponse } from 'next/server'
import { getService, RequestNotFoundError } from '@/lib/defence-service'

const ALLOWED_ACTIONS = new Set(['approve', 'deny', 'quarantine'])
const MAX_REQUEST_ID_LENGTH = 64

/**
 * Validates dynamic route params for correctness and reasonableness before
 * applying a state-changing action to the in-memory access-control service.
 */
function validateRequestId(rawId: unknown): { value?: string; error?: string } {
  if (typeof rawId !== 'string') return { error: 'Request id must be a string' }

  const requestId = rawId.trim()
  if (!requestId) return { error: 'Request id is required' }
  if (requestId.length > MAX_REQUEST_ID_LENGTH) {
    return { error: 'Request id is too long' }
  }
  if (!/^[a-zA-Z0-9-]+$/.test(requestId)) {
    return { error: 'Request id has invalid characters' }
  }

  return { value: requestId }
}

function validateAction(rawAction: unknown): { value?: string; error?: string } {
  if (typeof rawAction !== 'string') return { error: 'Action must be a string' }

  const action = rawAction.trim().toLowerCase()
  if (!action) return { error: 'Action is required' }
  if (!ALLOWED_ACTIONS.has(action)) return { error: 'Unknown action' }

  return { value: action }
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string; action: string } },
) {
  const idValidation = validateRequestId(params.id)
  if (idValidation.error) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  const actionValidation = validateAction(params.action)
  if (actionValidation.error) {
    return NextResponse.json({ error: actionValidation.error }, { status: 400 })
  }

  const requestId = idValidation.value!
  const action = actionValidation.value!
  const service = getService()

  try {
    if (action === 'approve') {
      service.approveRequest(requestId)
    } else if (action === 'deny') {
      service.denyRequest(requestId)
    } else {
      service.quarantineRequest(requestId)
    }

    return NextResponse.json(service.getDashboard())
  } catch (err) {
    if (err instanceof RequestNotFoundError) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
