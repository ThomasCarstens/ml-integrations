#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Chatterbox TTS Development Environment...\n');

// Function to spawn a process with colored output
function spawnProcess(command, args, options = {}) {
  const proc = spawn(command, args, {
    stdio: 'pipe',
    shell: true,
    ...options
  });

  return proc;
}

// Function to add colored prefix to output
function addPrefix(prefix, color) {
  return (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${color}[${prefix}]${'\x1b[0m'} ${line}`);
    });
  };
}

// Colors for different services
const colors = {
  nextjs: '\x1b[36m',    // Cyan
  firebase: '\x1b[33m',   // Yellow
  expo: '\x1b[32m',       // Green
  error: '\x1b[31m'       // Red
};

async function startServices() {
  try {
    console.log('📦 Starting Next.js Server...');
    const nextjsProcess = spawnProcess('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '../chatterbox-server')
    });
    
    nextjsProcess.stdout.on('data', addPrefix('Next.js', colors.nextjs));
    nextjsProcess.stderr.on('data', addPrefix('Next.js Error', colors.error));

    // Wait a bit for Next.js to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔥 Starting Firebase Functions Emulator...');
    const firebaseProcess = spawnProcess('firebase', ['emulators:start', '--only', 'functions'], {
      cwd: path.join(__dirname, '..')
    });
    
    firebaseProcess.stdout.on('data', addPrefix('Firebase', colors.firebase));
    firebaseProcess.stderr.on('data', addPrefix('Firebase Error', colors.error));

    // Wait a bit for Firebase to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📱 Starting Expo Development Server...');
    const expoProcess = spawnProcess('npx', ['expo', 'start'], {
      cwd: path.join(__dirname, '..')
    });
    
    expoProcess.stdout.on('data', addPrefix('Expo', colors.expo));
    expoProcess.stderr.on('data', addPrefix('Expo Error', colors.error));

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down all services...');
      nextjsProcess.kill();
      firebaseProcess.kill();
      expoProcess.kill();
      process.exit(0);
    });

    console.log('\n✅ All services started successfully!');
    console.log('📋 Service URLs:');
    console.log('   • Next.js Server: http://localhost:3001');
    console.log('   • Firebase Functions: http://localhost:5001');
    console.log('   • Expo DevTools: Check terminal output above');
    console.log('\n💡 Press Ctrl+C to stop all services\n');

  } catch (error) {
    console.error('❌ Error starting services:', error);
    process.exit(1);
  }
}

// Check if required dependencies are installed
function checkDependencies() {
  const requiredCommands = ['npm', 'firebase', 'npx'];
  
  for (const cmd of requiredCommands) {
    try {
      require('child_process').execSync(`which ${cmd}`, { stdio: 'ignore' });
    } catch (error) {
      console.error(`❌ Required command '${cmd}' not found. Please install it first.`);
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  checkDependencies();
  startServices();
}

module.exports = { startServices, checkDependencies };
