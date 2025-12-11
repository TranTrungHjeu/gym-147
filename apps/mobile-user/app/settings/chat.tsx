import { ErrorModal } from '@/components/ErrorModal';
import { chatService, ChatMessage } from '@/services/chat/chat.service';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Load unread count
    loadUnreadCount();

    let unsubscribe: (() => void) | undefined;
    let unsubscribeTyping: (() => void) | undefined;

    // Connect to Socket.IO
    chatService
      .connect(user.id)
      .then(() => {
        loadMessages();

        // Listen for new messages - only after connection is established
        unsubscribe = chatService.onMessage((newMessage) => {
          console.log(
            '[CHAT] Received message:',
            newMessage.id,
            'sender_id:',
            newMessage.sender_id,
            'receiver_id:',
            newMessage.receiver_id,
            'user.id:',
            user.id
          );

          // Check if this message is for the current user
          // Case 1: Member sent support message (receiver_id = null, sender_id = user.id) - our own message
          // Case 2: Admin replied to member (receiver_id = user.id, sender_id = admin.id) - message for us
          // Case 3: Message sent confirmation (chat:message:sent event) - always show our own messages
          const isForCurrentUser =
            newMessage.receiver_id === user.id || // Admin replied to us
            newMessage.sender_id === user.id; // We sent this message (support or confirmation)

          if (!isForCurrentUser) {
            console.log(
              '[CHAT] Message not for current user, ignoring. Details:',
              {
                messageId: newMessage.id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id,
                currentUserId: user.id,
              }
            );
            return;
          }

          console.log('[CHAT] Message is for current user, processing...');

          // Handle all messages (regular and support)
          setMessages((prev) => {
            // Check if message already exists
            if (prev.find((m) => m.id === newMessage.id)) {
              console.log('[CHAT] Message already exists, skipping');
              return prev;
            }
            console.log('[CHAT] Adding new message to list');
            // Add new message and sort by created_at to maintain chronological order
            const updated = [...prev, newMessage];
            return updated.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });
          scrollToBottom();

          // Mark as read if it's a received message (not sent by current user)
          // Admin replied: receiver_id === user.id
          if (newMessage.receiver_id === user.id && !newMessage.is_read) {
            console.log('[CHAT] Marking message as read:', newMessage.id);
            chatService.markAsRead([newMessage.id]).catch(console.error);
            loadUnreadCount();
          }
        });

        // Listen for typing indicators - only after connection is established
        unsubscribeTyping = chatService.onTyping((data) => {
          setIsTyping(data.is_typing);

          // Clear typing indicator after 3 seconds
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (data.is_typing) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(false);
            }, 3000);
          }
        });
      })
      .catch((error) => {
        console.log('Error connecting to chat:', error);
        setErrorMessage(
          t('chat.connectionError', {
            defaultValue:
              'Không thể kết nối đến dịch vụ chat. Vui lòng thử lại sau.',
          })
        );
        setShowErrorModal(true);
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (unsubscribeTyping) {
        unsubscribeTyping();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      chatService.disconnect();
    };
  }, [user?.id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      // Load support chat (receiver_id = null means admin/super admin support)
      // Backend returns messages in desc order (newest first), reverse to show oldest first
      const chatMessages = await chatService.getChatHistory(null, 100, 0);
      setMessages(chatMessages.reverse());
      scrollToBottom();

      // Mark all messages as read when viewing
      // Only mark messages where receiver_id === user.id (admin replies to this member)
      const unreadIds = chatMessages
        .filter((msg) => msg.receiver_id === user?.id && !msg.is_read)
        .map((msg) => msg.id);
      if (unreadIds.length > 0) {
        await chatService.markAsRead(unreadIds);
        loadUnreadCount();
      }
    } catch (error: any) {
      console.log('Error loading messages:', error);
      setErrorMessage(
        error.message ||
          t('chat.loadError', {
            defaultValue: 'Không thể tải tin nhắn. Vui lòng thử lại sau.',
          })
      );
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await chatService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.log('Error loading unread count:', error);
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
      // Send to support (null receiver_id = admin/super admin support)
      await chatService.sendMessage(null, messageText);
      // Message will be added via Socket.IO event
      scrollToBottom();
    } catch (error: any) {
      console.log('Error sending message:', error);
      setErrorMessage(
        error.message ||
          t('chat.sendError', {
            defaultValue: 'Không thể gửi tin nhắn. Vui lòng thử lại sau.',
          })
      );
      setShowErrorModal(true);
      setMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setMessage(text);
    // Send typing indicator to admin/super admin
    // Note: For support chat, we don't have a specific receiver_id
    // The backend will handle broadcasting to all admins
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
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            {t('chat.loading', { defaultValue: 'Đang tải chat...' })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {t('chat.title', { defaultValue: 'Hỗ trợ' })}
            </Text>
            {unreadCount > 0 && (
              <View
                style={[
                  styles.unreadBadge,
                  { backgroundColor: theme.colors.error },
                ]}
              >
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.colors.textSecondary },
            ]}
          >
            {isTyping
              ? t('chat.typing', { defaultValue: 'Đang nhập...' })
              : t('chat.available', { defaultValue: 'Hỗ trợ 24/7' })}
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
                  myMessage
                    ? styles.myMessageContainer
                    : styles.otherMessageContainer,
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
                        color: myMessage
                          ? 'rgba(255,255,255,0.7)'
                          : theme.colors.textSecondary,
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
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('chat.noMessages', {
                  defaultValue:
                    'Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!',
                })}
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
            placeholder={t('chat.typeMessage', {
              defaultValue: 'Nhập tin nhắn...',
            })}
            placeholderTextColor={theme.colors.textSecondary}
            value={message}
            onChangeText={handleTyping}
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

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage('');
        }}
        title={t('chat.errorTitle', { defaultValue: 'Lỗi' })}
        message={errorMessage}
        type="error"
      />
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    ...Typography.h5,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    ...Typography.caption,
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
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
