@echo off
cd "G:\1_CURRENT\PixelArtMaker"
set ANDROID_HOME=G:\1_CURRENT\PixelArtMaker\android-home
set NDK_HOME=G:\1_CURRENT\PixelArtMaker\android-home\ndk\30.0.14904198
set ANDROID_USER_HOME=G:\1_CURRENT\PixelArtMaker\android-home
set GRADLE_USER_HOME=G:\gradle-home
set TEMP=G:\temp
set TMP=G:\temp

echo Stopping Gradle daemons...
cd src-tauri\gen\android
call gradlew.bat --stop
cd "G:\1_CURRENT\PixelArtMaker"

echo Building Android APK... > build-log.txt 2>&1
npx tauri android build >> build-log.txt 2>&1

echo Signing APK... >> build-log.txt 2>&1
set APKSIGNER=G:\1_CURRENT\PixelArtMaker\android-home\build-tools\35.0.0\apksigner.bat
set KEYSTORE=G:\1_CURRENT\PixelArtMaker\android-key.keystore
set KEY_STORE_PASS=pixvox123
set KEY_PASS=pixvox123

%APKSIGNER% sign --ks "%KEYSTORE%" --ks-pass pass:%KEY_STORE_PASS% --key-pass pass:%KEY_PASS% --out "G:\1_CURRENT\PixelArtMaker\build\PixVox-v1.0.0-signed.apk" "G:\1_CURRENT\PixelArtMaker\src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk" >> build-log.txt 2>&1

echo. >> build-log.txt
echo Installing APK... >> build-log.txt 2>&1
adb install -r "G:\1_CURRENT\PixelArtMaker\build\PixVox-v1.0.0-signed.apk" >> build-log.txt 2>&1

echo. >> build-log.txt
echo Running app and capturing logs... >> build-log.txt 2>&1
adb logcat -c
adb shell am start -n com.pixvox/.MainActivity
timeout /t 5 /nobreak
adb logcat -d > logcat-crash.txt 2>&1

echo. >> build-log.txt
echo Signed APK: build\PixVox-v1.0.0-signed.apk >> build-log.txt
echo Crash logs saved to logcat-crash.txt >> build-log.txt
type build-log.txt
pause
