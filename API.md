# Wrenlist API Routes

Complete REST API documentation for Wrenlist inventory and marketplace management.

## Overview

All API routes require authentication via Supabase Auth. User must be logged in.

**Base URL**: `http://localhost:3000/api` (development) or `https://wrenlist.com/api` (production)

**Authentication**: Bearer token via Supabase session

**Response Format**: Consistent JSON responses with `data`, `error`, `status`, and optional `pagination`.

---

## Finds (Products/Inventory)

### GET /api/finds
Fetch all finds for authenticated user with optional filters.

**Query Parameters:**
- `status` (optional): `draft`, `listed`, `on_hold`, `sold` - filter by status
- `source_type` (optional): `house_clearance`, `charity_shop`, `car_boot`, `online_haul`, `flea_market`, `other`
- `limit` (optional, default 50): Number of results
- `offset` (optional, default 0): Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Vintage Denim Jacket",
      "category": "Outerwear",
      "brand": "Levi's",
      "size": "M",
      "colour": "Blue",
      "condition": "excellent",
      "description": "Perfect condition vintage denim",
      "source_type": "charity_shop",
      "source_name": "Oxfam Bristol",
      "sourced_at": "2024-03-30T10:00:00Z",
      "cost_gbp": 5.00,
      "asking_price_gbp": 35.00,
      "sold_price_gbp": null,
      "status": "listed",
      "sold_at": null,
      "photos": ["url1", "url2"],
      "ai_generated_description": null,
      "ai_suggested_price_low": 30.00,
      "ai_suggested_price_high": 45.00,
      "created_at": "2024-03-30T10:00:00Z",
      "updated_at": "2024-03-30T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 120,
    "pages": 3
  }
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized (not logged in)
- `500`: Server error

---

### POST /api/finds
Create a new find (inventory item).

**Request Body:**
```json
{
  "name": "Vintage Denim Jacket",
  "category": "Outerwear",
  "brand": "Levi's",
  "size": "M",
  "colour": "Blue",
  "condition": "excellent",
  "description": "Perfect condition vintage denim",
  "source_type": "charity_shop",
  "source_name": "Oxfam Bristol",
  "sourced_at": "2024-03-30",
  "cost_gbp": 5.00,
  "asking_price_gbp": 35.00,
  "status": "draft"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Vintage Denim Jacket",
    ... (full find object)
  }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error (missing required fields)
- `401`: Unauthorized
- `500`: Server error

**Validation Rules:**
- `name` (required): Must be non-empty
- `source_type` (required): Must be one of enum values
- `cost_gbp`, `asking_price_gbp` (optional): Must be non-negative if provided
- `condition` (optional): Must be one of `excellent`, `good`, `fair`, `poor`

---

### GET /api/finds/[id]
Fetch a single find by ID.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    ... (full find object)
  }
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Find not found or doesn't belong to user
- `500`: Server error

---

### PUT /api/finds/[id]
Update a find (partial update).

**Request Body:**
```json
{
  "asking_price_gbp": 40.00,
  "status": "listed"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    ... (updated find object)
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Validation error
- `401`: Unauthorized
- `404`: Find not found
- `500`: Server error

---

### DELETE /api/finds/[id]
Delete a find permanently.

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Find not found
- `500`: Server error

---

## Listings (Marketplace)

### GET /api/listings
Fetch all listings for authenticated user.

**Query Parameters:**
- `find_id` (optional): Filter by find
- `platform` (optional): `vinted`, `ebay`, `etsy`, `shopify`
- `status` (optional): `draft`, `live`, `sold`, `delisted`
- `limit` (optional, default 50)
- `offset` (optional, default 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "find_id": "uuid",
      "user_id": "uuid",
      "platform": "vinted",
      "platform_listing_id": "12345678",
      "platform_url": "https://vinted.co.uk/items/...",
      "status": "live",
      "listed_at": "2024-03-30T10:00:00Z",
      "delisted_at": null,
      "views": 45,
      "likes": 12,
      "messages": 3,
      "created_at": "2024-03-30T10:00:00Z",
      "updated_at": "2024-03-30T11:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST /api/listings
Create a new listing for a find on a marketplace.

**Request Body:**
```json
{
  "find_id": "uuid",
  "platform": "vinted",
  "platform_listing_id": "12345678",
  "platform_url": "https://vinted.co.uk/items/...",
  "status": "live",
  "listed_at": "2024-03-30T10:00:00Z",
  "views": 0,
  "likes": 0,
  "messages": 0
}
```

**Response:**
```json
{
  "data": { ... (listing object) }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error
- `401`: Unauthorized
- `404`: Find not found
- `500`: Server error

---

### PATCH /api/listings/[id]
Update a listing (e.g., mark sold, update metrics).

**Request Body:**
```json
{
  "status": "sold",
  "views": 100,
  "likes": 25
}
```

**Response:**
```json
{
  "data": { ... (updated listing object) }
}
```

---

### DELETE /api/listings/[id]
Delete a listing.

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

---

## Expenses

### GET /api/expenses
Fetch all expense records with optional filters.

**Query Parameters:**
- `category` (optional): `transport`, `supplies`, `storage`, `marketplace_fees`, `other`
- `start_date` (optional): Filter by date (ISO format)
- `end_date` (optional): Filter by date (ISO format)
- `limit` (optional, default 50)
- `offset` (optional, default 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "category": "transport",
      "amount_gbp": 15.50,
      "description": "Fuel for sourcing trip",
      "date": "2024-03-30",
      "find_id": null,
      "created_at": "2024-03-30T10:00:00Z",
      "updated_at": "2024-03-30T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST /api/expenses
Create a new expense record.

**Request Body:**
```json
{
  "category": "transport",
  "amount_gbp": 15.50,
  "description": "Fuel for sourcing trip",
  "date": "2024-03-30",
  "find_id": null
}
```

**Response:**
```json
{
  "data": { ... (expense object) }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error (amount must be positive)
- `401`: Unauthorized
- `500`: Server error

---

### PATCH /api/expenses/[id]
Update an expense record.

**Request Body:**
```json
{
  "amount_gbp": 18.00
}
```

---

### DELETE /api/expenses/[id]
Delete an expense record.

---

## Mileage

### GET /api/mileage
Fetch all mileage entries with optional date filters.

**Query Parameters:**
- `start_date` (optional): ISO date format
- `end_date` (optional): ISO date format
- `limit` (optional, default 50)
- `offset` (optional, default 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "date": "2024-03-30",
      "miles": 45.5,
      "purpose": "Sourcing trip to Oxfam stores",
      "from_location": "Home, Bristol",
      "to_location": "Oxfam Warehouse, Bath",
      "created_at": "2024-03-30T10:00:00Z",
      "updated_at": "2024-03-30T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST /api/mileage
Create a new mileage record.

**Request Body:**
```json
{
  "date": "2024-03-30",
  "miles": 45.5,
  "purpose": "Sourcing trip to Oxfam stores",
  "from_location": "Home, Bristol",
  "to_location": "Oxfam Warehouse, Bath"
}
```

**Response:**
```json
{
  "data": { ... (mileage object) }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error (miles must be positive)
- `401`: Unauthorized
- `500`: Server error

---

### PATCH /api/mileage/[id]
Update a mileage record.

**Request Body:**
```json
{
  "miles": 50.0
}
```

---

### DELETE /api/mileage/[id]
Delete a mileage record.

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "status": 400
}
```

**Common Error Messages:**
- `Unauthorized` (401): User not authenticated
- `Not found` (404): Resource doesn't exist or doesn't belong to user
- `Bad request` (400): Validation failed
- `Internal server error` (500): Server-side error

---

## Implementation Notes

### Authentication
- All routes use `getAuthUser()` from `@/services/supabase`
- Returns `null` if user not authenticated
- Routes return 401 if user is null

### Request Body Validation
- Uses Zod schemas from `@/lib/validation`
- `validateBody(schema, body)` returns `{ success, data }` or `{ success, error }`
- Returns 400 if validation fails

### Response Helpers
- `ApiResponseHelper.success(data)` → `{ data }` with 200 status
- `ApiResponseHelper.created(data)` → `{ data }` with 201 status
- `ApiResponseHelper.badRequest(message)` → `{ error }` with 400 status
- `ApiResponseHelper.unauthorized()` → `{ error }` with 401 status
- `ApiResponseHelper.notFound()` → `{ error }` with 404 status
- `ApiResponseHelper.internalError(message)` → `{ error }` with 500 status

### Pagination
- `limit`: Number of results per page (default 50)
- `offset`: How many results to skip
- `total`: Total number of matching results
- `pages`: Total number of pages

### Row-Level Security
- All queries filter by `user_id` to ensure users only see their own data
- Both `.eq('user_id', user.id)` on SELECT and ownership checks on UPDATE/DELETE

---

## Examples

### Create a find and list it on Vinted

**Step 1: Create find**
```bash
curl -X POST http://localhost:3000/api/finds \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vintage Levi\"s 501",
    "category": "Denim",
    "brand": "Levi\"s",
    "size": "32",
    "colour": "Blue",
    "condition": "excellent",
    "source_type": "charity_shop",
    "source_name": "Oxfam",
    "cost_gbp": 10.00,
    "asking_price_gbp": 45.00
  }'
```

**Step 2: Create listing**
```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "find_id": "< find id from step 1 >",
    "platform": "vinted",
    "status": "live"
  }'
```

### Track expenses for the month
```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "category": "transport",
    "amount_gbp": 25.00,
    "description": "Trip to car boot sale",
    "date": "2024-03-30"
  }'

# Get monthly summary
curl "http://localhost:3000/api/expenses?start_date=2024-03-01&end_date=2024-03-31"
```

---

## Rate Limiting

Currently no rate limiting. Production deployments should add:
- Per-user request limits
- IP-based throttling
- Exponential backoff for marketplace APIs

---

## Future Enhancements

1. **Batch Operations**
   - POST /api/listings/batch - Create multiple listings
   - PATCH /api/findings/batch - Bulk update finds

2. **Analytics**
   - GET /api/analytics/dashboard - Dashboard metrics
   - GET /api/analytics/monthly - Monthly breakdown

3. **Marketplace Sync**
   - POST /api/listings/[id]/sync - Sync with platform API
   - GET /api/listings/[id]/activity - View platform activity

4. **AI Features**
   - POST /api/finds/[id]/describe - Generate AI description
   - POST /api/finds/[id]/price - Get AI price suggestions
