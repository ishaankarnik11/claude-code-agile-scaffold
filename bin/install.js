#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────
// setup-workflow installer
// Copies the skill into the target project's
// .claude/skills/setup-workflow/ directory.
// ──────────────────────────────────────────────

const SKILL_DIR_NAME = 'setup-workflow';
const TARGET_REL = path.join('.claude', 'skills', SKILL_DIR_NAME);

// Resolve target project directory
const targetProject = process.argv[2]
  ? path.resolve(process.argv[2])
  : process.cwd();

const targetDir = path.join(targetProject, TARGET_REL);
const packageRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(packageRoot, 'skill');
const howToUseSource = path.join(packageRoot, 'HOW-TO-USE.md');

// ── Helpers ──────────────────────────────────

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function countFiles(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

// ── Pre-checks ───────────────────────────────

if (!fs.existsSync(sourceDir)) {
  console.error('Error: Skill source files not found in package. This is a packaging bug.');
  process.exit(1);
}

if (!fs.existsSync(targetProject)) {
  console.error(`Error: Target directory does not exist: ${targetProject}`);
  process.exit(1);
}

// Check for existing installation
if (fs.existsSync(targetDir)) {
  const existingFiles = countFiles(targetDir);
  console.log(`\n  Existing installation detected at ${TARGET_REL} (${existingFiles} files).`);
  console.log('  Overwriting with latest version...\n');
}

// ── Install ──────────────────────────────────

try {
  // Copy skill files
  copyDirRecursive(sourceDir, targetDir);
  const installedCount = countFiles(targetDir);

  // Copy HOW-TO-USE.md to project root (if not already there)
  const howToUseDest = path.join(targetProject, 'HOW-TO-USE.md');
  if (fs.existsSync(howToUseSource)) {
    fs.copyFileSync(howToUseSource, howToUseDest);
  }

  // ── Success output ───────────────────────
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║         setup-workflow installed                 ║
  ╚══════════════════════════════════════════════════╝

  Installed ${installedCount} files to:
    ${TARGET_REL}/

  Quick start:
    1. Open Claude Code in your project directory
    2. Run:  /setup-workflow
    3. Follow the prompts

  The skill will:
    - Score your FRD/PRD/BRD for implementation readiness
    - Detect your tech stack automatically
    - Generate agents, commands, hooks, standards, and a full backlog

  Read HOW-TO-USE.md for the complete guide.
`);

} catch (err) {
  console.error(`\n  Error during installation: ${err.message}\n`);
  process.exit(1);
}
