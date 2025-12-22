# Database Audit Standards

## Overview

All database models in Nabu must include comprehensive audit fields to ensure full traceability of data changes, support multi-tenancy, and enable soft deletes.

## Required Audit Fields

Every model in `prisma/schema.prisma` must include the following fields:

### Multi-tenancy
- **`tenantId`** - String (nullable for some shared models)
  - Links record to a specific tenant for data isolation
  - Indexed for query performance

### Audit Timestamps
- **`createdAt`** - DateTime @default(now())
  - Automatically set when record is created
  - Never modified after creation

- **`updatedAt`** - DateTime @updatedAt
  - Automatically updated by Prisma on any change
  - Tracks last modification time

### Audit Users
- **`createdBy`** - String (nullable)
  - User ID of the creator
  - Set once at creation

- **`updatedBy`** - String (nullable)
  - User ID of last modifier
  - Updated on every change

### Soft Delete Support
- **`deletedAt`** - DateTime? (optional)
  - Null = active record
  - Set = soft deleted record
  - Enables data recovery and audit trail

- **`deletedBy`** - String? (optional)
  - User ID who performed soft delete
  - Used for accountability

## Automatic Handling

These fields are automatically managed by Prisma middleware located in `lib/dbMiddleware.ts`:

- `createdBy` and `updatedBy` are automatically populated from the authenticated user context
- `createdAt` and `updatedAt` are handled by Prisma decorators
- `deletedAt` is set when performing soft deletes
- Queries automatically exclude soft-deleted records unless explicitly included

## Example Model Structure

```prisma
model ImageAttachment {
  id          String   @id @default(cuid())
  noteId      String
  note        Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  
  filename    String
  storagePath String
  url         String
  fileSize    Int
  mimeType    String
  
  // Multi-tenancy
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  // Audit timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Audit users
  createdBy   String
  updatedBy   String
  
  // Soft delete
  deletedAt   DateTime?
  deletedBy   String?
  
  @@index([noteId])
  @@index([tenantId])
}
```

## Best Practices

1. **Always include all audit fields** - Even if not immediately used, they provide valuable historical data
2. **Use soft deletes by default** - Hard deletes should be rare and only for compliance reasons
3. **Index tenantId** - Critical for multi-tenant query performance
4. **Let middleware handle population** - Don't manually set audit fields in application code
5. **Query considerations** - Remember to filter by `deletedAt IS NULL` in custom queries

## Migration Checklist

When adding a new model:
- [ ] Include all required audit fields
- [ ] Add appropriate indexes
- [ ] Add relation to Tenant model
- [ ] Test that middleware populates fields correctly
- [ ] Verify soft delete behavior

