import { api } from './api';

const WS_BASE_URL = 'ws://localhost:5500';

export interface Message {
  id: number;
  uuid: string;
  sender_id: number;
  receiver_id: number;
  content: string | null;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file';
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_edited: boolean;
  created_at: string;
}

// Shape of frames coming FROM the server
export interface WSMessage {
  type: 'new_message' | 'user_typing' | 'error';
  // new_message fields (flat — no nested .message object)
  message_id?: string;
  sender_id?: number;
  sender_name?: string;
  receiver_id?: number;
  content?: string;
  timestamp?: string;
  message_type?: string;
  // user_typing fields
  typing?: boolean;
  // error
  error?: string;
}

export const messageService = {
  getConversation: async (otherUserId: number, skip = 0, limit = 50): Promise<Message[]> => {
    try {
      const response = await api.get(`/messages/conversation/${otherUserId}?skip=${skip}&limit=${limit}`);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch conversation');
    }
  },

  uploadFile: async (receiverId: number, file: File): Promise<Message> => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`http://localhost:5500/messages/conversation/${receiverId}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to upload file');
    }

    return response.json();
  },

  getWsUrl: (token: string): string => {
    return `${WS_BASE_URL}/messages/ws?token=${token}`;
  },
};
