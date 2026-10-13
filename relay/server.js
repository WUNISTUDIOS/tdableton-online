// WebSocket relay: every client connected to the same path ("room") gets
// every message the others send. Messages are raw OSC packets (binary),
// so the relay never needs to understand OSC.
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const rooms = new Map(); // room name -> Set<ws>

const server = http.createServer((req, res) => {
  const room = decodeURIComponent(req.url.split('?')[0].replace(/^\/+/, '')) || '(none)';
  const peers = rooms.get(room)?.size || 0;
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`TD <-> Ableton OSC relay is running.\nRoom "${room}": ${peers} connected.\n`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const room = decodeURIComponent(req.url.split('?')[0].replace(/^\/+/, '')) || 'default';
  if (!rooms.has(room)) rooms.set(room, new Set());
  const peers = rooms.get(room);
  peers.add(ws);
  console.log(`+ ${room} (${peers.size} connected)`);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data, isBinary) => {
    for (const peer of peers) {
      if (peer !== ws && peer.readyState === 1) peer.send(data, { binary: isBinary });
    }
  });

  ws.on('close', () => {
    peers.delete(ws);
    if (peers.size === 0) rooms.delete(room);
    console.log(`- ${room} (${peers.size} connected)`);
  });
});

// Ping every 30s so idle connections aren't dropped by hosting proxies.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, () => console.log(`Relay listening on :${PORT}`));
