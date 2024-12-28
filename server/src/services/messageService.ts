import { MongoClient, Collection } from 'mongodb';
import { Message } from '../types/message';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';

export class MessageService extends EventEmitter {
  private messages: Message[] = [];
  private collection: Collection<Message>;
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 1000;
  private readonly BACKUP_FILE = path.join(__dirname, '../data/pending-messages.json');
  private isFlushInProgress = false;

  constructor(private mongoClient: MongoClient) {
    super();
    this.collection = this.mongoClient.db('messageApp').collection('messages');
    this.loadPendingMessages();

    process.on('SIGINT', () => this.handleShutdown());
    process.on('SIGTERM', () => this.handleShutdown());
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
    this.messages.push(message);
    
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
  }

  private async flushMessages(): Promise<void> {
    if (this.messages.length === 0 || this.isFlushInProgress) return;

    this.isFlushInProgress = true;
    let messagesToInsert: Message[] = [];

    try {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }

      messagesToInsert = [...this.messages];
      this.messages = [];

      const result = await this.collection.insertMany(messagesToInsert);
      
      // Отправляем события о новых сообщениях после успешной вставки
      messagesToInsert.forEach((message, index) => {
        const insertedMessage = {
          ...message,
          _id: result.insertedIds[index]
        };
        this.emit('newMessage', insertedMessage);
      });
    } catch (error) {
      // Возвращаем сообщения обратно в очередь
      this.messages = [...messagesToInsert, ...this.messages];
      throw error;
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