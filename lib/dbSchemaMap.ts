import { Prisma } from "@prisma/client";

export type SchemaMapModel = {
  name: string;
  objects: {
    [key: string]: string; // ie: {field.name}: {field.type}
  };
  enums: {
    [key: string]: string; // ie: {field.name}: {field.type}
  };
  scalars: {
    [key: string]: string; // ie: {field.name}: {field.type}
  };
  relationalMaps: {
    [key: string]: string; // ie: {RelationshipFieldName}: {relationshipIdFieldName}
  };
  childRelations: {
    [key: string]: string; // ie: {childRelationFieldName}: [{childModelRow1}, {childModelRow2}, {childModelRow3}]
  };
};

export type SchemaMap = {
  models: {
    [key: string]: SchemaMapModel;
  };
  enums: {
    [key: string]: string[]; // ie: {enum.Name}: [{enum.val1}, {enum.val2}, {enum.val3}]
  };
};

export const schemaMap: SchemaMap = {
  models: {},
  enums: {},
};

export const getSchemaModelMap = (
  modelName: string,
): SchemaMapModel | undefined => {
  if (!schemaMap["models"][modelName]) {
    mapFullSchema();
  }
  return schemaMap["models"][modelName];
};

export const getSchemaEnumValues = (enumName: string): string[] => {
  if (!schemaMap["enums"][enumName]) {
    mapFullSchema();
  }
  return schemaMap["enums"][enumName] ?? [];
};

const mapFullSchema = () => {
  const dataModel = Prisma.dmmf?.datamodel ?? {};
  // map all the existing db models
  if (dataModel["models"] && Array.isArray(dataModel["models"])) {
    dataModel["models"].forEach((model: any) => {
      const modelName = model["name"];
      const currentModel: SchemaMapModel = {
        name: modelName,
        objects: {},
        enums: {},
        scalars: {},
        relationalMaps: {},
        childRelations: {},
      };
      model["fields"].forEach((field: any) => {
        const fieldName = field["name"];
        const fieldKind = field["kind"];
        if (fieldKind === "scalar") {
          currentModel["scalars"][fieldName] = field["type"];
        } else if (fieldKind === "enum") {
          currentModel["scalars"][fieldName] = field["type"];
          currentModel["enums"][fieldName] = field["type"];
        } else if (fieldKind === "object") {
          currentModel["objects"][fieldName] = field["type"];
          if (
            Array.isArray(field["relationFromFields"]) &&
            field["relationFromFields"].length
          ) {
            currentModel["relationalMaps"][fieldName] =
              field["relationFromFields"][0];
          } else {
            currentModel["childRelations"][fieldName] = field["type"];
          }
        }
      });
      schemaMap["models"][modelName] = currentModel;
    });
  }
  // map all existing enums with possible values
  if (dataModel["enums"] && Array.isArray(dataModel["enums"])) {
    dataModel["enums"].forEach((enumType: any) => {
      const enumName = enumType["name"];
      schemaMap["enums"][enumName] = [];
      if (enumType["values"] && Array.isArray(enumType["values"])) {
        enumType["values"].forEach((enumValue: any) => {
          if (enumValue["name"]) {
            schemaMap["enums"][enumName].push(enumValue["name"]);
          }
        });
      }
    });
  }
  return schemaMap;
};
