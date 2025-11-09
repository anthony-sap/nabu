#!/usr/bin/env tsx

/**
 * Jest Test Runner Script
 *
 * This script handles the path escaping issue with Next.js route groups that contain parentheses
 * and dynamic routes that contain square brackets.
 * It converts paths like "app/(protected)/admin/[...id]/__tests__/page.test.tsx"
 * to "app/\\(protected\\)/admin/\\[...id\\]/__tests__/page.test.tsx" for Jest compatibility.
 *
 * Usage:
 * npm run test:file "app/(protected)/admin/[...id]/__tests__/page.test.tsx"
 * npm run test:file "app/(protected)/admin/layout.tsx" --coverage
 */
import { spawn } from "child_process";
import fs from "fs";

function escapePathForJest(filePath: string): string {
  // Escape parentheses and square brackets in the path for Jest compatibility with double backslashes
  // This handles Next.js route groups like (protected), (auth), etc.
  // and dynamic routes like [...id], [id], etc.
  return filePath
    .replace(/\(/g, "\\\\(")
    .replace(/\)/g, "\\\\)")
    .replace(/\[/g, "\\\\[")
    .replace(/\]/g, "\\\\]");
}

function computeTestAndOrgPaths(inputPath: string): {
  testFilePath: string;
  orgFilePath: string;
} {
  const isTestFile =
    inputPath.includes("__tests__") &&
    (inputPath.endsWith(".test.ts") || inputPath.endsWith(".test.tsx"));

  if (isTestFile) {
    // Input is already a test file
    const testFilePath = inputPath;
    // Compute original file path by removing __tests__ directory and .test extension
    const pathParts = inputPath.split("/");
    const testsIndex = pathParts.findIndex((part) => part === "__tests__");
    if (testsIndex === -1) {
      throw new Error("Could not find __tests__ directory in path");
    }

    // Remove __tests__ directory
    pathParts.splice(testsIndex, 1);

    // Remove .test extension and add original extension
    const fileName = pathParts[pathParts.length - 1];
    const fileNameWithoutTest = fileName.replace(/\.test\.(ts|tsx)$/, ".$1");
    pathParts[pathParts.length - 1] = fileNameWithoutTest;

    const orgFilePath = pathParts.join("/");
    return { testFilePath, orgFilePath };
  } else {
    // Input is original file, compute test file path
    const orgFilePath = inputPath;
    const pathParts = inputPath.split("/");
    const fileName = pathParts[pathParts.length - 1];

    // Add __tests__ directory before the filename
    pathParts.splice(-1, 0, "__tests__");

    // Add .test extension
    const fileNameWithTest = fileName.replace(/\.(ts|tsx)$/, ".test.$1");
    pathParts[pathParts.length - 1] = fileNameWithTest;

    const testFilePath = pathParts.join("/");
    return { testFilePath, orgFilePath };
  }
}

function runJestWithEscapedPath(
  filePath: string,
  withCoverage: boolean = false,
): void {
  const { testFilePath, orgFilePath } = computeTestAndOrgPaths(filePath);
  const escapedTestPath = escapePathForJest(testFilePath);
  const escapedOrgPath = escapePathForJest(orgFilePath);

  if (withCoverage) {
    console.log(`🔍 Original path: ${filePath}`);
    console.log(`📊 Test file path: ${testFilePath}`);
    console.log(`📄 Original file path: ${orgFilePath}`);
    console.log(`🔧 Escaped test path: ${escapedTestPath}`);
    console.log(`🔧 Escaped org path: ${escapedOrgPath}`);
    console.log(`🚀 Running Jest with coverage...\n`);

    // Spawn Jest process with coverage flags
    const jestCommand = `npx jest --no-watch "${escapedTestPath}" --coverage --collect-coverage-from="${escapedOrgPath}"`;
    const jestProcess = spawn(jestCommand, {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
    });

    jestProcess.on("close", (code) => {
      if (code === 0) {
        console.log("\n✅ Tests completed successfully with coverage!");
      } else {
        console.log(`\n❌ Tests failed with exit code ${code}`);
        process.exit(code || 1);
      }
    });

    jestProcess.on("error", (error) => {
      console.error("❌ Error running Jest:", error);
      process.exit(1);
    });
  } else {
    // Determine which path to use for Jest
    const isTestFile =
      filePath.includes("__tests__") &&
      (filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx"));
    let jestPath = filePath;

    if (!isTestFile) {
      // If it's not a test file, use the computed test file path
      jestPath = testFilePath;
      console.log(`📊 Using test file: ${testFilePath}`);
    }

    const escapedJestPath = escapePathForJest(jestPath);
    console.log(`🔍 Original path: ${filePath}`);
    console.log(`🔧 Escaped Jest path: ${escapedJestPath}`);
    console.log(`🚀 Running Jest with escaped path...\n`);

    // Spawn Jest process with the escaped path wrapped in double quotes
    const jestCommand = `npx jest "${escapedJestPath}"`;
    const jestProcess = spawn(jestCommand, {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
    });

    jestProcess.on("close", (code) => {
      if (code === 0) {
        console.log("\n✅ Tests completed successfully!");
      } else {
        console.log(`\n❌ Tests failed with exit code ${code}`);
        process.exit(code || 1);
      }
    });

    jestProcess.on("error", (error) => {
      console.error("❌ Error running Jest:", error);
      process.exit(1);
    });
  }
}

function main(): void {
  const args = process.argv.slice(2);

  // Handle npm argument passing - npm might pass arguments differently
  // Check if we have a file path argument
  let filePath: string | undefined;
  let withCoverage = false;

  // Look for the file path (first argument that doesn't start with -)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("-") && !filePath) {
      filePath = arg;
    } else if (arg === "--coverage") {
      withCoverage = true;
    }
  }

  if (!filePath) {
    console.log("❌ No test file path provided");
    console.log(
      'Usage: npm run test:file "app/(protected)/admin/[...id]/__tests__/page.test.tsx"',
    );
    console.log(
      'Usage: npm run test:file "app/(protected)/admin/layout.tsx" --coverage',
    );
    console.log(
      "Escaped path will be: app/\\(protected\\)/admin/\\[...id\\]/__tests__/page.test.tsx",
    );
    console.log("Debug - received args:", args);
    process.exit(1);
  }

  // Validate that the file exists
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    console.log("Please check the file path and try again.");
    process.exit(1);
  }

  if (withCoverage) {
    // For coverage, validate that either the test file or original file exists
    const { testFilePath, orgFilePath } = computeTestAndOrgPaths(filePath);
    const escapedTestPath = escapePathForJest(testFilePath);
    const escapedOrgPath = escapePathForJest(orgFilePath);

    const testFileExists = fs.existsSync(testFilePath);
    const orgFileExists = fs.existsSync(orgFilePath);

    if (!testFileExists && !orgFileExists) {
      console.log(`❌ Neither test file nor original file found:`);
      console.log(`   Test file: ${testFilePath}`);
      console.log(`   Original file: ${orgFilePath}`);
      console.log(`   Escaped test file: ${escapedTestPath}`);
      console.log(`   Escaped original file: ${escapedOrgPath}`);
      process.exit(1);
    }
  }

  runJestWithEscapedPath(filePath, withCoverage);
}

// Run the script
main();
