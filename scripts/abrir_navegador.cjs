const http = require('http');
const { exec } = require('child_process');

const puerto = Number(process.argv[2] || 3000);
const url = `http://localhost:${puerto}`;
const limite = Date.now() + 180_000;

function abrir() {
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function intentar() {
  const req = http.get(`${url}/api/health`, res => {
    let cuerpo = '';
    res.on('data', d => (cuerpo += d));
    res.on('end', () => {
      if (res.statusCode !== 200) return reintentar();
      try {
        const h = JSON.parse(cuerpo);
        console.log('');
        console.log(`  Listo: ${url}`);
        console.log(`  Modelo: ${h.modelo ? 'OK' : 'FALTA'} | Metricas: ${h.informe_metricas ? 'OK' : 'FALTA'} | Predicciones 2026: ${h.predicciones_2026} alumnos`);
        console.log('  No cierre esta ventana durante la presentacion.');
        console.log('');
      } catch {}
      abrir();
    });
  });
  req.on('error', reintentar);
  req.setTimeout(3000, () => req.destroy());
}

function reintentar() {
  if (Date.now() > limite) {
    console.log(`  El servidor no respondio en 3 minutos. Abra ${url} a mano.`);
    return;
  }
  setTimeout(intentar, 1000);
}

intentar();
