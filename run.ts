#!/usr/bin/env tsx

// run.ts
import { resolve } from "path";
import { pathToFileURL } from "url";

// Patch import for "server-only"
const Module = require("module");
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {}; // 👈 mock as empty module
  }
  return originalRequire.apply(this, arguments);
};

// Dynamically import the target script
const target = process.argv[2];
if (!target) {
  console.error("❌ You must provide a script to run.");
  process.exit(1);
}

const fullPath = resolve(process.cwd(), target);
const url = pathToFileURL(fullPath).href;

// Use dynamic import so ESM/TS works fine
import(url).catch((err) => {
  console.error("❌ Error running script:", err);
  process.exit(1);
});
