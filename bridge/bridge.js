// Local bridge: OSC (UDP) on this machine <-> WebSocket relay on the internet.
//
//   node bridge/bridge.js <relay-url> [listenPort] [sendPort] [sendHost]
//
// - Anything sent via OSC to   127.0.0.1:<listenPort>  goes to the relay.
// - Anything from the relay is sent via OSC to <sendHost>:<sendPort>.
const dgram = require('dgram');
const WebSocket = require('ws');

const [relayUrl, listenPort = '9000', sendPort = '9001', sendHost = '127.0.0.1'] = process.argv.slice(2);
if (!relayUrl) {
  console.log('Usage: node bridge/bridge.js wss://your-relay.onrender.com/room-name [listenPort=9000] [sendPort=9001] [sendHost=127.0.0.1]');
  process.exit(1);
}

const udp = dgram.createSocket('udp4');
let ws = null;
let sent = 0, received = 0;

function connect() {
  console.log(`Connecting to ${relayUrl} ...`);
  ws = new WebSocket(relayUrl);
  ws.on('open', () => console.log('Connected to relay.'));
  ws.on('message', (data) => {
    udp.send(data, Number(sendPort), sendHost);
    received++;
  });
  ws.on('close', () => {
    console.log('Disconnected. Retrying in 3s...');
    setTimeout(connect, 3000);
  });
  ws.on('error', (err) => console.log(`Relay error: ${err.message}`));
}

udp.on('message', (msg) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(msg, { binary: true });
    sent++;
  }
});

udp.bind(Number(listenPort), '127.0.0.1', () => {
  console.log(`OSC in : 127.0.0.1:${listenPort}  -> relay`);
  console.log(`OSC out: relay -> ${sendHost}:${sendPort}`);
  connect();
});

setInterval(() => {
  if (sent || received) console.log(`sent ${sent}, received ${received} OSC packets (last 5s)`);
  sent = received = 0;
}, 5000);
