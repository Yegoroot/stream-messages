import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import { MessageService } from './services/messageService';
import { WSServer } from './websocket/wsServer';
import { Message } from './types/message';
import { config } from './config';
import { logger } from './utils/logger';
import 'dotenv/config';

const app = express();

async function bootstrap() {
  const mongoClient = await MongoClient.connect(config.mongoUrl);
  const messageService = new MessageService(mongoClient);
  const wsServer = new WSServer(config.wsPort);

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
      logger.error('Error adding message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/messages', async (req, res) => {
    try {
      const messages = await messageService.getAllMessages();
      res.json(messages);
    } catch (error) {
      logger.error('Error getting messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  messageService.onNewMessage((message) => {
    wsServer.broadcastMessage(message);
  });

  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down...');
    await mongoClient.close();
    wsServer.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  logger.error('Bootstrap error:', error);
  process.exit(1);
}); 