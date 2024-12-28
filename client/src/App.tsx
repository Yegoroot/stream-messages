import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessageList } from './components/MessageList';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MessageList />
    </QueryClientProvider>
  );
}

export default App; 