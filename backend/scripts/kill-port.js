#!/usr/bin/env node

import { execSync } from 'child_process';
import os from 'os';

const PORT = process.env.PORT || 3001;

console.log(`🔍 Looking for processes on port ${PORT}...`);

function killPort(port) {
  const platform = os.platform();
  
  try {
    if (platform === 'win32') {
      // Windows: Use netstat and taskkill
      console.log('🪟 Windows detected - using netstat and taskkill');
      
      // Find the PID using netstat
      let netstatOutput;
      try {
        netstatOutput = execSync(`netstat -ano`, { encoding: 'utf8' });
        // Filter for our specific port
        const lines = netstatOutput.split('\n');
        const portLines = lines.filter(line => line.includes(`:${port} `));
        netstatOutput = portLines.join('\n');
      } catch (error) {
        console.log(`✅ No processes found on port ${port}`);
        return;
      }
      
      if (!netstatOutput.trim()) {
        console.log(`✅ No processes found on port ${port}`);
        return;
      }
      
      // Extract PIDs from netstat output
      
      const lines = netstatOutput.trim().split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && !isNaN(parseInt(pid))) {
            pids.add(pid);
            console.log(`📋 Found PID: ${pid}`);
          }
        }
      });
      
      if (pids.size === 0) {
        console.log(`✅ No processes found on port ${port}`);
        return;
      }
      
      // Kill each PID
      pids.forEach(pid => {
        try {
          console.log(`🔪 Killing process ${pid}...`);
          const result = execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf8', shell: 'cmd.exe' });
          console.log(`✅ Successfully killed process ${pid}`);
          console.log(`📝 Result: ${result.trim()}`);
        } catch (error) {
          console.log(`⚠️  Could not kill process ${pid}:`);
          console.log(`📝 Error: ${error.message}`);
          
          // Try without /F flag as backup
          try {
            console.log(`🔄 Trying without force flag...`);
            const result = execSync(`taskkill /PID ${pid}`, { encoding: 'utf8', shell: 'cmd.exe' });
            console.log(`✅ Successfully killed process ${pid} (without force)`);
            console.log(`📝 Result: ${result.trim()}`);
          } catch (error2) {
            console.log(`❌ Still failed: ${error2.message}`);
          }
        }
      });
      
    } else {
      // Unix-like systems: Use lsof and kill
      console.log('🐧 Unix-like system detected - using lsof and kill');
      
      const lsofOutput = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      
      if (!lsofOutput.trim()) {
        console.log(`✅ No processes found on port ${port}`);
        return;
      }
      
      const pids = lsofOutput.trim().split('\n').filter(pid => pid);
      
      pids.forEach(pid => {
        try {
          console.log(`🔪 Killing process ${pid}...`);
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          console.log(`✅ Successfully killed process ${pid}`);
        } catch (error) {
          console.log(`⚠️  Could not kill process ${pid} (might already be dead)`);
        }
      });
    }
    
    console.log(`🎉 Port ${port} should now be free!`);
    
  } catch (error) {
    if (error.status === 1) {
      // Command failed but that's expected if no processes found
      console.log(`✅ No processes found on port ${port}`);
    } else {
      console.error(`❌ Error killing processes on port ${port}:`, error.message);
      process.exit(1);
    }
  }
}

// Main execution
killPort(PORT);