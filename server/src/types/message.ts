export interface Message {
  _id?: string;
  content: string;
  timestamp: Date;
}

export interface MessageBatch {
  messages: Message[];
} 