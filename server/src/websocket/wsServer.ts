import { WebSocket, WebSocketServer } from 'ws';
import { Message } from '../types/message';

export class WSServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }

  broadcastMessage(message: Message): void {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
} 