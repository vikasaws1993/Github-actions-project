const path = require('path');
const os = require('os');
const fs = require('fs');

// Ensure Android SDK and Java environment are always available to the CLI
const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const defaultAndroidHome = path.join(localAppData, 'Android', 'Sdk');
const defaultJavaHome = 'C:\\Program Files\\Android\\Android Studio\\jbr';

if (!process.env.ANDROID_HOME && fs.existsSync(defaultAndroidHome)) {
  process.env.ANDROID_HOME = defaultAndroidHome;
}
if (!process.env.JAVA_HOME && fs.existsSync(defaultJavaHome)) {
  process.env.JAVA_HOME = defaultJavaHome;
}

const pathsToAdd = [
  process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin') : null,
  process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools') : null,
  process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'emulator') : null,
].filter(Boolean);

const currentPath = process.env.PATH || '';
process.env.PATH = `${pathsToAdd.join(';')};${currentPath}`;

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/'],
};
