import { Message } from '../types/message';

export class WebSocketService {
  private ws!: WebSocket;
  private messageHandlers: ((message: Message) => void)[] = [];
  private static instance: WebSocketService;

  constructor() {
    if (WebSocketService.instance) {
      return WebSocketService.instance;
    }
    
    this.initializeWebSocket();
    WebSocketService.instance = this;
  }

  private initializeWebSocket(): void {
    this.ws = new WebSocket('ws://localhost:3002');
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.messageHandlers.forEach(handler => handler(message));
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Можно добавить логику переподключения здесь
    };
  }

  onMessage(handler: (message: Message) => void): () => void {
    this.messageHandlers.push(handler);
    
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }
}

export const wsService = new WebSocketService(); 