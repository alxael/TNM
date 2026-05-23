// server.js
import { WebSocketServer } from 'ws';
import dgram from 'dgram';

const WS_PORT = 8080;
const PD_PORT = 9000;

// Setup WebSocket server for React
const wss = new WebSocketServer({ port: WS_PORT });
// Setup UDP client for Pure Data
const udpClient = dgram.createSocket('udp4');

console.log(`[Bridge] WebSocket server listening on ws://localhost:${WS_PORT}`);
console.log(`[Bridge] Target Pure Data UDP port: ${PD_PORT}`);

wss.on('connection', (ws) => {
  console.log('[Bridge] Frontend client connected.');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      let { x, y, z } = data;

      // --- AUDIO SAFEGUARDS & CLAMPING ---
      // 1. Keep X bounded so filter cutoff stays between 100Hz and 2100Hz
      x = Math.max(0.0, Math.min(x, 1.0));

      // 2. STRICT CAP ON Y: Ensure feedback gain (y * 0.85) NEVER reaches or exceeds 1.0
      // Capping Y at 1.1 means max feedback is 1.1 * 0.85 = 0.935 (Beautiful, long, safe echo)
      y = Math.max(0.0, Math.min(y, 1.1));

      // 3. Keep Z bounded between 0 and 1 for safe, clean stereo panning
      z = Math.max(0.0, Math.min(z, 1.0));
      // ------------------------------------

      // Send as a pure space-separated list of three floats: "0.45 0.12 0.88"
      // No extra text characters or semicolons, making it completely bulletproof for Pd's [unpack]
      const pdMessage = `${x} ${y} ${z};\n`;

      console.log(pdMessage);

      udpClient.send(pdMessage, PD_PORT, 'localhost', (err) => {
        if (err) {
          console.error('[Bridge] Failed to send UDP packet to Pd:', err);
        }
      });
    } catch (err) {
      console.error('[Bridge] Error processing incoming socket data:', err);
    }
  });

  ws.on('close', () => {
    console.log('[Bridge] Frontend client disconnected.');
  });
});