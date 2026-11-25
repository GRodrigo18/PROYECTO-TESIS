const net = require('net');

function probar(p) {
  const s = net.createServer();
  s.once('error', () => (p < 3010 ? probar(p + 1) : (console.log(p), process.exit(0))));
  s.listen(p, '0.0.0.0', () => s.close(() => console.log(p)));
}

probar(Number(process.argv[2] || 3000));
