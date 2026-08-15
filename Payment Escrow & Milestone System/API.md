# Person C REST API Documentation

This document describes all implemented REST endpoints in **Person C — Payment Escrow & Milestone System**.

---

## Base Configuration

- **Base URL**: `http://localhost:8080` (or `http://localhost:5173/api` via Frontend Nginx Proxy)
- **Authentication**: `Authorization: Bearer <JWT>`
- **Token Verification**: RS256 algorithm verified using Service A public key (`public.pem`).
- **Content Type**: `application/json`

---

## 1. Contracts API

### 1.1 `POST /api/contracts` or `POST /api/payments/contracts`

Creates a new Escrow Contract with payment milestones.

- **Authorization**: Roles `STARTUP`, `ADMIN`
- **Request Headers**:
  - `Authorization`: `Bearer <token>`
- **Request Body**:

```json
{
  "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "startupId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "studentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Full-Stack Freelance Project",
  "description": "Develop and deploy DevCollab escrow microservice",
  "totalAmount": 5000.00,
  "currency": "USD",
  "terms": "50% upfront milestone, 50% completion milestone",
  "milestones": [
    {
      "title": "Phase 1 Delivery",
      "description": "Backend API & Database migrations",
      "amount": 2500.00,
      "sequenceOrder": 1,
      "dueDate": "2026-09-01"
    },
    {
      "title": "Phase 2 Delivery",
      "description": "Frontend UI & Integration tests",
      "amount": 2500.00,
      "sequenceOrder": 2,
      "dueDate": "2026-09-30"
    }
  ]
}
```

- **Response (201 Created)**:

```json
{
  "success": true,
  "message": "Contract created successfully",
  "data": {
    "id": "11223344-5566-7788-9900-aabbccddeeff",
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "startupId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "studentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Full-Stack Freelance Project",
    "description": "Develop and deploy DevCollab escrow microservice",
    "totalAmount": 5000.00,
    "currency": "USD",
    "status": "ACTIVE",
    "createdAt": "2026-08-14T14:00:00Z",
    "updatedAt": "2026-08-14T14:00:00Z",
    "milestones": [
      {
        "id": "98765432-10fe-dcba-0987-654321fedcba",
        "title": "Phase 1 Delivery",
        "amount": 2500.00,
        "sequenceOrder": 1,
        "status": "PENDING"
      }
    ]
  },
  "timestamp": "2026-08-14T14:00:00Z"
}
```

---

### 1.2 `GET /api/contracts/{id}` or `GET /api/payments/contracts/{id}`

Fetches contract details including all associated milestones.

- **Authorization**: Roles `STARTUP`, `STUDENT`, `ADMIN`
- **Response (200 OK)**: `ApiResponse<ContractResponse>`

---

### 1.3 `GET /api/contracts/project/{projectId}`

Lists all contracts for a specific matched project ID.

- **Authorization**: Roles `STARTUP`, `STUDENT`, `ADMIN`
- **Response (200 OK)**: `ApiResponse<PageResponse<ContractResponse>>`

---

## 2. Milestones API

### 2.1 `POST /api/milestones/{id}/approve` or `POST /api/payments/milestones/{id}/approve`

Approves a milestone deliverable submitted by a student.

- **Authorization**: Roles `STARTUP`, `ADMIN`
- **Response (200 OK)**:

```json
{
  "success": true,
  "message": "Milestone approved. Payment order created.",
  "data": {
    "id": "98765432-10fe-dcba-0987-654321fedcba",
    "contractId": "11223344-5566-7788-9900-aabbccddeeff",
    "title": "Phase 1 Delivery",
    "amount": 2500.00,
    "status": "APPROVED",
    "approvedAt": "2026-08-14T14:15:00Z"
  }
}
```

---

### 2.2 `POST /api/milestones/{id}/release` or `POST /api/payments/milestones/{id}/release`

Initiates payment order release with the payment provider (PayPal or Mock).

- **Authorization**: Roles `STARTUP`, `ADMIN`
- **Headers**:
  - `Idempotency-Key`: Optional unique key for API request deduplication.
- **Response (200 OK)**: `ApiResponse<MilestoneResponse>`

---

## 3. Webhook API

### 3.1 `POST /api/payments/webhook`

Receives asynchronous payment status notifications from PayPal or Razorpay.

- **Authorization**: Public (JWT Bypassed) — Secured via HMAC / Provider Signature Verification.
- **Headers (PayPal)**:
  - `PayPal-Transmission-Id`
  - `PayPal-Transmission-Time`
  - `PayPal-Cert-Url`
  - `PayPal-Auth-Algo`
  - `PayPal-Transmission-Sig`
  - `PayPal-Webhook-Id`
- **Headers (Razorpay)**:
  - `X-Razorpay-Signature`
- **Response (200 OK)**: `{"success": true, "message": "Webhook processed"}`
- **Error Response (401 Unauthorized)**: Invalid webhook signature.

---

## 4. Audit Log API

### 4.1 `GET /api/audit`

Queries the append-only audit trail.

- **Authorization**: Role `ADMIN`
- **Query Parameters**: `page`, `size`, `entityType`, `action`
- **Response (200 OK)**: `ApiResponse<PageResponse<AuditLogResponse>>`
