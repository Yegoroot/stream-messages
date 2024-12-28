import { WebSocket, WebSocketServer } from 'ws';
import { Message } from '../types/message';
import { logger } from '../utils/logger';

export class WSServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval!: NodeJS.Timeout;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New WebSocket connection established');
      this.clients.add(ws);
      
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if ((ws as any).isAlive === false) {
          logger.info('Terminating inactive WebSocket connection');
          ws.terminate();
          this.clients.delete(ws);
          return;
        }
        
        (ws as any).isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  broadcastMessage(message: Message): void {
    const payload = JSON.stringify(message);
    let failed = 0;

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (error) {
          failed++;
          logger.error('Error broadcasting message:', error);
          this.clients.delete(client);
        }
      }
    });

    logger.debug(`Broadcast complete. Success: ${this.clients.size - failed}, Failed: ${failed}`);
  }

  shutdown() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
} 