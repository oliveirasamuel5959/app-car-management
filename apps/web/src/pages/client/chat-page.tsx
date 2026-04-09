import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  CircularProgress,
  Avatar,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/auth-context';
import { messageService, type Message, type WSMessage } from '../../services/message-service';

export default function ChatPage() {
  const { workshopUserId } = useParams<{ workshopUserId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const otherUserId = Number(workshopUserId);
  const workshopName = (location.state as any)?.workshopName ?? `Usuário #${workshopUserId}`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Always-current user id — avoids stale closure in onmessage
  const myUserIdRef = useRef<number>(Number(user?.id ?? 0));
  useEffect(() => { myUserIdRef.current = Number(user?.id ?? 0); }, [user?.id]);

  const loadHistory = () => {
    if (!otherUserId) return;
    messageService
      .getConversation(otherUserId)
      .then((msgs) => setMessages(msgs))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Load conversation history on mount
  useEffect(() => { loadHistory(); }, [otherUserId]);

  // Connect WebSocket
  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(messageService.getWsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      // Re-fetch history to pick up messages sent while offline
      loadHistory();
    };
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        if (data.type === 'new_message') {
          // Coerce to Number to guard against string IDs from JSON/localStorage
          const sId = Number(data.sender_id);
          const rId = Number(data.receiver_id);
          const myId = myUserIdRef.current;
          const otherId = Number(otherUserId);
          if (
            (sId === myId && rId === otherId) ||
            (sId === otherId && rId === myId)
          ) {
            const msg: Message = {
              id: 0,
              uuid: data.message_id ?? '',
              sender_id: sId,
              receiver_id: rId,
              content: data.content ?? null,
              message_type: (data.message_type as Message['message_type']) ?? 'text',
              file_url: null,
              file_name: null,
              file_size: null,
              mime_type: null,
              is_edited: false,
              created_at: data.timestamp ?? new Date().toISOString(),
            };
            setMessages((prev) => {
              // Deduplicate by uuid to avoid double-display after history reload
              if (msg.uuid && prev.some((m) => m.uuid === msg.uuid)) return prev;
              return [...prev, msg];
            });
          }
        } else if (data.type === 'user_typing' && Number(data.sender_id) === Number(otherUserId)) {
          setIsTyping(data.typing ?? false);
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      ws.close();
    };
  }, [token, otherUserId, user?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendTypingEvent = (type: 'typing_start' | 'typing_stop') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, receiver_id: otherUserId }));
    }
  };

  const handleInputChange = (value: string) => {
    setInputText(value);
    sendTypingEvent('typing_start');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingEvent('typing_stop'), 2000);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'chat_message',
        receiver_id: otherUserId,
        content: text,
        message_type: 'text',
      })
    );
    setInputText('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTypingEvent('typing_stop');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const msg = await messageService.uploadFile(otherUserId, file);
      setMessages((prev) => [...prev, msg]);
    } catch (err: any) {
      console.error('File upload failed:', err.message);
    } finally {
      e.target.value = '';
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Box className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <Box
        className="flex items-center gap-3 px-4 py-3 border-b"
        sx={{ bgcolor: 'background.paper' }}
      >
        <IconButton onClick={() => navigate('/client/messages')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          {workshopName.charAt(0).toUpperCase()}
        </Avatar>
        <Box className="flex-1 min-w-0">
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {workshopName}
          </Typography>
          {isTyping && (
            <Typography variant="caption" color="text.secondary">
              digitando...
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: wsConnected ? 'success.main' : 'error.main',
          }}
        />
      </Box>

      {/* Messages */}
      <Box className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {loading ? (
          <Box className="flex items-center justify-center flex-1">
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box className="flex items-center justify-center flex-1">
            <Typography color="text.secondary">
              Nenhuma mensagem ainda. Diga olá!
            </Typography>
          </Box>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <Box
                key={msg.uuid || msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <Paper
                  elevation={0}
                  sx={{
                    maxWidth: '70%',
                    px: 2,
                    py: 1,
                    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    bgcolor: isMine ? 'primary.main' : 'grey.100',
                    color: isMine ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  {msg.message_type === 'text' ? (
                    <Typography variant="body2">{msg.content}</Typography>
                  ) : msg.file_url ? (
                    <Box>
                      {msg.message_type === 'image' ? (
                        <img
                          src={msg.file_url}
                          alt={msg.file_name ?? 'image'}
                          style={{ maxWidth: 240, borderRadius: 8, display: 'block' }}
                        />
                      ) : (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'inherit' }}
                        >
                          {msg.file_name ?? 'Arquivo'}
                        </a>
                      )}
                    </Box>
                  ) : null}
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.7, display: 'block', textAlign: 'right', mt: 0.25 }}
                  >
                    {formatTime(msg.created_at)}
                  </Typography>
                </Paper>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box
        className="flex items-center gap-2 px-4 py-3 border-t"
        sx={{ bgcolor: 'background.paper' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={handleFileChange}
        />
        <Tooltip title="Anexar arquivo">
          <IconButton onClick={() => fileInputRef.current?.click()} size="small">
            <AttachFileIcon />
          </IconButton>
        </Tooltip>
        <TextField
          fullWidth
          size="small"
          placeholder="Digite uma mensagem..."
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          multiline
          maxRows={4}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!inputText.trim() || !wsConnected}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
