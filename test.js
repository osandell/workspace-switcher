// detailed-test.js - Enhanced port diagnostics
const net = require('net');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

console.log('=== Enhanced Port Diagnostics ===\n');

// Test different IP addresses
const hostsToTest = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
const portsToTest = [57321, 3000, 8080, 9000]; // Mix of potentially blocked and free ports

async function testPortOnHost(port, host) {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        const timeout = setTimeout(() => {
            server.close();
            resolve({ success: false, error: 'TIMEOUT' });
        }, 2000);
        
        server.listen(port, host, () => {
            clearTimeout(timeout);
            server.close(() => {
                resolve({ success: true, error: null });
            });
        });
        
        server.on('error', (err) => {
            clearTimeout(timeout);
            resolve({ success: false, error: err.code || err.message });
        });
    });
}

async function getSystemInfo() {
    try {
        console.log('=== System Information ===');
        
        // Get Windows version
        const { stdout: winver } = await execAsync('ver');
        console.log('Windows Version:', winver.trim());
        
        // Check if Hyper-V is enabled
        try {
            const { stdout: hyperv } = await execAsync('powershell -Command "Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All"');
            if (hyperv.includes('Enabled')) {
                console.log('⚠️  Hyper-V is enabled (this can reserve port ranges)');
            }
        } catch (e) {
            console.log('Could not check Hyper-V status');
        }
        
        // Check Docker
        try {
            const { stdout: docker } = await execAsync('docker --version');
            console.log('Docker installed:', docker.trim());
        } catch (e) {
            console.log('Docker: Not installed or not in PATH');
        }
        
        console.log('');
    } catch (error) {
        console.log('Could not get system info:', error.message);
    }
}

async function testPortRange(startPort, endPort, host = 'localhost') {
    console.log(`\n=== Testing port range ${startPort}-${endPort} on ${host} ===`);
    
    let freeCount = 0;
    let usedCount = 0;
    let errorCount = 0;
    
    for (let port = startPort; port <= endPort; port++) {
        const result = await testPortOnHost(port, host);
        
        if (result.success) {
            freeCount++;
            if (freeCount === 1) {
                console.log(`✅ Port ${port} is FREE`);
            }
        } else {
            if (result.error === 'EADDRINUSE') {
                usedCount++;
            } else {
                errorCount++;
            }
            
            if (usedCount + errorCount <= 5) { // Show first few errors
                console.log(`❌ Port ${port}: ${result.error}`);
            }
        }
    }
    
    console.log(`Summary: ${freeCount} free, ${usedCount} in use, ${errorCount} errors`);
    
    if (usedCount > 0 && freeCount === 0) {
        console.log('⚠️  ALL ports in this range appear blocked!');
    }
}

async function runNetstatComparison() {
    console.log('\n=== Netstat Comparison ===');
    
    try {
        // Check what netstat actually shows for our range
        const { stdout } = await execAsync('netstat -an | findstr ":573"');
        if (stdout.trim()) {
            console.log('Netstat shows these connections in 573xx range:');
            console.log(stdout);
        } else {
            console.log('❌ Netstat shows NO connections in 573xx range');
        }
    } catch (error) {
        console.log('❌ Netstat shows NO connections in 573xx range');
    }
    
    // Test if we can connect TO these ports (as a client)
    console.log('\nTesting client connections to port 57321:');
    
    for (const host of ['127.0.0.1', 'localhost']) {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        
        await new Promise((resolve) => {
            socket.connect(57321, host, () => {
                console.log(`✅ Successfully connected to ${host}:57321 as client`);
                socket.end();
                resolve();
            });
            
            socket.on('error', (err) => {
                console.log(`❌ Cannot connect to ${host}:57321 as client: ${err.code}`);
                resolve();
            });
            
            socket.on('timeout', () => {
                console.log(`❌ Timeout connecting to ${host}:57321 as client`);
                socket.destroy();
                resolve();
            });
        });
    }
}

async function main() {
    await getSystemInfo();
    
    // Test individual ports on different hosts
    console.log('=== Testing specific ports on different hosts ===');
    for (const port of portsToTest) {
        console.log(`\nTesting port ${port}:`);
        for (const host of hostsToTest) {
            const result = await testPortOnHost(port, host);
            const status = result.success ? '✅ FREE' : `❌ ${result.error}`;
            console.log(`  ${host.padEnd(12)} : ${status}`);
        }
    }
    
    // Test port ranges
    await testPortRange(57321, 57325);
    await testPortRange(3000, 3005);
    await testPortRange(8000, 8005);
    
    await runNetstatComparison();
    
    console.log('\n=== Recommendations ===');
    console.log('1. Try using port 3000 or 8080 instead of 57321');
    console.log('2. If all high ports are blocked, check Windows Reserved Ports');
    console.log('3. Run: netsh int ipv4 show excludedportrange protocol=tcp');
    console.log('4. Check if antivirus or corporate firewall is blocking port binding');
}

main().catch(console.error);