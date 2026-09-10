// ─── Contract ────────────────────────────────────────────────────────────────

export type ContractStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED'
export type MilestoneStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PAYMENT_PROCESSING'
  | 'RELEASED'
  | 'FAILED'
  | 'DISPUTED'
export type TransactionStatus = 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

export interface Contract {
  id: string
  projectId: string
  startupId: string
  studentId: string
  title: string
  description?: string
  totalAmount: number
  currency: string
  status: ContractStatus
  terms?: string
  createdAt: string
  updatedAt: string
  milestones?: Milestone[]
}

export interface Milestone {
  id: string
  contractId: string
  title: string
  description?: string
  amount: number
  sequenceOrder: number
  status: MilestoneStatus
  dueDate?: string
  approvedBy?: string
  approvedAt?: string
  releasedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  milestoneId: string
  providerTransactionId?: string
  providerOrderId?: string
  providerPaymentId?: string
  amount: number
  currency: string
  status: TransactionStatus
  provider: string
  failureReason?: string
  createdAt: string
  completedAt?: string
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  actor: string
  description?: string
  metadata?: string
  createdAt: string
}

// ─── API Wrappers ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  timestamp: string
  error?: {
    code: string
    message: string
    violations?: Record<string, string>
  }
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalContracts: number
  activeContracts: number
  pendingMilestones: number
  releasedPayments: number
  totalRevenue: number
}
