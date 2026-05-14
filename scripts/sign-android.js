import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const androidDir = join(root, 'src-tauri', 'gen', 'android');
const outputDir = join(root, 'build');

// Simple .env loader
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = valueParts.join('=');
      }
    }
  }
}

loadEnvFile(join(root, '.env'));

// Configuration with defaults matching build-android.bat
const ANDROID_HOME = process.env.ANDROID_HOME || join(root, 'android-home');
const KEYSTORE_PATH = process.env.KEYSTORE_PATH || join(root, 'android-key.keystore');
const KEYSTORE_ALIAS = process.env.KEYSTORE_ALIAS || 'pixvox';
const KEYSTORE_PASSWORD = process.env.KEYSTORE_PASSWORD || 'pixvox123';
const KEY_PASSWORD = process.env.KEY_PASSWORD || 'pixvox123';
const BUILD_OUTPUT_DIR = process.env.BUILD_OUTPUT_DIR || outputDir;

// Find apksigner using dir search
function findFile(dir, name) {
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(fullPath, name);
      if (found) return found;
    } else if (entry.name === name) {
      return fullPath;
    }
  }
  return null;
}

const apksignerPath = findFile(ANDROID_HOME, 'apksigner.bat');
if (!apksignerPath) {
  // Try without .bat extension (Linux/Mac)
  const apksignerNoExt = findFile(ANDROID_HOME, 'apksigner');
  if (apksignerNoExt) {
    console.error('Error: Found apksigner without .bat extension. Are you on Windows?');
  } else {
    console.error('Error: Could not find apksigner. Check ANDROID_HOME:', ANDROID_HOME);
  }
  process.exit(1);
}

const apksigner = apksignerPath;

// Find the unsigned APK
function findUnsignedApk() {
  const outputsDir = join(androidDir, 'app', 'build', 'outputs', 'apk');
  
  if (!existsSync(outputsDir)) {
    return null;
  }

  // Try universal APK first
  const universalDir = join(outputsDir, 'universal', 'release');
  const universalFile = join(universalDir, 'app-universal-release-unsigned.apk');
  if (existsSync(universalFile)) {
    return universalFile;
  }

  // Try split APKs
  const splitDir = join(outputsDir, 'split', 'release');
  if (existsSync(splitDir)) {
    const apkFiles = [];
    const entries = readdirSync(splitDir);
    for (const entry of entries) {
      if (entry.endsWith('.apk')) {
        apkFiles.push(join(splitDir, entry));
      }
    }
    if (apkFiles.length > 0) {
      return { files: apkFiles, isSplit: true };
    }
  }

  // Fallback: search all outputs directories recursively
  const allApks = [];
  function searchApks(dir) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        searchApks(fullPath);
      } else if (entry.name.match(/app-.*-release-unsigned\.apk$/)) {
        allApks.push(fullPath);
      }
    }
  }
  searchApks(outputsDir);
  
  if (allApks.length > 0) {
    return allApks[0];
  }

  return null;
}

// Get version from package.json
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version || '1.0.0';
const appName = pkg.name || 'pixvox';

// Ensure output directory exists
mkdirSync(BUILD_OUTPUT_DIR, { recursive: true });

const unsignedApk = findUnsignedApk();

if (!unsignedApk) {
  console.error('Error: Could not find unsigned APK. Make sure you ran "tauri android build" first.');
  console.error('Searched in:', androidDir);
  process.exit(1);
}

const signedApkPath = join(BUILD_OUTPUT_DIR, `${appName}-v${version}-signed.apk`);

console.log('Signing APK...');
console.log('  Unsigned:', unsignedApk);
console.log('  Signed:', signedApkPath);
console.log('  Keystore:', KEYSTORE_PATH);

function basename(path) {
  return path.split(/[/\\]/).pop();
}

function runApkSign(inputApk, outputFile) {
  // --out must come BEFORE the input APK file
  const cmd = `${apksigner} sign --ks "${KEYSTORE_PATH}" --ks-pass pass:${KEYSTORE_PASSWORD} --key-pass pass:${KEY_PASSWORD} --out "${outputFile}" "${inputApk}"`;
  console.log('Running:', cmd);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  if (typeof unsignedApk === 'string') {
    // Single universal APK
    runApkSign(unsignedApk, signedApkPath);
  } else if (unsignedApk.isSplit) {
    // Handle split APKs - sign each one
    for (const apk of unsignedApk.files) {
      const baseName = apk.replace(/\.apk$/, '');
      const signedName = baseName + '-signed.apk';
      const signedPath = join(BUILD_OUTPUT_DIR, signedName);
      
      console.log(`  Signing: ${basename(apk)}`);
      runApkSign(apk, signedPath);
    }
    console.log('All split APKs signed.');
    process.exit(0);
  }

  console.log('');
  console.log('Signed APK:', signedApkPath);
  console.log('');
  
  // Verify the signed APK
  console.log('Verifying signed APK...');
  const verifyCmd = `${apksigner} verify --verbose "${signedApkPath}"`;
  console.log('Running:', verifyCmd);
  execSync(verifyCmd, { stdio: 'inherit' });
  console.log('Verification passed!');
  
} catch (error) {
  console.error('Error signing APK:', error.message);
  process.exit(1);
}
