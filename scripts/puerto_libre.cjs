// Imprime el primer puerto libre desde el indicado (3000 por defecto).
// Lo usan iniciar_demo.bat e iniciar_demo.sh para no chocar con otra ventana que quedo abierta.
const net = require('net');

function probar(p) {
  const s = net.createServer();
  s.once('error', () => (p < 3010 ? probar(p + 1) : (console.log(p), process.exit(0))));
  s.listen(p, '0.0.0.0', () => s.close(() => console.log(p)));
}

probar(Number(process.argv[2] || 3000));
