/**
 * TypeScript mirror of the Python OOP backend (backend/domain/).
 *
 * Class hierarchy:
 *   Device → TrustedDevice
 *   RiskFactor, RiskEngine
 *   AccessRequest, AccessHistoryEntry, NetworkSegment, ConnectedNode
 *   AccessControlService  (orchestrator)
 *   buildService()        (seed factory)
 *
 * Used by Next.js Route Handlers for the v0 preview environment.
 * The canonical Python implementation lives in backend/ and runs via
 * `vercel dev` / the Vercel experimentalServices setup in production.
 */

// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------

export type RiskLevel = 'Low' | 'Medium' | 'High'
export type AccessStatus = 'Pending' | 'Approved' | 'Denied' | 'Quarantined'

export interface RiskFactor {
  label: string
  level: RiskLevel
}

// ---------------------------------------------------------------------------
// RiskEngine  (mirrors backend/domain/risk_engine.py)
// ---------------------------------------------------------------------------

export class RiskEngine {
  private static readonly WEIGHTS: Record<RiskLevel, number> = {
    High: 30,
    Medium: 12.5,
    Low: 5,
  }

  private static readonly HIGH_THRESHOLD = 70
  private static readonly MEDIUM_THRESHOLD = 35

  computeScore(factors: RiskFactor[]): number {
    const total = factors.reduce(
      (sum, factor) => sum + (RiskEngine.WEIGHTS[factor.level] ?? 0),
      0,
    )
    return Math.min(Math.round(total), 100)
  }

  classify(score: number): RiskLevel {
    if (score >= RiskEngine.HIGH_THRESHOLD) return 'High'
    if (score >= RiskEngine.MEDIUM_THRESHOLD) return 'Medium'
    return 'Low'
  }

  assess(factors: RiskFactor[]): [number, RiskLevel] {
    const score = this.computeScore(factors)
    return [score, this.classify(score)]
  }
}

// ---------------------------------------------------------------------------
// Device  (mirrors backend/domain/models.py :: Device)
// ---------------------------------------------------------------------------

export class Device {
  constructor(
    public readonly deviceId: string,
    public readonly name: string,
    public readonly ipAddress: string,
    public readonly macAddress: string,
    public readonly platform: string = '',
  ) {}

  toDict() {
    return {
      id: this.deviceId,
      name: this.name,
      ipAddress: this.ipAddress,
      macAddress: this.macAddress,
      platform: this.platform,
    }
  }
}

// ---------------------------------------------------------------------------
// TrustedDevice  (mirrors backend/domain/models.py :: TrustedDevice)
// ---------------------------------------------------------------------------

export class TrustedDevice extends Device {
  constructor(
    deviceId: string,
    name: string,
    ipAddress: string,
    macAddress: string,
    platform: string,
    public readonly addedOn: string,
  ) {
    super(deviceId, name, ipAddress, macAddress, platform)
  }

  toDict() {
    return { ...super.toDict(), addedOn: this.addedOn }
  }
}

// ---------------------------------------------------------------------------
// AccessRequest  (mirrors backend/domain/models.py :: AccessRequest)
// ---------------------------------------------------------------------------

export class AccessRequest {
  public status: AccessStatus = 'Pending'

  constructor(
    public readonly requestId: string,
    public readonly device: Device,
    public readonly requestedAt: string,
    public readonly riskFactors: RiskFactor[],
    public readonly riskScore: number,
    public readonly riskLevel: RiskLevel,
  ) {}

  resolve(status: AccessStatus): void {
    this.status = status
  }

  toDict() {
    return {
      id: this.requestId,
      device: this.device.toDict(),
      requestedAt: this.requestedAt,
      riskScore: this.riskScore,
      riskLevel: this.riskLevel,
      status: this.status,
      riskFactors: this.riskFactors,
    }
  }
}

// ---------------------------------------------------------------------------
// Value-object types (no class needed — plain data)
// ---------------------------------------------------------------------------

export interface AccessHistoryEntry {
  id: string
  timestamp: string
  action: string
  deviceLabel: string
  riskLevel: RiskLevel
}

export interface NetworkSegment {
  key: string
  label: string
  deviceCount: number
  color: string
}

export interface ConnectedNode {
  name: string
  role: string
  online: boolean
}

// ---------------------------------------------------------------------------
// AccessControlService  (mirrors backend/domain/service.py)
// ---------------------------------------------------------------------------

export class RequestNotFoundError extends Error {}

export class AccessControlService {
  private readonly engine = new RiskEngine()
  private historySeq: number

  constructor(
    private readonly requests: AccessRequest[],
    private readonly trustedDevices: TrustedDevice[],
    private readonly history: AccessHistoryEntry[],
    private readonly segments: Map<string, NetworkSegment>,
    private readonly nodes: ConnectedNode[],
    private readonly systemStatus: { state: string; lastScan: string },
    public approvedToday: number = 0,
    public deniedToday: number = 0,
    public quarantinedDevices: number = 0,
    public totalControlled: number = 0,
  ) {
    this.historySeq = history.length
  }

  // -- queries -----------------------------------------------------------

  get pendingRequests(): AccessRequest[] {
    return this.requests.filter((request) => request.status === 'Pending')
  }

  private findRequest(id: string): AccessRequest {
    const request = this.requests.find((candidate) => candidate.requestId === id)
    if (!request) throw new RequestNotFoundError(id)
    return request
  }

  // -- history -----------------------------------------------------------

  private log(action: string, request: AccessRequest): void {
    this.historySeq++
    const deviceLabel = `${request.device.name} (${request.device.ipAddress})`
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    this.history.unshift({
      id: `h${this.historySeq}`,
      timestamp,
      action,
      deviceLabel,
      riskLevel: request.riskLevel,
    })
  }

  private adjustSegment(key: string, delta: number): void {
    const segment = this.segments.get(key)
    if (segment) segment.deviceCount = Math.max(0, segment.deviceCount + delta)
  }

  // -- operator actions --------------------------------------------------

  approveRequest(id: string): void {
    const request = this.findRequest(id)
    request.resolve('Approved')
    this.approvedToday++
    this.totalControlled++
    this.trustedDevices.unshift(
      new TrustedDevice(
        request.device.deviceId,
        request.device.name,
        request.device.ipAddress,
        request.device.macAddress,
        request.device.platform,
        new Date().toLocaleDateString('en-GB'),
      ),
    )
    this.adjustSegment('pending', -1)
    this.adjustSegment('trusted', +1)
    this.log('Access approved', request)
  }

  denyRequest(id: string): void {
    const request = this.findRequest(id)
    request.resolve('Denied')
    this.deniedToday++
    this.adjustSegment('pending', -1)
    this.adjustSegment('blocked', +1)
    this.log('Access denied', request)
  }

  quarantineRequest(id: string): void {
    const request = this.findRequest(id)
    request.resolve('Quarantined')
    this.quarantinedDevices++
    this.totalControlled++
    this.adjustSegment('pending', -1)
    this.adjustSegment('quarantine', +1)
    this.log('Device quarantined', request)
  }

  // -- read models -------------------------------------------------------

  getDecision(): AccessRequest | null {
    const pendingRequests = this.pendingRequests
    if (!pendingRequests.length) return null
    return pendingRequests.reduce((highestRiskRequest, currentRequest) =>
      currentRequest.riskScore > highestRiskRequest.riskScore
        ? currentRequest
        : highestRiskRequest,
    )
  }

  getDashboard() {
    return {
      summary: {
        pendingRequests: this.pendingRequests.length,
        approvedToday: this.approvedToday,
        deniedToday: this.deniedToday,
        quarantinedDevices: this.quarantinedDevices,
        totalControlled: this.totalControlled,
      },
      systemStatus: this.systemStatus,
      nodes: this.nodes,
      pendingRequests: this.pendingRequests.map((r) => r.toDict()),
      decision: this.getDecision()?.toDict() ?? null,
      trustedDevices: this.trustedDevices.map((d) => d.toDict()),
      history: this.history,
      segmentation: Array.from(this.segments.values()),
    }
  }
}

// ---------------------------------------------------------------------------
// Seed factory  (mirrors backend/domain/seed.py :: build_service)
// ---------------------------------------------------------------------------

function buildService(): AccessControlService {
  const engine = new RiskEngine()

  function makeRequest(
    id: string,
    name: string,
    platform: string,
    ip: string,
    mac: string,
    requestedAt: string,
    factors: RiskFactor[],
  ): AccessRequest {
    const device = new Device(id, name, ip, mac, platform)
    const [score, level] = engine.assess(factors)
    return new AccessRequest(id, device, requestedAt, factors, score, level)
  }

  const requests = [
    makeRequest(
      'req-1', 'Unknown Device', 'Windows PC', '192.168.1.45', 'AA:BB:CC:DD:EE:44', '10:19 AM',
      [
        { label: 'Unknown device', level: 'High' },
        { label: 'Not in trusted list', level: 'Medium' },
        { label: 'Unusual connection time', level: 'Medium' },
        { label: 'Multiple failed access attempts', level: 'High' },
      ],
    ),
    makeRequest(
      'req-2', 'iPhone 14', 'Apple', '192.168.1.77', 'AA:BB:CC:DD:EE:77', '10:21 AM',
      [
        { label: 'Not in trusted list', level: 'Medium' },
        { label: 'Unusual connection time', level: 'Medium' },
        { label: 'New device on network', level: 'Medium' },
      ],
    ),
    makeRequest(
      'req-3', 'Unknown Device', 'Linux', '192.168.1.88', 'AA:BB:CC:DD:EE:88', '10:23 AM',
      [
        { label: 'Recognized vendor', level: 'Low' },
        { label: 'New device on network', level: 'Medium' },
      ],
    ),
  ]

  const trustedDevices = [
    new TrustedDevice('t1', 'Admin-PC', '192.168.1.10', 'AA:BB:CC:DD:EE:01', 'Windows PC', '17/05/2024'),
    new TrustedDevice('t2', 'iPhone 14', '192.168.1.11', 'AA:BB:CC:DD:EE:02', 'Apple', '17/05/2024'),
    new TrustedDevice('t3', 'Laptop-Student', '192.168.1.12', 'AA:BB:CC:DD:EE:03', 'Windows PC', '17/05/2024'),
    new TrustedDevice('t4', 'Smart TV', '192.168.1.23', 'AA:BB:CC:DD:EE:05', 'Android TV', '16/05/2024'),
    new TrustedDevice('t5', 'Office-Printer', '192.168.1.31', 'AA:BB:CC:DD:EE:09', 'IoT', '14/05/2024'),
    new TrustedDevice('t6', 'MacBook-Air', '192.168.1.18', 'AA:BB:CC:DD:EE:0A', 'Apple', '13/05/2024'),
    new TrustedDevice('t7', 'NAS-Server', '192.168.1.40', 'AA:BB:CC:DD:EE:0B', 'Linux', '11/05/2024'),
    new TrustedDevice('t8', 'Pixel-8', '192.168.1.27', 'AA:BB:CC:DD:EE:0C', 'Android', '10/05/2024'),
  ]

  const history: AccessHistoryEntry[] = [
    { id: 'h1', timestamp: '10:23 AM', action: 'Access denied', deviceLabel: 'Unknown Device (192.168.1.88)', riskLevel: 'High' },
    { id: 'h2', timestamp: '10:21 AM', action: 'Access approved', deviceLabel: 'iPhone 14 (192.168.1.11)', riskLevel: 'Low' },
    { id: 'h3', timestamp: '10:19 AM', action: 'Access requested', deviceLabel: 'Unknown Device (192.168.1.45)', riskLevel: 'Medium' },
    { id: 'h4', timestamp: '10:18 AM', action: 'Access approved', deviceLabel: 'Smart TV (192.168.1.23)', riskLevel: 'Low' },
  ]

  const segments = new Map<string, NetworkSegment>([
    ['trusted',    { key: 'trusted',    label: 'Trusted Network',    deviceCount: 8, color: '#22c55e' }],
    ['quarantine', { key: 'quarantine', label: 'Quarantine Network', deviceCount: 4, color: '#ef4444' }],
    ['pending',    { key: 'pending',    label: 'Pending Approval',   deviceCount: 3, color: '#f59e0b' }],
    ['blocked',    { key: 'blocked',    label: 'Blocked Devices',    deviceCount: 1, color: '#6366f1' }],
  ])

  const nodes: ConnectedNode[] = [
    { name: 'Pi 5',      role: 'Controller', online: true },
    { name: 'Pi 3',      role: 'Scanner',    online: true },
    { name: 'Pi Zero W', role: 'Portal',     online: true },
  ]

  return new AccessControlService(
    requests,
    trustedDevices,
    history,
    segments,
    nodes,
    { state: 'Active', lastScan: '10:24:30 AM' },
    /* approvedToday */    7,
    /* deniedToday */      2,
    /* quarantinedDevices */ 4,
    /* totalControlled */  16,
  )
}

// ---------------------------------------------------------------------------
// Module-level singleton — persists across requests in Next.js dev mode.
// In production the Python backend (backend/) handles all requests.
// ---------------------------------------------------------------------------
let _instance: AccessControlService | null = null

export function getService(): AccessControlService {
  if (!_instance) _instance = buildService()
  return _instance
}
