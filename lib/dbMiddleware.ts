import "server-only";

import { Prisma } from "@prisma/client";

import { prismaClient } from "./db";
import { getSchemaModelMap } from "./dbSchemaMap";
import { getCurrentUser } from "./session";
import {
  hasWorkspaceIdField,
  getUserWorkspaceIds,
  verifyWorkspaceMembership,
  getUserTenantId,
} from "./workspace-helpers";

// extension for making models soft delete aware
export const softDeleteAware = Prisma.defineExtension({
  name: "softDeleteAware",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Skip soft-delete behaviour for pure log / raw tables and job queues
        if (model == "AuditLog" || model == "WhatsAppMessage" || model == "WhatsAppLinkToken" || model == "WebhookProcessingJob" || model == "EmbeddingJob" || model == "TagSuggestionJob") {
          return query(args);
        }

        const user = await getCurrentUser();

        if (operation === "delete") {
          return prismaClient[model].update({
            where: args.where ?? {},
            data: {
              deletedAt: new Date(),
              updatedBy: user?.id,
            },
          });
        } else if (operation === "deleteMany") {
          return prismaClient[model].updateMany({
            where: args.where ?? {},
            data: {
              deletedAt: new Date(),
              updatedBy: user?.id,
            },
          });
        } else if (
          ["findUnique", "findFirst", "findMany", "count", "groupBy"].includes(
            operation,
          )
        ) {
          // Check for special flag to include deleted records (for trash page)
          const includeDeleted = args["includeDeleted"];
          
          if (includeDeleted) {
            console.log(`[Middleware] includeDeleted flag detected for ${model}.${operation}`);
          }
          
          if (!args["where"]) {
            args["where"] = {};
          }
          
          // Only apply deletedAt filter if not explicitly requesting deleted items
          if (!includeDeleted && !(args["where"] && args["where"]["deletedAt"])) {
            args["where"]["deletedAt"] = null;
          } else if (includeDeleted) {
            console.log(`[Middleware] Skipping deletedAt filter for ${model}.${operation}`);
          }
          
          // Remove the includeDeleted flag from args so it doesn't cause issues
          delete args["includeDeleted"];
        }

        return query(args);
      },
    },
  },
});

// extension for making models tenant aware
export const tenantAware = Prisma.defineExtension({
  name: "tenantAware",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (model == "Tenant") {
          return query(args);
        }
        if (model == "AuditLog") {
          return query(args);
        }
        if (model == "WhatsAppLinkToken") {
          return query(args);
        }
        // Skip tenant filtering for workspace-related models (handled by workspaceAware)
        if (model == "Workspace" || model == "WorkspaceMembership" || model == "WorkspaceInvite") {
          return query(args);
        }

        const user = await getCurrentUser();
        const sessionTenantId = user?.tenantId;
        
        // Check if this model has workspaceId field
        const isWorkspaceAware = hasWorkspaceIdField(model);
        
        if (
          ["findUnique", "findFirst", "findMany", "count"].includes(operation)
        ) {
          if (!args["where"]) {
            args["where"] = {};
          }
          
          // For workspace-aware models, skip tenantId filter if workspaceId is present
          // (workspace items have tenantId: null, personal items will be filtered by tenantId)
          if (isWorkspaceAware) {
            const hasWorkspaceId = args["where"]["workspaceId"] !== undefined;
            if (!hasWorkspaceId) {
              // No workspaceId specified - tenantAware will filter by tenantId for personal items
              // workspaceAware will add workspace items separately
              args["where"]["tenantId"] = sessionTenantId;
            }
            // If workspaceId is present, skip tenantId filter (workspaceAware will handle it)
          } else {
            // Non-workspace-aware models: always filter by tenantId
            args["where"]["tenantId"] = sessionTenantId;
          }
        } else if (
          operation === "create" ||
          operation === "createMany" ||
          operation === "createManyAndReturn" ||
          operation === "update" ||
          operation === "updateMany"
        ) {
          // Check if tenantId is explicitly provided in the data
          const dataObject = args?.data ?? {};
          const explicitTenantId = Array.isArray(dataObject) 
            ? (dataObject[0] as any)?.tenantId 
            : (dataObject as any)?.tenantId;
          const explicitWorkspaceId = Array.isArray(dataObject)
            ? (dataObject[0] as any)?.workspaceId
            : (dataObject as any)?.workspaceId;
          
          // For workspace-aware models: if workspaceId is set, tenantId should be null
          // Otherwise use explicit tenantId or session tenantId
          let tenantId: string | null;
          if (isWorkspaceAware && explicitWorkspaceId !== undefined && explicitWorkspaceId !== null) {
            tenantId = null; // Workspace items have tenantId: null
          } else {
            tenantId = explicitTenantId !== undefined ? explicitTenantId : sessionTenantId;
          }
          
          args["data"] = updateArgsDataWithSchema({
            modelName: model,
            operation,
            dataObject: args?.data ?? {},
            updateData: {
              tenantId,
            },
            updateDataRelational: {
              Tenant: tenantId ? {
                connect: {
                  id: tenantId,
                },
              } : undefined,
            },
            createData: {
              tenantId,
            },
            createDataRelational: {
              Tenant: tenantId ? {
                connect: {
                  id: tenantId,
                },
              } : undefined,
            },
          });
        }
        return query(args);
      },
    },
  },
});

// extension for making models workspace aware
export const workspaceAware = Prisma.defineExtension({
  name: "workspaceAware",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Only apply to models with workspaceId field
        if (!hasWorkspaceIdField(model)) {
          return query(args);
        }

        const user = await getCurrentUser();
        if (!user?.id) {
          return query(args);
        }

        const userId = user.id;
        
        if (
          ["findUnique", "findFirst", "findMany", "count"].includes(operation)
        ) {
          if (!args["where"]) {
            args["where"] = {};
          }

          const where = args["where"];
          const explicitWorkspaceId = where["workspaceId"];
          const hasExplicitWorkspaceId = "workspaceId" in where;

          // If workspaceId is explicitly set to null, only return personal items
          if (hasExplicitWorkspaceId && explicitWorkspaceId === null) {
            // Explicitly filtering for personal items only - don't add workspace items
            // The where clause already has workspaceId: null, which is what we want
            // No need to modify where clause further
          } else if (hasExplicitWorkspaceId && explicitWorkspaceId !== null) {
            // Verify user has access to this workspace
            await verifyWorkspaceMembership(userId, explicitWorkspaceId);
            // Filter by this specific workspace (tenantId is already null for workspace items)
            // No need to modify where clause further
          } else {
            // No explicit workspaceId - need to include both personal and workspace items
            const workspaceIds = await getUserWorkspaceIds(userId);
            const tenantId = await getUserTenantId(userId);

            // tenantAware has already set tenantId in where clause
            // We need to modify it to allow both personal (tenantId match) and workspace items (tenantId: null)
            
            // Get the tenantId that tenantAware set
            const tenantIdFromWhere = where["tenantId"];
            
            // Remove tenantId and workspaceId from where (we'll handle them in OR)
            const existingConditions = { ...where };
            delete existingConditions["workspaceId"];
            delete existingConditions["tenantId"];

            // Build OR condition: personal items OR workspace items
            const workspaceOrConditions: any[] = [];

            // Personal items: workspaceId is null AND tenantId matches
            workspaceOrConditions.push({
              workspaceId: null,
              tenantId: tenantIdFromWhere !== undefined ? tenantIdFromWhere : tenantId,
            });

            // Workspace items: workspaceId in user's accessible workspaces (tenantId is null)
            if (workspaceIds.length > 0) {
              workspaceOrConditions.push({
                workspaceId: { in: workspaceIds },
              });
            }

            // If there are existing OR conditions, combine them with workspace OR using AND
            if (where["OR"]) {
              // Wrap existing OR and workspace OR in AND
              args["where"] = {
                ...existingConditions,
                AND: [
                  { OR: where["OR"] },
                  { OR: workspaceOrConditions },
                ],
              };
            } else {
              // No existing OR - just add workspace OR
              args["where"] = {
                ...existingConditions,
                OR: workspaceOrConditions,
              };
            }
          }
        } else if (
          operation === "create" ||
          operation === "createMany" ||
          operation === "createManyAndReturn" ||
          operation === "update" ||
          operation === "updateMany"
        ) {
          const dataObject = args?.data ?? {};
          const explicitWorkspaceId = Array.isArray(dataObject)
            ? (dataObject[0] as any)?.workspaceId
            : (dataObject as any)?.workspaceId;

          // If workspaceId is set, verify membership and ensure tenantId is null
          if (explicitWorkspaceId !== undefined && explicitWorkspaceId !== null) {
            await verifyWorkspaceMembership(userId, explicitWorkspaceId);
            
            // Ensure tenantId is null for workspace items
            if (Array.isArray(dataObject)) {
              dataObject.forEach((item: any) => {
                if (item) {
                  item.tenantId = null;
                  item.userId = userId; // Ensure userId matches authenticated user
                }
              });
            } else {
              (dataObject as any).tenantId = null;
              (dataObject as any).userId = userId; // Ensure userId matches authenticated user
            }
          } else {
            // Personal item - ensure userId matches
            if (Array.isArray(dataObject)) {
              dataObject.forEach((item: any) => {
                if (item) {
                  item.userId = userId;
                }
              });
            } else {
              (dataObject as any).userId = userId;
            }
          }
        }

        return query(args);
      },
    },
  },
});

// extension for adding createdBy and updatedBy fields to models
export const createdByUpdatedBy = Prisma.defineExtension({
  name: "createByUpdatedBy",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const modelData: any = { ...((args as any)?.data as any) };
        if (modelData["CreatedBy"] === undefined) {
          const user = await getCurrentUser();

          if (model === "AuditLog" && operation === "create") {
            if (!args["data"]) {
              args["data"] = {} as any;
            }
            args["data"]["createdBy"] = user?.id;
          } else if (
            operation === "create" ||
            operation === "createMany" ||
            operation === "createManyAndReturn" ||
            operation === "update" ||
            operation === "updateMany"
          ) {
            args["data"] = updateArgsDataWithSchema({
              modelName: model,
              operation,
              dataObject: args?.data ?? {},
              updateData: {
                updatedBy: user?.id,
              },
              updateDataRelational: {
                updatedBy: user?.id,
              },
              createData: {
                createdBy: user?.id,
                updatedBy: user?.id,
              },
              createDataRelational: {
                createdBy: user?.id,
                updatedBy: user?.id,
              },
            });
          }
        }
        return query(args);
      },
    },
  },
});

// extension for storing audit log
export const storingAuditLog = Prisma.defineExtension({
  name: "storingAuditLog",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const user = await getCurrentUser();
        if (operation === "create") {
          if (model === "AuditLog") {
            return query(args);
          } else if (model === "Tenant") {
            const tenant = await query(args);
            const currentData: any = args["data"] ?? {};
            await prismaClient.auditLog.create({
              data: {
                entityType: model,
                entityId: tenant.id ?? "",
                action: operation,
                eventStatus: "success",
                newData: currentData,
                createdBy: user?.id,
                tenantId: tenant.id,
              },
            });
            return Promise.resolve(tenant);
          }
          const item = await query(args);
          const currentData: any = args["data"] ?? {};
          await prismaClient.auditLog.create({
            data: {
              entityType: model,
              entityId: (item as any)?.id ?? "",
              action: operation,
              eventStatus: "success",
              newData: currentData,
              createdBy: user?.id,
              tenantId: user?.tenantId,
            },
          });
          return Promise.resolve(item);
        } else if (operation === "update" || operation === "delete") {
          const currentData: any = args["data"] ?? {};
          await prismaClient.auditLog.create({
            data: {
              entityType: model,
              entityId: (args?.where as any)?.id ?? "",
              action: operation,
              eventStatus: "success",
              newData: currentData,
              createdBy: user?.id,
              tenantId: user?.tenantId,
            },
          });
        } else if (operation === "updateMany") {
          const currentData: any = args["data"] ?? {};
          const whereCondition = args?.where ?? {};
          await prismaClient.auditLog.create({
            data: {
              entityType: model,
              entityId: "bulk_update",
              action: operation,
              eventStatus: "success",
              newData: {
                ...currentData,
                whereCondition,
              },
              createdBy: user?.id,
              tenantId: user?.tenantId,
            },
          });
        }
        return query(args);
      },
    },
  },
});

type UpdateArgsDataWithSchemaProps = {
  modelName: string;
  operation: string;
  dataObject: any;
  updateData: any;
  updateDataRelational: any;
  createData: any;
  createDataRelational: any;
};

const updateArgsDataWithSchema = ({
  modelName,
  operation,
  dataObject,
  updateData,
  updateDataRelational,
  createData,
  createDataRelational,
}: UpdateArgsDataWithSchemaProps): any => {
  if (Array.isArray(dataObject)) {
    return dataObject?.map((itemData: any) =>
      updateArgsDataWithSchema({
        modelName,
        operation,
        dataObject: itemData ?? {},
        updateData,
        updateDataRelational,
        createData,
        createDataRelational,
      }),
    );
  } else if (dataObject?.connect || dataObject?.set) {
    return dataObject;
  } else if (dataObject?.create) {
    dataObject.create = updateArgsDataWithSchema({
      modelName,
      operation: "create",
      dataObject: dataObject?.create ?? {},
      updateData,
      updateDataRelational,
      createData,
      createDataRelational,
    });
  } else if (dataObject?.update && Array.isArray(dataObject?.update)) {
    dataObject.update = dataObject.update.map((item: any) => {
      return {
        data: updateArgsDataWithSchema({
          modelName,
          operation: "update",
          dataObject: item.data ?? {},
          updateData,
          updateDataRelational,
          createData,
          createDataRelational,
        }),
        where: item.where,
      };
    });
  } else if (dataObject?.update) {
    dataObject.update = updateArgsDataWithSchema({
      modelName,
      operation: "update",
      dataObject: dataObject?.update ?? {},
      updateData,
      updateDataRelational,
      createData,
      createDataRelational,
    });
  } else if (dataObject?.createMany) {
    dataObject["createMany"]["data"] = dataObject?.createMany?.data?.map(
      (itemData: any) =>
        updateArgsDataWithSchema({
          modelName,
          operation: "createMany",
          dataObject: itemData ?? {},
          updateData,
          updateDataRelational,
          createData,
          createDataRelational,
        }),
    );
  } else if (dataObject?.deleteMany) {
    dataObject["deleteMany"]["data"] = dataObject?.deleteMany?.data?.map(
      (itemData: any) =>
        updateArgsDataWithSchema({
          modelName,
          operation,
          dataObject: itemData ?? {},
          updateData,
          updateDataRelational,
          createData,
          createDataRelational,
        }),
    );
  } else {
    const modelMap = getSchemaModelMap(modelName);
    let isUsingRelationship = false;
    const dataKeys = Object.keys(dataObject);
    for (let i = 0; i < dataKeys.length; i++) {
      const key = dataKeys[i];
      if (modelMap?.objects[key]) {
        isUsingRelationship = true;
        dataObject[key] = updateArgsDataWithSchema({
          modelName: modelMap?.objects[key],
          operation: `child_${operation}`,
          dataObject: dataObject[key],
          updateData,
          updateDataRelational,
          createData,
          createDataRelational,
        });
      }
    }
    if (operation === "create" || operation === "createMany") {
      if (isUsingRelationship) {
        dataObject = {
          ...dataObject,
          ...createDataRelational,
        };
      } else {
        dataObject = {
          ...dataObject,
          ...createData,
        };
      }
    } else {
      if (isUsingRelationship) {
        dataObject = {
          ...dataObject,
          ...updateDataRelational,
        };
      } else {
        dataObject = {
          ...dataObject,
          ...updateData,
        };
      }
    }
  }
  return dataObject;
};
