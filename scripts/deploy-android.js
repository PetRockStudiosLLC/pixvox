import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

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

const ANDROID_HOME = process.env.ANDROID_HOME || join(root, 'android-home');
const BUILD_OUTPUT_DIR = process.env.BUILD_OUTPUT_DIR || join(root, 'build');
const ADB_DEVICE = process.env.ADB_DEVICE;

// Find ADB in ANDROID_HOME
function findAdb() {
  const platformToolsDir = join(ANDROID_HOME, 'platform-tools');
  const adbBat = join(platformToolsDir, 'adb.bat');
  const adbExe = join(platformToolsDir, 'adb.exe');
  
  if (existsSync(adbBat)) return adbBat;
  if (existsSync(adbExe)) return adbExe;
  
  // Fallback: try to find in parent directories
  const parentPlatformTools = join(ANDROID_HOME, '..', 'platform-tools');
  const parentAdbBat = join(parentPlatformTools, 'adb.bat');
  if (existsSync(parentAdbBat)) return parentAdbBat;
  
  return 'adb'; // Hope it's in PATH
}

const adb = findAdb();

// Get version from package.json
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version || '1.0.0';
const appName = pkg.name || 'pixvox';

function findSignedApk() {
  if (!existsSync(BUILD_OUTPUT_DIR)) return null;
  
  const files = readdirSync(BUILD_OUTPUT_DIR);
  const pattern = new RegExp(`${appName}-v.*-signed\\.apk$`);
  const apkFiles = files.filter(f => pattern.test(f)).sort();
  
  return apkFiles.length > 0 ? join(BUILD_OUTPUT_DIR, apkFiles[apkFiles.length - 1]) : null;
}

const apkPath = findSignedApk();

if (!apkPath) {
  console.error('Error: Could not find signed APK in', BUILD_OUTPUT_DIR);
  console.error('Run "npm run tauri:android:sign" first, or place your signed APK in the build directory.');
  console.log('');
  console.log('Available files:');
  if (existsSync(BUILD_OUTPUT_DIR)) {
    readdirSync(BUILD_OUTPUT_DIR).forEach(f => console.log('  -', f));
  }
  process.exit(1);
}

console.log('Installing APK:', apkPath);

try {
  const adbCmd = ADB_DEVICE 
    ? `"${adb}" -s "${ADB_DEVICE}" install -r "${apkPath}"`
    : `"${adb}" install -r "${apkPath}"`;
  
  execSync(adbCmd, { stdio: 'inherit' });
  
  console.log('');
  console.log('Starting app...');
  const launchCmd = ADB_DEVICE
    ? `"${adb}" -s "${ADB_DEVICE}" shell am start -n com.pixvox/.MainActivity`
    : `"${adb}" shell am start -n com.pixvox/.MainActivity`;
  
  execSync(launchCmd, { stdio: 'inherit' });
  
  console.log('');
  console.log('App launched! Use "npm run tauri:android:log" to view logs.');
  
} catch (error) {
  console.error('Error deploying APK:', error.message);
  process.exit(1);
}
