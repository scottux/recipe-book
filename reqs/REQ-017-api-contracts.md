# REQ-017: API Response Standardization & HATEOAS

**Status**: PLANNED  
**Priority**: HIGH  
**Version**: V2.1.4  
**Created**: February 15, 2026  
**Owner**: Backend Team

---

## Overview

Standardize API responses across all endpoints with a consistent envelope structure and implement HATEOAS (Hypermedia as the Engine of Application State) support for better REST API discoverability and client-side navigation.

---

## Business Value

- **Developer Experience**: Consistent API structure reduces learning curve
- **API Discoverability**: HATEOAS links enable self-documenting APIs
- **Error Handling**: Standardized error format improves debugging
- **Client Flexibility**: Clients can navigate API without hardcoded URLs
- **Future-Proofing**: Easier to extend and version API

---

## User Stories

### As an API Consumer
- I want all API responses to follow a consistent structure so I can write reusable response handlers
- I want error responses to have a predictable format so I can handle errors consistently
- I want pagination metadata in every paginated response so I know what data is available
- I want HATEOAS links so I can discover related resources without reading documentation

### As a Developer
- I want standardized response envelopes so I can create generic API utilities
- I want validation errors to be clearly structured so I can display them to users
- I want response timestamps so I can detect stale data
- I want self-describing APIs so new developers can explore endpoints easily

---

## Current State Analysis

### Response Format Inconsistencies

**Example 1: Recipe List (Paginated)**
```json
{
  "success": true,
  "count": 15,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecipes": 15,
    "limit": 50,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

**Example 2: Single Recipe**
```json
{
  "_id": "...",
  "title": "Recipe Title",
  "ingredients": [...],
  ...
}
```

**Example 3: Error Response**
```json
{
  "error": "Recipe not found"
}
```

### Problems Identified

1. **Inconsistent Envelope**: Some responses have `success` field, others don't
2. **No HATEOAS**: No hypermedia links for resource navigation
3. **Pagination Naming**: Different keys (`totalRecipes` vs generic `total`)
4. **No Timestamps**: No way to know when data was generated
5. **Error Format**: Inconsistent error structure across endpoints

---

## Functional Requirements

### FR-1: Standard Response Envelope

**All API responses must follow this structure:**

```typescript
interface APIResponse<T> {
  success: boolean;           // Always present
  data: T;                    // Response data (object or array)
  meta?: {                    // Optional metadata
    timestamp: string;        // ISO-8601 timestamp
    pagination?: PaginationMeta;
    count?: number;           // Total count for collections
  };
  links?: {                   // HATEOAS links
    self: string;             // Current resource URL
    [key: string]: string;    // Related resource URLs
  };
  errors?: ValidationError[]; // Only when success=false
}
```

**Examples:**

**Single Resource:**
```json
{
  "success": true,
  "data": {
    "_id": "123",
    "title": "Pasta Recipe",
    "ingredients": [...]
  },
  "meta": {
    "timestamp": "2026-02-15T18:00:00.000Z"
  },
  "links": {
    "self": "/api/recipes/123",
    "collection": "/api/recipes",
    "owner": "/api/users/456",
    "update": "/api/recipes/123",
    "delete": "/api/recipes/123"
  }
}
```

**Collection (Paginated):**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "timestamp": "2026-02-15T18:00:00.000Z",
    "count": 100,
    "pagination": {
      "page": 1,
      "perPage": 20,
      "totalPages": 5,
      "total": 100,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "links": {
    "self": "/api/recipes?page=1",
    "first": "/api/recipes?page=1",
    "last": "/api/recipes?page=5",
    "next": "/api/recipes?page=2",
    "prev": null
  }
}
```

### FR-2: Standard Error Response

**All error responses must follow this structure:**

```typescript
interface ErrorResponse {
  success: false;
  data: null;
  errors: Array<{
    code: string;          // Error code (e.g., "VALIDATION_ERROR")
    message: string;       // Human-readable message
    field?: string;        // Field name for validation errors
    details?: any;         // Additional context
  }>;
  meta: {
    timestamp: string;
    requestId?: string;    // For error tracking
  };
}
```

**Examples:**

**Validation Error:**
```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Ingredient is required",
      "field": "ingredient"
    },
    {
      "code": "VALIDATION_ERROR",
      "message": "Quantity must be a non-negative number",
      "field": "quantity"
    }
  ],
  "meta": {
    "timestamp": "2026-02-15T18:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

**Not Found Error:**
```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "NOT_FOUND",
      "message": "Recipe not found",
      "details": {
        "resource": "Recipe",
        "id": "123"
      }
    }
  ],
  "meta": {
    "timestamp": "2026-02-15T18:00:00.000Z"
  }
}
```

### FR-3: HATEOAS Link Generation

**Link Types:**

1. **Navigation Links**
   - `self`: Current resource
   - `collection`: Parent collection
   - `first`, `last`, `next`, `prev`: Pagination

2. **Action Links**
   - `create`: Create new resource
   - `update`: Update resource
   - `delete`: Delete resource

3. **Related Resource Links**
   - `owner`: Resource owner
   - `recipes`: Related recipes
   - `collections`: Related collections
   - etc.

**Link Generation Rules:**
- Links must be absolute URLs (include protocol and domain)
- Links must respect user permissions (don't show links user can't access)
- Links must include query parameters when relevant
- Unavailable actions should be omitted (not null)

### FR-4: Pagination Standardization

**All paginated endpoints must return:**

```typescript
interface PaginationMeta {
  page: number;        // Current page (1-based)
  perPage: number;     // Items per page
  total: number;       // Total items
  totalPages: number;  // Total pages
  hasNext: boolean;    // Has next page
  hasPrev: boolean;    // Has previous page
}
```

**Pagination Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field
- `order`: Sort order (asc/desc)

### FR-5: Timestamp Metadata

**All responses must include:**
- `meta.timestamp`: ISO-8601 formatted timestamp of response generation
- Used for cache validation and data freshness checks

---

## Technical Requirements

### TR-1: Response Envelope Middleware

Create Express middleware to wrap all successful responses:

```javascript
// middleware/responseEnvelope.js
export const envelopeResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    // If already enveloped, pass through
    if (data && typeof data.success === 'boolean') {
      return originalJson(data);
    }
    
    // Envelope the response
    const envelope = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString()
      }
    };
    
    // Add HATEOAS links
    if (req.generateLinks) {
      envelope.links = req.generateLinks(data);
    }
    
    return originalJson(envelope);
  };
  
  next();
};
```

### TR-2: Error Envelope Middleware

Standardize error responses:

```javascript
// middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  const errorResponse = {
    success: false,
    data: null,
    errors: [{
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An error occurred',
      field: err.field,
      details: err.details
    }],
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  };
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    errorResponse.errors = Object.values(err.errors).map(e => ({
      code: 'VALIDATION_ERROR',
      message: e.message,
      field: e.path
    }));
  }
  
  res.status(statusCode).json(errorResponse);
};
```

### TR-3: HATEOAS Link Builder

Utility for generating HATEOAS links:

```javascript
// utils/linkBuilder.js
export class LinkBuilder {
  constructor(baseUrl, req) {
    this.baseUrl = baseUrl;
    this.req = req;
  }
  
  forResource(resource, id) {
    return {
      self: `${this.baseUrl}/api/${resource}/${id}`,
      collection: `${this.baseUrl}/api/${resource}`,
      update: `${this.baseUrl}/api/${resource}/${id}`,
      delete: `${this.baseUrl}/api/${resource}/${id}`
    };
  }
  
  forCollection(resource, pagination) {
    const links = {
      self: this.buildUrl(resource, { page: pagination.page }),
      first: this.buildUrl(resource, { page: 1 }),
      last: this.buildUrl(resource, { page: pagination.totalPages })
    };
    
    if (pagination.hasNext) {
      links.next = this.buildUrl(resource, { page: pagination.page + 1 });
    }
    
    if (pagination.hasPrev) {
      links.prev = this.buildUrl(resource, { page: pagination.page - 1 });
    }
    
    return links;
  }
  
  buildUrl(resource, params) {
    const url = new URL(`${this.baseUrl}/api/${resource}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }
}
```

### TR-4: Backward Compatibility

**Migration Strategy:**

1. **Phase 1**: Add envelope to new endpoints (V2.1.4)
2. **Phase 2**: Add envelope to existing endpoints with `?envelope=true` flag (V2.1.5)
3. **Phase 3**: Make envelope default, support `?legacy=true` for old format (V2.2)
4. **Phase 4**: Remove legacy support (V3.0)

**API Version Header:**
```
X-API-Version: 2.1.4
```

---

## UI/UX Requirements

### Frontend API Service Updates

```javascript
// services/api.js
class APIClient {
  async request(endpoint, options = {}) {
    const response = await fetch(endpoint, options);
    const envelope = await response.json();
    
    if (!envelope.success) {
      throw new APIError(envelope.errors);
    }
    
    // Return unwrapped data for easier consumption
    return {
      data: envelope.data,
      meta: envelope.meta,
      links: envelope.links
    };
  }
  
  // Pagination helper
  async getPaginated(endpoint, page = 1) {
    const result = await this.request(`${endpoint}?page=${page}`);
    
    return {
      items: result.data,
      pagination: result.meta.pagination,
      links: result.links
    };
  }
}
```

---

## Acceptance Criteria

### AC-1: Response Structure
- [ ] All successful responses include `success: true`
- [ ] All successful responses include `data` field
- [ ] All responses include `meta.timestamp`
- [ ] All error responses include `success: false`
- [ ] All error responses include structured `errors` array

### AC-2: HATEOAS Links
- [ ] Resource responses include `links.self`
- [ ] Resource responses include `links.collection`
- [ ] Paginated responses include pagination links
- [ ] Links respect user permissions
- [ ] Links use absolute URLs

### AC-3: Pagination
- [ ] All paginated endpoints use standard pagination metadata
- [ ] Pagination supports `page` and `limit` query params
- [ ] Pagination includes `hasNext` and `hasPrev` flags
- [ ] Pagination limits enforced (max 100 items per page)

### AC-4: Error Handling
- [ ] Validation errors include field names
- [ ] Error codes are consistent and documented
- [ ] Error messages are human-readable
- [ ] Stack traces excluded from production errors

### AC-5: Documentation
- [ ] API documentation updated with new response format
- [ ] Error code reference created
- [ ] Migration guide for frontend developers
- [ ] Examples for all response types

---

## Testing Requirements

### Unit Tests
- Response envelope middleware
- Error handling middleware
- Link builder utility
- Pagination helper functions

### Integration Tests
- All endpoints return enveloped responses
- Error responses follow standard format
- HATEOAS links are valid and accessible
- Pagination works correctly

### API Contract Tests
```javascript
describe('API Contract - Recipe Endpoints', () => {
  it('should return standard envelope for GET /api/recipes', async () => {
    const response = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.body).toMatchObject({
      success: true,
      data: expect.any(Array),
      meta: {
        timestamp: expect.any(String),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          perPage: expect.any(Number),
          total: expect.any(Number)
        })
      },
      links: expect.objectContaining({
        self: expect.any(String),
        first: expect.any(String),
        last: expect.any(String)
      })
    });
  });
  
  it('should return standard error for 404', async () => {
    const response = await request(app)
      .get('/api/recipes/invalid-id')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      data: null,
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String)
        })
      ]),
      meta: {
        timestamp: expect.any(String)
      }
    });
  });
});
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Create response envelope middleware
- [ ] Create error handling middleware
- [ ] Create link builder utility
- [ ] Create pagination helper
- [ ] Write unit tests

### Phase 2: Apply to Core Endpoints (Week 1-2)
- [ ] Apply to `/api/recipes` endpoints
- [ ] Apply to `/api/auth` endpoints
- [ ] Apply to `/api/collections` endpoints
- [ ] Apply to `/api/meal-plans` endpoints
- [ ] Apply to `/api/shopping-lists` endpoints

### Phase 3: Testing & Documentation (Week 2)
- [ ] Write API contract tests
- [ ] Update API documentation
- [ ] Create error code reference
- [ ] Write migration guide
- [ ] Update frontend API service

### Phase 4: Frontend Migration (Week 2-3)
- [ ] Update API client to handle envelopes
- [ ] Update all API calls
- [ ] Test all user flows
- [ ] Fix any issues

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | User must be authenticated |
| `FORBIDDEN` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service issue |

---

## API Versioning Strategy

### Current: V2.1.4
- Introduce envelope with backward compatibility flag
- Header: `X-API-Version: 2.1.4`

### Future: V2.2.0
- Envelope becomes default
- Legacy format available via `?legacy=true`

### Future: V3.0.0
- Envelope only, remove legacy support
- Breaking change, require frontend updates

---

## Performance Considerations

- **Response Size**: Envelope adds ~100 bytes per response
- **Link Generation**: Minimal overhead (< 1ms)
- **Caching**: Include `ETag` based on `meta.timestamp`
- **Compression**: Enable gzip for envelope responses

---

## Security Considerations

- **Link Permissions**: Only include links user can access
- **Error Details**: Sanitize error details in production
- **Rate Limiting**: Include rate limit info in headers
- **CORS**: Configure for new envelope structure

---

## Success Metrics

- **Consistency**: 100% of endpoints use standard envelope
- **Error Handling**: 0% unstructured error responses
- **HATEOAS Coverage**: 80%+ of responses include links
- **Client Errors**: 50% reduction in API misuse errors
- **Developer Onboarding**: 30% faster for new developers

---

## Dependencies

- Express.js middleware support
- Frontend API client updates
- API documentation tools
- Testing framework updates

---

## Future Enhancements

- GraphQL alternative endpoint
- Real-time updates via WebSockets with same envelope
- OpenAPI (Swagger) spec generation
- API versioning via URL path (`/api/v2/...`)
- Rate limit information in response headers
- Request tracing with correlation IDs

---

## References

- [REST API Best Practices](https://restfulapi.net/)
- [HATEOAS Specification](https://en.wikipedia.org/wiki/HATEOAS)
- [JSON API Specification](https://jsonapi.org/)
- [RFC 7807 - Problem Details](https://tools.ietf.org/html/rfc7807)

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-15 | 1.0 | Initial requirement document | Backend Team |

---

**Document Version**: 1.0  
**Last Review**: February 15, 2026  
**Next Review**: After V2.1.4 implementation  
**Status**: Ready for Implementation