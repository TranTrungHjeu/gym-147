import { chatService, ChatMessage } from '@/services/chat/chat.service';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { ArrowLeft, Send } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Connect to Socket.IO
    chatService
      .connect(user.id)
      .then(() => {
        loadMessages();
      })
      .catch((error) => {
        console.error('Error connecting to chat:', error);
        Alert.alert(t('common.error'), 'Failed to connect to chat service');
      });

    // Listen for new messages
    const unsubscribe = chatService.onMessage((newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    });

    // Listen for typing indicators
    const unsubscribeTyping = chatService.onTyping((data) => {
      setIsTyping(data.is_typing);
    });

    return () => {
      unsubscribe();
      unsubscribeTyping();
      chatService.disconnect();
    };
  }, [user?.id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const chatMessages = await chatService.getChatHistory(null, 100, 0);
      setMessages(chatMessages);
      scrollToBottom();
    } catch (error: any) {
      console.error('Error loading messages:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const messageText = message.trim();
    setMessage('');
    setSending(true);

    try {
      // Send to support (null receiver_id = admin/staff support)
      await chatService.sendMessage(null, messageText);
      // Message will be added via Socket.IO event
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to send message');
      setMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isMyMessage = (msg: ChatMessage) => {
    return msg.sender_id === user?.id;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t('settings.support') || 'Support Chat'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {isTyping ? 'Support is typing...' : 'Available 24/7'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => {
            const myMessage = isMyMessage(item);
            return (
              <View
                style={[
                  styles.messageContainer,
                  myMessage ? styles.myMessageContainer : styles.otherMessageContainer,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: myMessage
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      {
                        color: myMessage ? '#fff' : theme.colors.text,
                      },
                    ]}
                  >
                    {item.message}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      {
                        color: myMessage ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No messages yet. Start a conversation!
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder={t('settings.typeMessage') || 'Type a message...'}
            placeholderTextColor={theme.colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: theme.colors.primary,
              },
              (!message.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMedium,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h5,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: {
    ...Typography.bodyMedium,
    marginBottom: 4,
  },
  messageTime: {
    ...Typography.caption,
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...Typography.bodyMedium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    ...Typography.bodyMedium,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});


