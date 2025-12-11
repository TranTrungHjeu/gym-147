import { MessageCircle, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { chatService, ChatMessage, Conversation } from '../services/chat.service';
import { getCurrentUser } from '../utils/auth';
import AdminCard from '../components/common/AdminCard';
import useTranslation from '../hooks/useTranslation';

export default function ChatPage() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const user = getCurrentUser();

  useEffect(() => {
    if (!user?.id) return;

    let unsubscribe: (() => void) | undefined;
    let unsubscribeTyping: (() => void) | undefined;

    // Connect to Socket.IO
    chatService
      .connect(user.id)
      .then(() => {
        loadConversations();
        loadUnreadCount();

        // Listen for new messages - only after connection is established
        unsubscribe = chatService.onMessage(newMessage => {
          // If this is a support message (receiver_id is null), reload conversations
          if (!newMessage.receiver_id && newMessage.sender_id !== user.id) {
            // Reload conversations to include new member
            loadConversations();
            loadUnreadCount();
          }

          // If message is for selected conversation, add it
          if (selectedConversation) {
            const isForSelectedConversation =
              (newMessage.sender_id === selectedConversation.user.id &&
                (newMessage.receiver_id === user.id || !newMessage.receiver_id)) ||
              (newMessage.receiver_id === selectedConversation.user.id &&
                newMessage.sender_id === user.id) ||
              (!newMessage.receiver_id && newMessage.sender_id === selectedConversation.user.id);

            if (isForSelectedConversation) {
              setMessages(prev => {
                if (prev.find(m => m.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });
              scrollToBottom();

              // Mark as read if it's a received message
              if (
                (newMessage.receiver_id === user.id ||
                  (!newMessage.receiver_id &&
                    newMessage.sender_id === selectedConversation.user.id)) &&
                !newMessage.is_read
              ) {
                chatService.markAsRead([newMessage.id]).catch(console.error);
                loadUnreadCount();
              }
            }
          }

          // Update unread count (including support messages for admins)
          if (
            (newMessage.receiver_id === user.id || !newMessage.receiver_id) &&
            !newMessage.is_read
          ) {
            loadUnreadCount();
          }
        });

        // Listen for typing indicators - only after connection is established
        unsubscribeTyping = chatService.onTyping(data => {
          if (selectedConversation && data.sender_id === selectedConversation.user.id) {
            setIsTyping(data.is_typing);

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            if (data.is_typing) {
              typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
              }, 3000);
            }
          }
        });
      })
      .catch(error => {
        console.error('Error connecting to chat:', error);
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
    };
  }, [user?.id, selectedConversation]);

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);

      // Update unread count from conversations
      const totalUnread = data.reduce((sum, conv) => sum + conv.unreadCount, 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (otherUserId: string | null) => {
    try {
      setLoading(true);
      const data = await chatService.getChatHistory(otherUserId, 100, 0);
      setMessages(data);
      scrollToBottom();

      // Mark all messages as read (including support messages where receiver_id is null)
      // For support messages, only mark as read if they're from the selected conversation member
      const unreadIds = data
        .filter(
          msg =>
            (msg.receiver_id === user?.id ||
              (otherUserId && !msg.receiver_id && msg.sender_id === otherUserId)) &&
            !msg.is_read
        )
        .map(msg => msg.id);
      if (unreadIds.length > 0) {
        await chatService.markAsRead(unreadIds);
        loadUnreadCount();
        loadConversations(); // Reload to update unread counts in conversations list
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await chatService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Load messages with the member's user ID
    loadMessages(conversation.user.id);
  };

  const handleSend = async () => {
    if (!message.trim() || sending || !selectedConversation) return;

    const messageText = message.trim();
    setMessage('');
    setSending(true);

    try {
      await chatService.sendMessage(selectedConversation.user.id, messageText);
      scrollToBottom();
      loadUnreadCount();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setMessage(text);
    if (selectedConversation) {
      chatService.sendTyping(selectedConversation.user.id, text.length > 0);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('chat.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('chat.yesterday');
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      });
    }
  };

  const isMyMessage = (msg: ChatMessage) => {
    return msg.sender_id === user?.id;
  };

  return (
    <div className='flex h-[calc(100vh-8rem)] gap-4'>
      {/* Conversations List */}
      <AdminCard className='w-80 flex-shrink-0 flex flex-col p-0 overflow-hidden'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {t('chat.customerSupport')}
          </h2>
          {unreadCount > 0 && (
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              {t('chat.unreadMessages', { count: unreadCount })}
            </p>
          )}
        </div>
        <div className='flex-1 overflow-y-auto'>
          {conversations.length === 0 ? (
            <div className='p-4 text-center text-gray-500 dark:text-gray-400'>
              <MessageCircle className='w-12 h-12 mx-auto mb-2 opacity-50' />
              <p>{t('chat.noConversations')}</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-200 dark:divide-gray-700'>
              {conversations.map(conversation => (
                <button
                  key={conversation.user.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedConversation?.user.id === conversation.user.id
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500'
                      : ''
                  }`}
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold'>
                      {conversation.user.first_name?.[0]?.toUpperCase() ||
                        conversation.user.email?.[0]?.toUpperCase() ||
                        'U'}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <p className='font-semibold text-gray-900 dark:text-gray-100 truncate'>
                          {conversation.user.first_name} {conversation.user.last_name}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className='bg-orange-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center'>
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className='text-sm text-gray-500 dark:text-gray-400 truncate mt-1'>
                        {conversation.lastMessage.message}
                      </p>
                      <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                        {formatTime(conversation.lastMessage.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </AdminCard>

      {/* Chat Messages */}
      <AdminCard className='flex-1 flex flex-col p-0 overflow-hidden'>
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold'>
                  {selectedConversation.user.first_name?.[0]?.toUpperCase() ||
                    selectedConversation.user.email?.[0]?.toUpperCase() ||
                    'U'}
                </div>
                <div className='flex-1'>
                  <h3 className='font-semibold text-gray-900 dark:text-gray-100'>
                    {selectedConversation.user.first_name} {selectedConversation.user.last_name}
                  </h3>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    {selectedConversation.user.email}
                  </p>
                </div>
                {isTyping && (
                  <div className='text-sm text-gray-500 dark:text-gray-400 italic'>
                    {t('chat.typing')}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              {loading ? (
                <div className='flex items-center justify-center h-full'>
                  <div className='text-gray-500 dark:text-gray-400'>
                    {t('chat.loadingMessages')}
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className='flex items-center justify-center h-full'>
                  <div className='text-center text-gray-500 dark:text-gray-400'>
                    <MessageCircle className='w-12 h-12 mx-auto mb-2 opacity-50' />
                    <p>{t('chat.noMessages')}</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const myMessage = isMyMessage(msg);
                  const showDate =
                    index === 0 ||
                    new Date(msg.created_at).toDateString() !==
                      new Date(messages[index - 1].created_at).toDateString();

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className='text-center text-xs text-gray-400 dark:text-gray-500 my-4'>
                          {formatDate(msg.created_at)}
                        </div>
                      )}
                      <div className={`flex ${myMessage ? 'justify-end' : 'justify-start'} mb-2`}>
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            myMessage
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          <p className='text-sm'>{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              myMessage ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
              <div className='flex items-end gap-2'>
                <textarea
                  value={message}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t('chat.input.placeholder')}
                  className='flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                  rows={1}
                  maxLength={1000}
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className='p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  <Send className='w-5 h-5' />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center text-gray-500 dark:text-gray-400'>
              <MessageCircle className='w-16 h-16 mx-auto mb-4 opacity-50' />
              <p className='text-lg font-semibold mb-2'>{t('chat.selectConversation')}</p>
              <p>{t('chat.selectConversationDesc')}</p>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
