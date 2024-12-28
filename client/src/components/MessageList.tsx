import React, { useState } from 'react';
import { useMessages } from '../hooks/useMessages';

export function MessageList() {
  const [newMessage, setNewMessage] = useState('');
  const { messages, createMessage } = useMessages();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      createMessage(newMessage);
      setNewMessage('');
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Введите сообщение"
        />
        <button type="submit">Отправить</button>
      </form>

      <div>
        {messages?.map((message) => (
          <div key={message._id}>
            <p>{message.content}</p>
            <small>{new Date(message.timestamp).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
} 