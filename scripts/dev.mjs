import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
// import net from 'node:net'; // Commented out as it's no longer used

const services = [
  { name: 'api-gateway', workspace: 'api-gateway' },
  { name: 'event-broker', workspace: 'event-broker' },
  { name: 'worker-service', workspace: 'worker-service' },
  { name: 'simulator', workspace: 'simulator' },
  { name: 'dashboard', workspace: 'dashboard' },
];

const npmCommand = 'npm';
const children = new Map();
let shuttingDown = false;

function banner(message) {
  console.log(`\n=== ${message} ===`);
}

function parseDockerPortLine(line) {
  const match = line.match(/^(?<id>\S+)\t(?<name>\S+)\t(?<ports>.+)$/);
  if (!match?.groups) {
    return null;
  }

  return {
    containerId: match.groups.id,
    name: match.groups.name,
    ports: match.groups.ports,
  };
}

function findDockerContainersUsingPorts(ports) {
  return new Promise((resolve) => {
    const command =
      process.platform === 'win32'
        ? 'docker ps --format "{{.ID}}\t{{.Names}}\t{{.Ports}}"'
        : 'docker ps --format "{{.ID}}\t{{.Names}}\t{{.Ports}}"';
    const child = spawn(command, {
      cwd: path.resolve(process.cwd()),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.on('error', () => resolve([]));
    child.on('close', () => {
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      const matches = [];

      for (const line of lines) {
        const parsed = parseDockerPortLine(line);
        if (!parsed) {
          continue;
        }

        if (
          ports.some(
            (port) => parsed.ports.includes(`:${port}->`) || parsed.ports.includes(`:${port}/tcp`)
          )
        ) {
          matches.push(parsed);
        }
      }

      resolve(matches);
    });
  });
}

function findLocalPortOwners(ports) {
  const command = process.platform === 'win32' ? 'netstat -ano -p tcp' : 'netstat -anp tcp';

  const child = spawn(command, {
    cwd: path.resolve(process.cwd()),
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  return new Promise((resolve) => {
    child.on('error', () => resolve([]));
    child.on('close', () => {
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      const matches = [];

      for (const line of lines) {
        const trimmed = line.trim();
        const columns = trimmed.split(/\s+/);
        if (columns.length < 5) {
          continue;
        }

        const [proto, localAddress, foreignAddress, state, pid] = columns;
        if (!/^TCP$/i.test(proto) || !/^LISTEN/i.test(state)) {
          continue;
        }

        const portMatch = localAddress.match(/:(\d+)$/);
        if (!portMatch) {
          continue;
        }

        const port = Number(portMatch[1]);
        if (!ports.includes(port)) {
          continue;
        }

        matches.push({
          port,
          pid,
          localAddress,
          foreignAddress,
        });
      }

      resolve(matches);
    });
  });
}

async function preflightPorts() {
  const requiredPorts = [3000, 3001];
  const localOwners = await findLocalPortOwners(requiredPorts);
  const blockedPorts = [...new Set(localOwners.map((entry) => entry.port))];

  if (blockedPorts.length === 0) {
    return true;
  }

  console.log('Port check failed before startup.');
  console.log('Local listeners using the blocked ports:');
  for (const entry of localOwners) {
    console.log(`- port ${entry.port} pid ${entry.pid} (${entry.localAddress})`);
  }

  const dockerMatches = await findDockerContainersUsingPorts(blockedPorts);
  if (dockerMatches.length > 0) {
    console.log('The following Docker containers are using the blocked ports:');
    for (const item of dockerMatches) {
      console.log(`- ${item.name} (${item.containerId}) => ${item.ports}`);
    }
  } else {
    console.log(`Blocked ports: ${blockedPorts.join(', ')}`);
  }

  console.log(
    'Stop the Docker stack with `npm run docker:down` before running `npm run dev` locally.'
  );
  return false;
}

function startService(service) {
  banner(`${service.name} starting`);

  const child = spawn(npmCommand, ['run', 'dev', '-w', service.workspace], {
    cwd: path.resolve(process.cwd()),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  children.set(service.name, child);

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${service.name}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${service.name}] ${chunk}`);
  });

  child.on('spawn', () => {
    console.log(`[${service.name}] running`);
  });

  child.on('exit', (code, signal) => {
    children.delete(service.name);

    if (shuttingDown) {
      console.log(`[${service.name}] stopped`);
      return;
    }

    if (code === 0) {
      console.log(`[${service.name}] exited cleanly`);
    } else {
      console.error(
        `[${service.name}] exited with code ${code ?? 'null'}${signal ? ` signal ${signal}` : ''}`
      );
    }

    if (children.size === 0 && !shuttingDown) {
      console.log('\nAll dev services have stopped.');
      process.exit(code ?? 0);
    }
  });

  child.on('error', (error) => {
    console.error(`[${service.name}] failed to start: ${error.message}`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  banner(`Received ${signal}; stopping dev services`);

  const activeChildren = [...children.values()];
  for (const child of activeChildren) {
    if (process.platform === 'win32') {
      child.kill();
    } else {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    process.exit(0);
  }, 1000).unref();
}

console.log('SignalOps development launcher');
console.log('Active services:');
for (const service of services) {
  console.log(`- ${service.name}`);
}

const portsOk = await preflightPorts();
if (!portsOk) {
  process.exitCode = 1;
} else {
  for (const service of services) {
    startService(service);
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
