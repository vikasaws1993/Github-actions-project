# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native base rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**

# Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# Screens & Navigation
-keep class com.swmansion.rnscreens.** { *; }

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Document & Image Pickers
-keep class com.imagepicker.** { *; }
-keep class com.reactnativedocumentpicker.** { *; }

