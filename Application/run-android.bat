@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"

echo Launching ArogyaMitra on Android...
call npm run android

