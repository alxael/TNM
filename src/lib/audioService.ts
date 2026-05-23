// audioService.ts
class AudioService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private url = 'ws://localhost:8080';
  private isExplicitDisconnect = false;

  connect() {
    // If a connection is already open or opening, do not spin up duplicates
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitDisconnect = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[AudioService] Connected to Bridge');
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.ws.onerror = (error) => {
      // Suppress logging if we intentionally closed it during setup
      if (!this.isExplicitDisconnect) {
        console.error('[AudioService] Socket Error:', error);
      }
    };

    this.ws.onclose = () => {
      // Only trigger auto-reconnection if it wasn't a manual cleanup
      if (!this.isExplicitDisconnect) {
        console.log('[AudioService] Disconnected. Reconnecting in 3 seconds...');
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
        }
      }
    };
  }

  disconnect() {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      const localWs = this.ws;
      this.ws = null;
      try {
        localWs.close();
      } catch (e) {
        // Safe catch for premature closing
      }
    }
    console.log('[AudioService] Explicitly disconnected.');
  }

  sendData(x: number, y: number, z: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ x, y, z }));
    }
  }

  // Alias method to prevent runtime crashes if called either way
  sendModulation(x: number, y: number, z: number) {
    this.sendData(x, y, z);
  }
}

export const audioService = new AudioService();