# Authentication Testing Guide

## Phase 4 - Authentication Integration Complete ✅

This document provides manual testing instructions for the JWT authentication implementation.

---

## Quick Start

### 1. Generate Test Tokens

Generate JWT tokens for testing:

```bash
# From backend directory
cd workspace-service/backend

# Generate token for user1
node scripts/generateToken.js testuser123 student 24h

# Generate token for user2
node scripts/generateToken.js anotheruser456 student 24h
```

Save the generated tokens for use in API requests.

### 2. Start the Server

```bash
# From workspace-service directory
docker-compose up

# OR run locally
cd backend
npm start
```

---

## Authentication Flow

```
Request
  ↓
Authentication Middleware (validates JWT)
  ↓
Validators (validate request data)
  ↓
Controllers (extract req.user.id)
  ↓
Services (authorization checks)
  ↓
Models (database operations)
```

---

## Test Scenarios

### Scenario 1: Missing Authorization Header

**Request:**
```bash
curl -X GET http://localhost:5000/api/workspaces/project/test-project
```

**Expected Response:**
- Status: `401 Unauthorized`
- Body:
```json
{
  "success": false,
  "message": "Authorization header is missing"
}
```

---

### Scenario 2: Invalid Bearer Format

**Request:**
```bash
curl -H "Authorization: InvalidFormat" \
  http://localhost:5000/api/workspaces/project/test-project
```

**Expected Response:**
- Status: `401 Unauthorized`
- Body:
```json
{
  "success": false,
  "message": "Authorization header format must be: Bearer <token>"
}
```

---

### Scenario 3: Invalid/Malformed Token

**Request:**
```bash
curl -H "Authorization: Bearer invalid.token.here" \
  http://localhost:5000/api/workspaces/project/test-project
```

**Expected Response:**
- Status: `401 Unauthorized`
- Body:
```json
{
  "success": false,
  "message": "Invalid token"
}
```

---

### Scenario 4: Expired Token

Generate an expired token:
```bash
node scripts/generateToken.js testuser123 student 1s
# Wait 2 seconds, then use the token
```

**Expected Response:**
- Status: `401 Unauthorized`
- Body:
```json
{
  "success": false,
  "message": "Token has expired"
}
```

---

### Scenario 5: Valid Token - Workspace Access

**Request:**
```bash
# Use a valid token from generateToken.js
TOKEN="<your-generated-token>"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/workspaces/project/test-project
```

**Expected Response:**
- Status: `200 OK` (if workspace exists) or `404 Not Found` (if it doesn't)
- Authenticated user can access workspace data

---

### Scenario 6: Create Message (Identity from Token)

**Setup:**
- Generate token for `testuser123`
- Create a message

**Request:**
```bash
TOKEN="<your-generated-token>"
WORKSPACE_ID="<valid-workspace-id>"

curl -X POST http://localhost:5000/api/workspaces/$WORKSPACE_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test message"
  }'
```

**Expected Behavior:**
- Message created with `senderId = testuser123` (from token, NOT from request body)
- Client cannot spoof senderId
- Status: `201 Created`

---

### Scenario 7: Edit Own Message (Authorization Success)

**Setup:**
1. Create message as `testuser123`
2. Use same user token to edit

**Request:**
```bash
TOKEN="<testuser123-token>"
MESSAGE_ID="<message-created-by-testuser123>"

curl -X PUT http://localhost:5000/api/messages/$MESSAGE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Updated message text"
  }'
```

**Expected Response:**
- Status: `200 OK`
- Message updated successfully

---

### Scenario 8: Edit Other User's Message (Authorization Failure)

**Setup:**
1. Create message as `testuser123`
2. Try to edit using `anotheruser456` token

**Request:**
```bash
TOKEN="<anotheruser456-token>"
MESSAGE_ID="<message-created-by-testuser123>"

curl -X PUT http://localhost:5000/api/messages/$MESSAGE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Trying to edit someone else message"
  }'
```

**Expected Response:**
- Status: `403 Forbidden`
- Body:
```json
{
  "success": false,
  "message": "Forbidden: You can only edit your own messages"
}
```

---

### Scenario 9: Delete Own Message (Authorization Success)

**Request:**
```bash
TOKEN="<testuser123-token>"
MESSAGE_ID="<message-created-by-testuser123>"

curl -X DELETE http://localhost:5000/api/messages/$MESSAGE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
- Status: `200 OK`
- Message soft-deleted successfully

---

### Scenario 10: Delete Other User's Message (Authorization Failure)

**Request:**
```bash
TOKEN="<anotheruser456-token>"
MESSAGE_ID="<message-created-by-testuser123>"

curl -X DELETE http://localhost:5000/api/messages/$MESSAGE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
- Status: `403 Forbidden`
- Body:
```json
{
  "success": false,
  "message": "Forbidden: You can only delete your own messages"
}
```

---

### Scenario 11: Create Comment (Identity from Token)

**Request:**
```bash
TOKEN="<your-generated-token>"
WORKSPACE_ID="<valid-workspace-id>"

curl -X POST http://localhost:5000/api/workspaces/$WORKSPACE_ID/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test comment",
    "fileRef": "src/app.js",
    "lineNumber": 42
  }'
```

**Expected Behavior:**
- Comment created with `authorId = testuser123` (from token)
- Status: `201 Created`

---

### Scenario 12: Edit Own Comment (Authorization Success)

**Request:**
```bash
TOKEN="<testuser123-token>"
COMMENT_ID="<comment-created-by-testuser123>"

curl -X PUT http://localhost:5000/api/comments/$COMMENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Updated comment text"
  }'
```

**Expected Response:**
- Status: `200 OK`
- Comment updated successfully

---

### Scenario 13: Edit Other User's Comment (Authorization Failure)

**Request:**
```bash
TOKEN="<anotheruser456-token>"
COMMENT_ID="<comment-created-by-testuser123>"

curl -X PUT http://localhost:5000/api/comments/$COMMENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Trying to edit someone else comment"
  }'
```

**Expected Response:**
- Status: `403 Forbidden`
- Body:
```json
{
  "success": false,
  "message": "Forbidden: You can only edit your own comments"
}
```

---

### Scenario 14: Client Cannot Spoof Identity

**Request:**
```bash
TOKEN="<testuser123-token>"
WORKSPACE_ID="<valid-workspace-id>"

# Try to send senderId in request body
curl -X POST http://localhost:5000/api/workspaces/$WORKSPACE_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "attacker123",
    "text": "Trying to spoof identity"
  }'
```

**Expected Behavior:**
- Message created with `senderId = testuser123` (from token)
- Request body `senderId` is **IGNORED**
- Server uses `req.user.id` from authenticated token

---

## Verification Checklist

Use this checklist to verify complete authentication implementation:

- [ ] ✓ Valid JWT token works
- [ ] ✓ Invalid JWT token rejected (401)
- [ ] ✓ Expired JWT token rejected (401)
- [ ] ✓ Missing Authorization header rejected (401)
- [ ] ✓ Invalid Bearer format rejected (401)
- [ ] ✓ Malformed token rejected (401)
- [ ] ✓ Message created with authenticated user ID (not client-supplied)
- [ ] ✓ Comment created with authenticated user ID (not client-supplied)
- [ ] ✓ User can edit their own message
- [ ] ✓ User cannot edit other user's message (403)
- [ ] ✓ User can delete their own message
- [ ] ✓ User cannot delete other user's message (403)
- [ ] ✓ User can edit their own comment
- [ ] ✓ User cannot edit other user's comment (403)
- [ ] ✓ User can delete their own comment
- [ ] ✓ User cannot delete other user's comment (403)
- [ ] ✓ Client cannot spoof senderId in request body
- [ ] ✓ Client cannot spoof authorId in request body
- [ ] ✓ Health endpoint remains public (no auth required)

---

## Architecture Verification

### JWT Utility (`src/utils/jwt.js`)
- ✓ Loads public.pem from environment variable
- ✓ Verifies RS256 signatures
- ✓ No Express-specific code
- ✓ Reusable for future JWKS migration
- ✓ Throws meaningful errors

### Authentication Middleware (`src/middleware/authMiddleware.js`)
- ✓ Extracts Bearer token
- ✓ Validates Authorization header format
- ✓ Calls JWT utility for verification
- ✓ Maps JWT `sub` → `req.user.id`
- ✓ Maps JWT `role` → `req.user.role`
- ✓ Returns 401 for authentication failures

### Routes
- ✓ Authentication runs BEFORE validators
- ✓ All protected endpoints require authentication
- ✓ Health endpoints remain public

### Controllers
- ✓ Never verify JWTs (handled by middleware)
- ✓ Extract `req.user.id` for identity
- ✓ Pass userId to services for authorization

### Services
- ✓ Never verify JWTs
- ✓ Implement ownership authorization
- ✓ Return 403 for authorization failures
- ✓ Check `message.senderId === userId`
- ✓ Check `comment.authorId === userId`

### Validators
- ✓ No validation of senderId (comes from token)
- ✓ No validation of authorId (comes from token)
- ✓ No validation of ownerId (not implemented)

### Models
- ✓ No knowledge of authentication
- ✓ No JWT-related code
- ✓ Pure data layer

---

## Future Integration Notes

### Migrating to Person A's Authentication Service

When Person A's Authentication Service is ready, only these changes are needed:

**1. Update JWT Utility (`src/utils/jwt.js`)**

Replace public key loading with JWKS endpoint fetching:

```javascript
// Before (local public key)
loadPublicKey() {
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;
  this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
}

// After (JWKS endpoint)
async loadPublicKey() {
  const jwksUrl = process.env.JWT_JWKS_URL;
  const response = await fetch(jwksUrl);
  const jwks = await response.json();
  // Extract and cache public key from JWKS
}
```

**2. Update Environment Variables**

```bash
# Remove:
# JWT_PUBLIC_KEY_PATH=keys/public.pem

# Add:
JWT_JWKS_URL=http://auth-service/.well-known/jwks.json
```

**No other files need to change.**

Controllers, services, routes, validators, and models remain unchanged.

---

## Security Notes

### Private Key Security

- ✓ `private.pem` excluded from git via `.gitignore`
- ✓ `private.pem` used ONLY for development token generation
- ✓ Backend NEVER uses `private.pem`
- ✓ Backend ONLY uses `public.pem` for verification

### Token Validation

- ✓ Signature verified using RS256
- ✓ Expiration checked automatically
- ✓ No token bypass possible
- ✓ Tokens cannot be forged without private key

### Authorization

- ✓ Client identity never trusted
- ✓ All operations use authenticated user
- ✓ Ownership checks in service layer
- ✓ 403 returned for authorization failures

---

## Summary

Phase 4 Authentication Implementation is **COMPLETE** ✅

**Implemented:**
- JWT verification using RS256 with local public key
- Authentication middleware (before validators)
- Identity from authenticated user (req.user.id)
- Authorization checks in service layer
- No client identity trusted
- Token generation script for testing
- Clean architecture maintained

**Ready for:**
- Future migration to Person A's JWKS endpoint
- Only JWT utility/config needs updating
- No changes to controllers, services, or models required

**Testing:**
- Use `scripts/generateToken.js` to create test tokens
- Follow test scenarios above to verify authentication
- Verify authorization with multiple users
- Confirm client cannot spoof identity
