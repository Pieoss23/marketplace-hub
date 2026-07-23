import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 4300;
const demoDir = dirname(fileURLToPath(import.meta.url));

const server = createServer((request, response) => {
  const path = request.url === '/' ? '/index.html' : request.url;
  const filePath = join(demoDir, path ?? '/index.html');

  if (!filePath.startsWith(demoDir) || !existsSync(filePath)) {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  createReadStream(filePath).pipe(response);
});

server.listen(PORT, () => {
  console.log(`Demo form page: http://localhost:${PORT}/`);
});
