export const config = {
  port: parseInt(process.env.PORT || '3001'),
  wsPort: parseInt(process.env.WS_PORT || '3002'),
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
  batchSize: parseInt(process.env.BATCH_SIZE || '10'),
  batchTimeout: parseInt(process.env.BATCH_TIMEOUT || '1000'),
  dbName: process.env.DB_NAME || 'messageApp',
}; 