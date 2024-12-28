import { MongoClient, Collection } from 'mongodb';
import { Message } from '../types/message';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config';

export class MessageService extends EventEmitter {
  private messages: Message[] = [];
  private collection: Collection<Message>;
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = config.batchSize;
  private readonly BATCH_TIMEOUT = config.batchTimeout;
  private readonly BACKUP_FILE = path.join(__dirname, '../data/pending-messages.json');
  private isFlushInProgress = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(private mongoClient: MongoClient) {
    super();
    this.collection = this.mongoClient.db(config.dbName).collection('messages');
    this.loadPendingMessages();
    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers() {
    const shutdown = async () => {
      logger.info('Shutting down MessageService...');
      try {
        if (this.messages.length > 0) {
          await this.savePendingMessages();
        }
        await this.mongoClient.close();
        logger.info('MessageService shutdown complete');
      } catch (error) {
        logger.error('Error during shutdown:', error);
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private async handleShutdown() {
    if (this.messages.length > 0) {
      await this.savePendingMessages();
    }
    process.exit(0);
  }

  private async savePendingMessages() {
    const dir = path.dirname(this.BACKUP_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.BACKUP_FILE, JSON.stringify(this.messages));
  }

  private loadPendingMessages() {
    try {
      if (fs.existsSync(this.BACKUP_FILE)) {
        const data = fs.readFileSync(this.BACKUP_FILE, 'utf8');
        this.messages = JSON.parse(data);
        fs.unlinkSync(this.BACKUP_FILE); // Удаляем файл после загрузки
        if (this.messages.length > 0) {
          this.scheduleFlush();
        }
      }
    } catch (error) {
      console.error('Error loading pending messages:', error);
    }
  }

  private scheduleFlush() {
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushMessages(), this.BATCH_TIMEOUT);
    }
  }

  async addMessage(message: Message): Promise<void> {
    try {
      this.messages.push(message);
      logger.debug(`Message added to buffer. Buffer size: ${this.messages.length}`);
      
      if (this.isFlushInProgress) {
        return;
      }
      
      if (this.messages.length === 1) {
        this.batchTimeout = setTimeout(() => this.flushMessages(), this.BATCH_TIMEOUT);
      } else if (this.messages.length >= this.BATCH_SIZE) {
        if (this.batchTimeout) {
          clearTimeout(this.batchTimeout);
          this.batchTimeout = null;
        }
        await this.flushMessages();
      }
    } catch (error) {
      logger.error('Error adding message:', error);
      throw error;
    }
  }

  private async flushMessages(): Promise<void> {
    if (this.messages.length === 0 || this.isFlushInProgress) return;

    this.isFlushInProgress = true;
    let messagesToInsert = [...this.messages];

    try {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }

      messagesToInsert = [...this.messages];
      this.messages = [];

      logger.info(`Flushing ${messagesToInsert.length} messages to database`);
      const result = await this.collection.insertMany(messagesToInsert);
      
      messagesToInsert.forEach((message, index) => {
        const insertedMessage = {
          ...message,
          _id: result.insertedIds[index]
        };
        this.emit('newMessage', insertedMessage);
      });

      logger.info(`Successfully flushed ${messagesToInsert.length} messages`);
      this.reconnectAttempts = 0;
    } catch (error) {
      logger.error('Error flushing messages:', error);
      this.messages = [...messagesToInsert, ...this.messages];
      
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        logger.info(`Retrying flush in ${this.reconnectAttempts * 1000}ms`);
        setTimeout(() => this.flushMessages(), this.reconnectAttempts * 1000);
      } else {
        logger.error('Max reconnection attempts reached');
        throw error;
      }
    } finally {
      this.isFlushInProgress = false;
    }
  }

  async getAllMessages(): Promise<Message[]> {
    return await this.collection.find().toArray();
  }

  onNewMessage(callback: (message: Message) => void): void {
    this.on('newMessage', callback);
  }
} 