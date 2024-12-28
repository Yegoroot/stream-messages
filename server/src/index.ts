import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import { MessageService } from './services/messageService';
import { WSServer } from './websocket/wsServer';
import { Message } from './types/message';

const app = express();
const PORT = 3001;
const WS_PORT = 3002;
const MONGO_URL = 'mongodb://localhost:27017';

async function bootstrap() {
  const mongoClient = await MongoClient.connect(MONGO_URL);
  const messageService = new MessageService(mongoClient);
  const wsServer = new WSServer(WS_PORT);

  app.use(cors());
  app.use(express.json());

  app.post('/messages', async (req, res) => {
    try {
      const message: Message = {
        content: req.body.content,
        timestamp: new Date()
      };
      
      await messageService.addMessage(message);
      res.status(202).json({ message: 'Message accepted' });
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/messages', async (req, res) => {
    try {
      const messages = await messageService.getAllMessages();
      res.json(messages);
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  messageService.onNewMessage((message) => {
    wsServer.broadcastMessage(message);
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await mongoClient.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(console.error); 