import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Message } from '../types/message';
import { wsService } from '../services/websocket';
import { useEffect } from 'react';

const API_URL = 'http://localhost:3001';

export function useMessages() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = wsService.onMessage((message) => {
      queryClient.setQueryData<Message[]>(
        ['messages'], 
        (old = []) => [...old, message]
      );
    });

    // Очищаем подписку при размонтировании
    return () => unsubscribe();
  }, [queryClient]);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: () => axios.get(`${API_URL}/messages`).then(res => res.data),
  });

  const createMessage = useMutation({
    mutationFn: (content: string) => 
      axios.post<Message>(`${API_URL}/messages`, { content }),
  });

  return {
    messages,
    createMessage: (content: string) => createMessage.mutate(content),
  };
} 