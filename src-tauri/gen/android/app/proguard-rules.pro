# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# PixVox ProGuard Rules
-keep class com.pixvox.** { *; }
-keep class app.tauri.** { *; }
-keep class com.tauri.** { *; }

# Keep JNI methods
-keepclasseswithmembernames class * {
    native <methods>;
}