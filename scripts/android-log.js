import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
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

function runCmd(cmd) {
  console.log(cmd);
  return execSync(cmd, { stdio: 'inherit' });
}

console.log('=== PixVox Android Log Capture ===');
console.log('');

try {
  // Clear existing logs
  const adbPrefix = ADB_DEVICE ? `-s "${ADB_DEVICE}"` : '';
  runCmd(`"${adb}" ${adbPrefix} logcat -c`);
  
  // Launch the app
  console.log('Starting app...');
  runCmd(`"${adb}" ${adbPrefix} shell am start -n com.pixvox/.MainActivity`);
  
  // Wait for app to initialize
  console.log('Waiting 5 seconds for app to initialize...');
  execSync('ping -n 6 127.0.0.1 >nul', { stdio: 'inherit' });
  
  // Capture logs
  console.log('Capturing logs...');
  const logPath = join(root, 'logcat-crash.txt');
  execSync(`"${adb}" ${adbPrefix} logcat -d > "${logPath}"`, { stdio: 'inherit' });
  
  console.log('');
  console.log('Logs saved to:', logPath);
  console.log('');
  
  // Show filtered logs for the app
  console.log('=== Recent PixVox Logs ===');
  try {
    const logs = execSync(`"${adb}" ${adbPrefix} logcat -d *:W com.pixvox:* *:E`, { encoding: 'utf8' });
    if (logs.trim()) {
      console.log(logs);
    } else {
      console.log('(No warnings or errors found)');
    }
  } catch {
    console.log('(Could not filter logs, showing all)');
  }
  
} catch (error) {
  console.error('Error capturing logs:', error.message);
  process.exit(1);
}
