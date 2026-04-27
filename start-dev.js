// Script simple para iniciar el backend sin problemas de build
const { spawn } = require('child_process');
const path = require('path');

console.log('[VentaFlow] Iniciando backend en modo desarrollo...');
console.log('[VentaFlow] Usando base de datos de EasyPanel');

// Configurar variables de entorno
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:6715320@79.143.187.160:5433/tecnovariedades?sslmode=disable';
process.env.PORT = process.env.PORT || '8080';
process.env.NODE_ENV = 'development';

// Iniciar el backend con vite (que maneja TypeScript internamente)
const backendPath = path.join(__dirname, 'artifacts', 'api-server');

console.log(`[VentaFlow] Directorio: ${backendPath}`);
console.log(`[VentaFlow] Puerto: ${process.env.PORT}`);
console.log(`[VentaFlow] Base de datos: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

// Usar node directamente con el código compilado si existe, o tsx si está disponible
const proc = spawn('pnpm', ['--filter', '@workspace/api-server', 'exec', 'node', '--import', 'tsx', 'src/index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: process.env
});

proc.on('error', (err) => {
  console.error('[VentaFlow] Error al iniciar:', err.message);
  process.exit(1);
});

proc.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[VentaFlow] El proceso terminó con código ${code}`);
  }
  process.exit(code);
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n[VentaFlow] Deteniendo servidor...');
  proc.kill('SIGINT');
});

process.on('SIGTERM', () => {
  proc.kill('SIGTERM');
});
