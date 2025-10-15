# tRPC-OpenAPI Implementation Summary

## Overview
Implemented `trpc-openapi` package to generate OpenAPI documentation from tRPC procedures with OpenAPI metadata.

## Changes Made

### 1. Package Dependencies
- Added `trpc-openapi@^2.0.0` to both `apps/api` and `packages/trpc`
- Updated `packages/trpc/src/trpc.ts` to import `OpenApiMeta` from `trpc-openapi`

### 2. OpenAPI Document Generation
**File**: `packages/trpc/src/openapi.ts`
- Created lazy OpenAPI document generator with error handling
- Implements fallback mechanism if generation fails due to nested router issues
- Exports `getOpenApiDocument()` function for on-demand generation

### 3. Swagger UI Integration
**File**: `apps/api/src/routes/swagger.ts`
- Serves OpenAPI JSON at `/api/docs/openapi.json`
- Serves Swagger UI at `/api/docs`
- Uses lazy document generation to avoid blocking server startup

### 4. Server Configuration
**File**: `apps/api/src/index.ts`
- ~~Added REST API handler using `createOpenApiHttpHandler`~~ (temporarily disabled)
- Updated server startup logs to reflect available endpoints
- REST API endpoints at `/api/rest/*` are disabled due to nested router compatibility

### 5. Schema Updates
**File**: `packages/trpc/src/routers/auth.ts`
- Converted output schemas from function-based to direct Zod schemas
- Removed `.default()` from input schemas to improve OpenAPI compatibility
- Updated mutation implementations to handle default values

## Available Endpoints

### Current (Working)
✅ **tRPC API**: `http://localhost:3003/api/trpc`
✅ **Swagger UI**: `http://localhost:3003/api/docs`
✅ **OpenAPI JSON**: `http://localhost:3003/api/docs/openapi.json`
✅ **WebSocket**: `ws://localhost:3003/ws`

### Temporarily Disabled
⚠️ **REST API**: `http://localhost:3003/api/rest/*`
- Disabled due to `trpc-openapi` v2.0.0 nested router compatibility issues
- The library throws "Unknown procedure type" when encountering nested routers

## Known Issues

### 1. Nested Router Compatibility
**Problem**: `trpc-openapi` v2.0.0 doesn't properly handle nested routers in `appRouter`

**Error**:
```
error: Unknown procedure type
  at getProcedureType (node_modules/trpc-openapi/dist/utils/procedure.js:26:11)
```

**Workaround**: 
- OpenAPI document generation is wrapped in try-catch
- Fallback minimal document is returned on error
- REST API handler is commented out

**Solution Options**:
1. Flatten router structure (not recommended - breaks organization)
2. Wait for library update with better nested router support
3. Use alternative package like `@asteasolutions/zod-to-openapi`
4. Manually create OpenAPI spec for REST endpoints

### 2. OpenAPI Metadata Coverage
Currently, OpenAPI metadata (`.meta({ openapi: {...} })`) is configured for:
- ✅ auth router procedures
- ✅ users router procedures  
- ✅ contacts router procedures
- ✅ groups router procedures
- ✅ notifications router procedures
- ❌ plans router (needs metadata)
- ❌ tenants router (needs metadata)
- ❌ whatsapp router (needs metadata)
- ❌ Other routers

## Testing

### Server Startup
```bash
cd apps/api
bun run dev
```

**Expected Output**:
```
🚀 Server running on http://localhost:3003
📡 WebSocket available at ws://localhost:3003/ws
📄 tRPC API available at http://localhost:3003/api/trpc
📚 API Documentation (Swagger UI) at http://localhost:3003/api/docs
📋 OpenAPI JSON at http://localhost:3003/api/docs/openapi.json
```

### Verify Endpoints
1. **Health Check**: `GET http://localhost:3003/health`
2. **Swagger UI**: Open `http://localhost:3003/api/docs` in browser
3. **OpenAPI JSON**: `GET http://localhost:3003/api/docs/openapi.json`
4. **tRPC**: Use tRPC client or Postman with POST to `/api/trpc/<router>.<procedure>`

## Next Steps

### To Enable REST API:
1. **Option A**: Use a different OpenAPI generator
   - Consider `@asteasolutions/zod-to-openapi` for better control
   - Manually define OpenAPI paths

2. **Option B**: Flatten routers (not recommended)
   - Merge all procedures into a single router
   - Loses organizational structure

3. **Option C**: Wait for library fix
   - Monitor `trpc-openapi` for updates
   - Check if newer versions support nested routers

### To Improve Documentation:
1. Add OpenAPI metadata to remaining routers
2. Add response examples
3. Add request/response descriptions
4. Configure authentication schemes in OpenAPI doc

## File Structure
```
apps/api/
  src/
    routes/
      swagger.ts           # Swagger UI + OpenAPI JSON endpoints
    index.ts              # Server setup (REST handler commented out)

packages/trpc/
  src/
    openapi.ts            # OpenAPI document generator
    trpc.ts               # tRPC instance with OpenApiMeta type
    routers/
      auth.ts             # Auth procedures with OpenAPI metadata
      users.ts            # User procedures with OpenAPI metadata
      ...                 # Other routers
```

## References
- [trpc-openapi GitHub](https://github.com/jlalmes/trpc-openapi)
- [tRPC Documentation](https://trpc.io)
- [OpenAPI Specification](https://swagger.io/specification/)
