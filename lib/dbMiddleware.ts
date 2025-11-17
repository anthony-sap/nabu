import "server-only";

import { Prisma } from "@prisma/client";

import { prismaClient } from "./db";
import { getSchemaModelMap } from "./dbSchemaMap";
import { getCurrentUser } from "./session";

// extension for making models soft delete aware
export const softDeleteAware = Prisma.defineExtension({
  name: "softDeleteAware",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Skip soft-delete behaviour for pure log / raw tables
        if (model == "AuditLog" || model == "WhatsAppMessage" || model == "WhatsAppLinkToken") {
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
          if (!args["where"]) {
            args["where"] = {};
          }
          if (!(args["where"] && args["where"]["deletedAt"])) {
            args["where"]["deletedAt"] = null;
          }
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

        const user = await getCurrentUser();

        const sessionTenantId = user?.tenantId;
        
        if (
          ["findUnique", "findFirst", "findMany", "count"].includes(operation)
        ) {
          if (!args["where"]) {
            args["where"] = {};
          }
          args["where"]["tenantId"] = sessionTenantId;
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
            ? dataObject[0]?.tenantId 
            : dataObject?.tenantId;
          
          // Use explicit tenantId if provided (e.g., from webhooks), otherwise use session tenantId
          const tenantId = explicitTenantId !== undefined ? explicitTenantId : sessionTenantId;
          
          args["data"] = updateArgsDataWithSchema({
            modelName: model,
            operation,
            dataObject: args?.data ?? {},
            updateData: {
              tenantId,
            },
            updateDataRelational: {
              Tenant: {
                connect: {
                  id: tenantId,
                },
              },
            },
            createData: {
              tenantId,
            },
            createDataRelational: {
              Tenant: {
                connect: {
                  id: tenantId,
                },
              },
            },
          });
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
