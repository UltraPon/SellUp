import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/apiClient';

interface Message {
  id: number;
  sender: number;
  receiver: number;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  user: {
    id: number;
    username: string;
  };
  last_message: Message;
}

interface User {
  id: number;
  username: string;
}

interface ApiError {
  isAxiosError?: boolean;
  response?: {
    status?: number;
    data?: any;
  };
  message?: string;
}

const MessagePage: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.title = "Сообщения | SellUp";
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  const checkIfAtBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
      const atBottom = scrollHeight - scrollTop <= clientHeight + 50;
      setIsAtBottom(atBottom);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    api.get<User>('profile/', { headers: { Authorization: `Token ${token}` } })
      .then(res => setCurrentUser(res.data))
      .catch((err: unknown) => {
        const error = err as ApiError;
        console.error('Не удалось получить профиль:', error);
        navigate('/login');
      });
  }, [navigate]);

  const loadMessages = async (userId?: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      if (userId) {
        const res = await api.get<Message[]>(`messages/?user_id=${userId}`, {
          headers: { Authorization: `Token ${token}` },
        });
        setMessages(prevMessages => {
          if (JSON.stringify(prevMessages) !== JSON.stringify(res.data)) {
            return res.data;
          }
          return prevMessages;
        });
      }

      const conv = await api.get<Conversation[]>('messages/conversations/', {
        headers: { Authorization: `Token ${token}` },
      });
      setConversations(prevConvs => {
        if (JSON.stringify(prevConvs) !== JSON.stringify(conv.data)) {
          return conv.data;
        }
        return prevConvs;
      });
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Ошибка загрузки сообщений/диалогов:', error);
      if (error.isAxiosError && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    loadMessages(userId);

    const intervalId = setInterval(() => {
      loadMessages(userId);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [userId, navigate]);

  useEffect(() => {
    if (isAtBottom && !isUserScrolling) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, isUserScrolling]);

  useEffect(() => {
    if (userId && messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [userId]);

  const sendMessage = async () => {
    if (!userId || !newMessage.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await api.post<Message>(
        'messages/',
        { receiver: userId, content: newMessage },
        { headers: { Authorization: `Token ${token}` } }
      );
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      scrollToBottom();
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Ошибка отправки сообщения:', error);
      if (error.isAxiosError && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        alert('Не удалось отправить сообщение');
      }
    }
  };

  const handleScroll = () => {
    checkIfAtBottom();

    if (!isUserScrolling) {
      setIsUserScrolling(true);
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">SellUp</Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/profile" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Профиль
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex container mx-auto">
        {/* Боковая панель с диалогами */}
        <aside className="w-full md:w-1/3 lg:w-1/4 bg-white border-r">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Диалоги</h2>
          </div>
          <div className="overflow-y-auto h-[calc(100vh-140px)]">
            {conversations.map(conv => (
              <div
                key={conv.user.id}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition ${
                  userId === String(conv.user.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => navigate(`/messages/${conv.user.id}`)}
              >
                <div className="flex items-center">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                    {conv.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{conv.user.username}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.last_message.content}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 ml-2">
                    {new Date(conv.last_message.created_at).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Основное окно чата */}
        <main className="flex-1 flex flex-col bg-white">
          {userId && currentUser ? (
            <>
              {/* Шапка чата */}
              <div className="p-4 border-b flex items-center">
                <div className="bg-blue-100 text-blue-800 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  {conversations.find(c => String(c.user.id) === userId)?.user.username.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-medium">
                  {conversations.find(c => String(c.user.id) === userId)?.user.username}
                </h3>
              </div>

              {/* Сообщения */}
              <div
                ref={messagesContainerRef}
                className="flex-1 p-4 overflow-y-auto bg-gray-50"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
                onScroll={handleScroll}
              >
                {messages.map(m => (
                  <div
                    key={m.id}
                    className={`mb-4 flex ${
                      m.sender === currentUser.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-3 ${
                        m.sender === currentUser.id 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white border rounded-bl-none'
                      }`}
                    >
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${
                        m.sender === currentUser.id ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода сообщения */}
              <div className="border-t p-4 bg-white">
                <div className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Введите сообщение..."
                    className="flex-1 border rounded-l-lg p-2"
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-blue-600 text-white p-2 rounded-r-lg hover:bg-blue-700 transition"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-16 h-16 text-gray-400">
                <path
                  d="M21 12c0 5.523-4.477 10-10 10s-10-4.477-10-10S5.477 2 11 2c3.537 0 6.602 1.891 8.308 4.717L21 4l-1.395 3.72C20.488 8.958 21 10.426 21 12z"
                />
              </svg>
              <p className="text-xl text-gray-700">Нет сообщений</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MessagePage;