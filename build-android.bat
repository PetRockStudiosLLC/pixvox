@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: Set environment variables (override with .env file or system env vars)
set "ANDROID_HOME=%ANDROID_HOME%"
if "!ANDROID_HOME!"=="" set "ANDROID_HOME=%~dp0android-home"

set "NDK_HOME=%NDK_HOME%"
if "!NDK_HOME!"=="" set "NDK_HOME=!ANDROID_HOME!\ndk\30.0.14904198"

set "ANDROID_USER_HOME=%ANDROID_USER_HOME%"
if "!ANDROID_USER_HOME!"=="" set "ANDROID_USER_HOME=!ANDROID_HOME!"

set "GRADLE_USER_HOME=%GRADLE_USER_HOME%"
if "!GRADLE_USER_HOME!"=="" set "GRADLE_USER_HOME=G:\gradle-home"

set "TEMP=%TEMP%"
if "!TEMP!"=="" set "TEMP=G:\temp"

set "TMP=%TMP%"
if "!TMP!"=="" set "TMP=G:\temp"

set "PATH=C:\Users\Scotty\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin;%PATH%"

:: Parse command line arguments
set "ACTION=%~1"
if "!ACTION!"=="" set "ACTION=full"

echo ============================================
echo   PixVox Android Build System
echo ============================================
echo.
echo   Action: !ACTION!
echo   ANDROID_HOME: !ANDROID_HOME!
echo.

if /i "!ACTION!"=="full" goto fullBuild
if /i "!ACTION!"=="build" goto buildOnly
if /i "!ACTION!"=="sign" goto signOnly
if /i "!ACTION!"=="install" goto installOnly
if /i "!ACTION!"=="log" goto logOnly
if /i "!ACTION!"=="clean" goto cleanBuild

echo Unknown action: !ACTION!
echo.
echo Usage: build-android.bat [full^|build^|sign^|install^|log^|clean]
echo.
echo   full    - Build, sign, and install (default)
echo   build   - Build the APK only
echo   sign    - Sign existing unsigned APK
echo   install - Install signed APK to device
echo   log     - Capture logs after app launch
echo   clean   - Stop gradle daemons and clean build artifacts
pause
goto :eof

:fullBuild
echo [1/4] Stopping Gradle daemons...
cd /d "src-tauri\gen\android"
call gradlew.bat --stop
cd /d "%~dp0"
if errorlevel 1 goto error

echo.
echo [2/4] Building APK...
call npm run tauri:android:build
if errorlevel 1 goto error

echo.
echo [3/4] Signing APK...
call npm run tauri:android:sign
if errorlevel 1 goto error

echo.
echo [4/4] Installing to device...
call npm run tauri:android:deploy
if errorlevel 1 goto error

echo.
echo ============================================
echo   Build complete!
echo ============================================
goto :end

:buildOnly
echo Building APK...
call npm run tauri:android:build
if errorlevel 1 goto error
goto :end

:signOnly
echo Signing APK...
call npm run tauri:android:sign
if errorlevel 1 goto error
goto :end

:installOnly
echo Installing APK...
call npm run tauri:android:deploy
if errorlevel 1 goto error
goto :end

:logOnly
echo Capturing logs...
call npm run tauri:android:log
if errorlevel 1 goto error
goto :end

:cleanBuild
echo Cleaning build artifacts...
cd /d "src-tauri\gen\android"
call gradlew.bat clean
call gradlew.bat --stop
cd /d "%~dp0"
echo Clean complete.
goto :end

:error
echo.
echo ============================================
echo   ERROR: Build failed!
echo ============================================
echo.
echo Check the error message above for details.
echo Common issues:
echo   - Check that ANDROID_HOME is set correctly
echo   - Run "adb devices" to verify device connection
echo   - Check that the keystore password is correct
echo.
pause
exit /b 1

:end
echo.
echo Done.
pause
exit /b 0
