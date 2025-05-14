import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const API_BASE_URL = 'https://sellup.onrender.com/api/';

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

const MessagePage = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { userId } = route.params as { userId?: string };
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom function
  const scrollToBottom = (animated = true) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated });
    }
  };

  // Check if at bottom
  const checkIfAtBottom = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const atBottom = 
      layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    setIsAtBottom(atBottom);
  };

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}profile/`, { 
          headers: { Authorization: `Token ${token}` } 
        });
        setCurrentUser(res.data);
      } catch (err) {
        console.error('Не удалось получить профиль:', err);
        navigation.navigate('Login');
      }
    };

    loadProfile();
  }, [navigation]);

  // Load messages and conversations
  const loadMessages = async (userId?: string) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      if (userId) {
        const res = await axios.get<Message[]>(`${API_BASE_URL}messages/?user_id=${userId}`, {
          headers: { Authorization: `Token ${token}` },
        });
        setMessages(prevMessages => {
          if (JSON.stringify(prevMessages) !== JSON.stringify(res.data)) {
            return res.data;
          }
          return prevMessages;
        });
      }

      const conv = await axios.get<Conversation[]>(`${API_BASE_URL}messages/conversations/`, {
        headers: { Authorization: `Token ${token}` },
      });
      setConversations(prevConvs => {
        if (JSON.stringify(prevConvs) !== JSON.stringify(conv.data)) {
          return conv.data;
        }
        return prevConvs;
      });
    } catch (err: any) {
      console.error('Ошибка загрузки сообщений/диалогов:', err.response || err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        AsyncStorage.removeItem('token');
        navigation.navigate('Login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load messages periodically
  useEffect(() => {
    loadMessages(userId);

    const intervalId = setInterval(() => {
      loadMessages(userId);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [userId, navigation]);

  // Auto-scroll logic
  useEffect(() => {
    if (isAtBottom && !isUserScrolling) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, isUserScrolling]);

  // Initial scroll to bottom
  useEffect(() => {
    if (userId && messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [userId]);

  // Send message
  const sendMessage = async () => {
    if (!userId || !newMessage.trim()) return;
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const res = await axios.post<Message>(
        `${API_BASE_URL}messages/`,
        { receiver: userId, content: newMessage },
        { headers: { Authorization: `Token ${token}` } }
      );
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        AsyncStorage.removeItem('token');
        navigation.navigate('Login');
      } else {
        Alert.alert('Ошибка', 'Не удалось отправить сообщение');
      }
    }
  };

  // Handle scroll events
  const handleScroll = (event: any) => {
    checkIfAtBottom(event);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SellUp</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Icon name="account-circle" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Conversations sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Диалоги</Text>
          </View>
          <ScrollView style={styles.conversationsList}>
            {conversations.map(conv => (
              <TouchableOpacity
                key={conv.user.id}
                style={[
                  styles.conversationItem,
                  userId === String(conv.user.id) && styles.selectedConversation
                ]}
                onPress={() => navigation.navigate('MessagePage', { userId: String(conv.user.id) })}
              >
                <View style={styles.conversationAvatar}>
                  <Text style={styles.avatarText}>
                    {conv.user.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.conversationContent}>
                  <Text style={styles.conversationName} numberOfLines={1}>
                    {conv.user.username}
                  </Text>
                  <Text style={styles.conversationLastMessage} numberOfLines={1}>
                    {conv.last_message.content}
                  </Text>
                </View>
                <Text style={styles.conversationTime}>
                  {format(new Date(conv.last_message.created_at), 'HH:mm', { locale: ru })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chat area */}
        <View style={styles.chatContainer}>
          {userId && currentUser ? (
            <>
              {/* Chat header */}
              <View style={styles.chatHeader}>
                <View style={styles.chatAvatar}>
                  <Text style={styles.avatarText}>
                    {conversations.find(c => String(c.user.id) === userId)?.user.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.chatTitle}>
                  {conversations.find(c => String(c.user.id) === userId)?.user.username}
                </Text>
              </View>

              {/* Messages */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.messagesContent}
              >
                {messages.map(m => (
                  <View
                    key={m.id}
                    style={[
                      styles.messageWrapper,
                      m.sender === currentUser.id 
                        ? styles.sentMessageWrapper 
                        : styles.receivedMessageWrapper
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        m.sender === currentUser.id 
                          ? styles.sentMessage 
                          : styles.receivedMessage
                      ]}
                    >
                      <Text style={m.sender === currentUser.id ? styles.sentText : styles.receivedText}>
                        {m.content}
                      </Text>
                      <Text 
                        style={[
                          styles.messageTime,
                          m.sender === currentUser.id ? styles.sentTime : styles.receivedTime
                        ]}
                      >
                        {format(new Date(m.created_at), 'HH:mm', { locale: ru })}
                      </Text>
                    </View>
                  </View>
                ))}
                <View ref={messagesEndRef} />
              </ScrollView>

              {/* Message input */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inputContainer}
              >
                <TextInput
                  value={newMessage}
                  onChangeText={setNewMessage}
                  onSubmitEditing={sendMessage}
                  placeholder="Введите сообщение..."
                  style={styles.messageInput}
                  multiline
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  style={styles.sendButton}
                  disabled={!newMessage.trim()}
                >
                  <Icon name="send" size={24} color="#fff" />
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </>
          ) : (
            <View style={styles.emptyChat}>
              <Icon name="chat" size={48} color="#9ca3af" />
              <Text style={styles.emptyChatText}>Нет сообщений</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  sidebarHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedConversation: {
    backgroundColor: '#eff6ff',
  },
  conversationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#1e40af',
    fontWeight: 'bold',
    fontSize: 16,
  },
  conversationContent: {
    flex: 1,
    marginRight: 10,
  },
  conversationName: {
    fontWeight: '500',
    marginBottom: 2,
  },
  conversationLastMessage: {
    fontSize: 14,
    color: '#6b7280',
  },
  conversationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  chatTitle: {
    fontWeight: '500',
    fontSize: 16,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 15,
  },
  messagesContent: {
    paddingVertical: 15,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  sentMessageWrapper: {
    alignItems: 'flex-end',
  },
  receivedMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
  },
  sentMessage: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 0,
  },
  receivedMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  sentTime: {
    color: '#bfdbfe',
  },
  receivedTime: {
    color: '#9ca3af',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 10,
  },
});

export default MessagePage;