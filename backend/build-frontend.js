#!/usr/bin/env node
/**
 * build-frontend.js
 * Cross-platform build script: builds the frontend and copies dist to backend/dist.
 * Replaces Linux-only shell commands so it works on Render (Linux) and Windows alike.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = __dirname;
const frontendDir = path.join(backendDir, '..', 'frontend');
const backendDist = path.join(backendDir, 'dist');
const frontendDist = path.join(frontendDir, 'dist');

function run(cmd, cwd) {
  console.log(`\n▶  ${cmd}  (in ${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // 1. Install frontend dependencies
  console.log('\n📦 Installing frontend dependencies...');
  run('npm install', frontendDir);

  // 2. Build the frontend
  console.log('\n🔨 Building frontend...');
  run('npm run build', frontendDir);

  // 3. Verify the build output exists
  if (!fs.existsSync(frontendDist)) {
    throw new Error(`Frontend build failed: ${frontendDist} does not exist`);
  }

  // 4. Clear backend/dist and copy fresh build
  console.log('\n📂 Copying frontend build to backend/dist...');
  if (fs.existsSync(backendDist)) {
    fs.rmSync(backendDist, { recursive: true, force: true });
  }
  copyDirRecursive(frontendDist, backendDist);

  // 5. Verify copy succeeded
  const indexFile = path.join(backendDist, 'index.html');
  if (!fs.existsSync(indexFile)) {
    throw new Error(`Copy failed: index.html not found in ${backendDist}`);
  }

  console.log('\n✅ Frontend built and copied to backend/dist successfully!');
  console.log(`   Files in dist: ${fs.readdirSync(backendDist).join(', ')}`);

} catch (err) {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
}
