# TD ↔ Ableton Online

Send OSC both ways between Ableton (your machine) and TouchDesigner (a friend's machine) over the internet.

```
Ableton --OSC--> bridge --WebSocket--> relay (Render) --WebSocket--> bridge --OSC--> TouchDesigner
Ableton <--OSC-- bridge <--WebSocket-- relay (Render) <--WebSocket-- bridge <--OSC-- TouchDesigner
```

The relay forwards raw OSC packets to everyone else in the same **room**, which is the URL path.
So `wss://your-relay.onrender.com/arthur-jam` is the link you send your friend.

## 1. Deploy the relay once (free)
1. Push this folder to a GitHub repo.
2. On https://render.com: New → Web Service → pick the repo.
   Build command `npm install`, start command `npm start`, instance type Free.
3. You get a URL like `https://tdableton-xyz.onrender.com`. Your link is
   `wss://tdableton-xyz.onrender.com/<any-room-name>`.
   Opening the `https://` version in a browser shows how many people are in the room.

The free tier sleeps after about 15 minutes idle. The first connection can take around 30s to wake it, and the bridge retries on its own.

## 2. Each person runs the bridge (needs Node 18+)
```
npm install
node bridge/bridge.js wss://tdableton-xyz.onrender.com/arthur-jam 9000 9001
```
- Send OSC **to** `127.0.0.1:9000` and it goes to the other person.
- OSC **from** the other person arrives at `127.0.0.1:9001`.

## 3. Ableton side (you)
- **Send:** Connection Kit's **OSC Send** device, host `127.0.0.1`, port `9000`.
- **Receive:** a Max for Live device with `[udpreceive 9001]` (or any M4L OSC receiver set to port 9001).

## 4. TouchDesigner side (friend)
- **Receive:** OSC In CHOP (or OSC In DAT), network port `9001`.
- **Send:** OSC Out CHOP, address `127.0.0.1`, port `9000`.

## Test locally
```
PORT=8080 npm start
node bridge/bridge.js ws://localhost:8080/test 9000 9001
```
