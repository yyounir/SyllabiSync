import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsDesktop } from '@/hooks/useResponsive';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import {
  Bot,
  Sparkles,
  Send,
  X,
  RotateCcw,
  Copy,
  Check,
  GraduationCap,
} from 'lucide-react-native';
import {
  geminiChatService,
  ChatMessage,
  CourseContext,
} from '@/services/gemini-chat.service';
import { ClassItem, AcademicItem } from '@/types/database';

const CHAT_STORAGE_KEY = 'syllabisync_study_chat_messages_v1';

function generateMessageId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function getTimestampIso(): string {
  return new Date().toISOString();
}

interface StudyAssistantChatProps {
  activeClasses?: ClassItem[];
  upcomingItems?: AcademicItem[];
  initialSelectedClass?: ClassItem | null;
  /** Optional external control to trigger open */
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export function StudyAssistantChat({
  activeClasses = [],
  upcomingItems = [],
  initialSelectedClass = null,
  isOpenExternal,
  onCloseExternal,
}: StudyAssistantChatProps) {
  const isDesktop = useIsDesktop();

  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : isOpenInternal;

  const handleClose = () => {
    if (onCloseExternal) {
      onCloseExternal();
    } else {
      setIsOpenInternal(false);
    }
  };

  const handleOpen = () => {
    setIsOpenInternal(true);
  };

  const [selectedClassOverride, setSelectedClassOverride] = useState<ClassItem | null | undefined>(undefined);
  const selectedClass = selectedClassOverride !== undefined ? selectedClassOverride : initialSelectedClass;
  const handleSelectClass = (c: ClassItem | null) => setSelectedClassOverride(c);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollViewRef = useRef<any>(null);

  // Load chat history from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(CHAT_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setMessages(JSON.parse(raw));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
  }, []);

  // Save chat history
  const persistMessages = (newMsgs: ChatMessage[]) => {
    setMessages(newMsgs);
    AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(newMsgs)).catch(() => {});
  };

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd?.({ animated: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages, isOpen, loading]);

  const currentContext: CourseContext = {
    activeClasses,
    upcomingItems,
    selectedClass,
  };

  const quickPrompts = geminiChatService.getQuickPrompts(currentContext);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId('user'),
      role: 'user',
      text,
      timestamp: getTimestampIso(),
    };

    const updatedMessages = [...messages, userMessage];
    persistMessages(updatedMessages);
    setInputText('');
    setLoading(true);

    const { text: replyText, error } = await geminiChatService.sendMessage(
      updatedMessages,
      currentContext
    );

    setLoading(false);

    const modelMessage: ChatMessage = {
      id: generateMessageId('model'),
      role: 'model',
      text: error
        ? `⚠️ ${error}`
        : replyText,
      timestamp: getTimestampIso(),
    };

    persistMessages([...updatedMessages, modelMessage]);
  };

  const handleClearChat = async () => {
    setMessages([]);
    await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const handleCopyText = (id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Render markdown lines cleanly
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');

    return (
      <View style={styles.messageContentBlock}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Heading
          if (trimmed.startsWith('###')) {
            return (
              <Text key={idx} style={styles.markdownH3}>
                {trimmed.replace(/^###\s*/, '')}
              </Text>
            );
          }
          if (trimmed.startsWith('##')) {
            return (
              <Text key={idx} style={styles.markdownH2}>
                {trimmed.replace(/^##\s*/, '')}
              </Text>
            );
          }
          if (trimmed.startsWith('#')) {
            return (
              <Text key={idx} style={styles.markdownH1}>
                {trimmed.replace(/^#\s*/, '')}
              </Text>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>{trimmed.slice(2)}</Text>
              </View>
            );
          }

          // Numbered lists
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.numSymbol}>{numMatch[1]}.</Text>
                <Text style={styles.bulletText}>{numMatch[2]}</Text>
              </View>
            );
          }

          // Code block indicator / monospaced block
          if (trimmed.startsWith('```')) {
            return null;
          }

          // Empty line
          if (!trimmed) {
            return <View key={idx} style={{ height: 6 }} />;
          }

          return (
            <Text key={idx} style={styles.markdownParagraph}>
              {line}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <>
      {/* Floating Action Button Trigger */}
      {!isOpen && (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            isDesktop ? styles.fabDesktop : styles.fabMobile,
            pressed && styles.fabPressed,
          ]}
          onPress={handleOpen}
          accessibilityLabel="Open AI Study Assistant">
          <View style={styles.fabInner}>
            <Bot size={20} color="#FFFFFF" />
            <Text style={styles.fabLabel}>Study AI</Text>
            <View style={styles.fabPulseBadge} />
          </View>
        </Pressable>
      )}

      {/* Chat Window Modal / Floating Card */}
      {isOpen && (
        <Modal
          visible={isOpen}
          transparent={true}
          animationType={isDesktop ? 'fade' : 'slide'}
          onRequestClose={handleClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={isDesktop ? styles.desktopOverlay : styles.mobileOverlay}>
            <View
              style={[
                styles.chatCard,
                isDesktop ? styles.chatCardDesktop : styles.chatCardMobile,
              ]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconCircle}>
                    <Bot size={18} color={Colors.light.primary} />
                  </View>
                  <View>
                    <View style={styles.titleRow}>
                      <Text style={styles.headerTitle}>Study Assistant</Text>
                      <View style={styles.geminiBadge}>
                        <Sparkles size={10} color={Colors.light.primary} />
                        <Text style={styles.geminiBadgeText}>Gemini AI</Text>
                      </View>
                    </View>
                    <Text style={styles.headerSubtitle}>
                      {selectedClass
                        ? `Scoped to ${selectedClass.course_code}`
                        : 'Homework, exam prep & study coach'}
                    </Text>
                  </View>
                </View>

                <View style={styles.headerActions}>
                  {messages.length > 0 && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.headerActionBtn,
                        pressed && { opacity: 0.6 },
                      ]}
                      onPress={handleClearChat}
                      accessibilityLabel="Clear Conversation">
                      <RotateCcw size={15} color={Colors.light.textSecondary} />
                    </Pressable>
                  )}
                  <Pressable
                    style={({ pressed }) => [
                      styles.headerActionBtn,
                      pressed && { opacity: 0.6 },
                    ]}
                    onPress={handleClose}
                    accessibilityLabel="Close Chat">
                    <X size={18} color={Colors.light.textSecondary} />
                  </Pressable>
                </View>
              </View>

              {/* Course Context Filter Pills */}
              {activeClasses.length > 0 && (
                <View style={styles.courseFilterBar}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.courseFilterScroll}>
                    <Pressable
                      style={[
                        styles.coursePill,
                        !selectedClass && styles.coursePillActive,
                      ]}
                      onPress={() => handleSelectClass(null)}>
                      <Text
                        style={[
                          styles.coursePillText,
                          !selectedClass && styles.coursePillTextActive,
                        ]}>
                        All Courses
                      </Text>
                    </Pressable>
                    {activeClasses.map((c) => {
                      const isSelected = selectedClass?.id === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          style={[
                            styles.coursePill,
                            isSelected && {
                              backgroundColor: `${c.color || Colors.light.primary}20`,
                              borderColor: c.color || Colors.light.primary,
                            },
                          ]}
                          onPress={() => handleSelectClass(isSelected ? null : c)}>
                          <View
                            style={[
                              styles.coursePillDot,
                              { backgroundColor: c.color || Colors.light.primary },
                            ]}
                          />
                          <Text
                            style={[
                              styles.coursePillText,
                              isSelected && {
                                color: c.color || Colors.light.primary,
                                fontWeight: '700',
                              },
                            ]}>
                            {c.course_code}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Messages Scroll Area */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                keyboardShouldPersistTaps="handled">
                {messages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                      <GraduationCap size={28} color={Colors.light.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>How can I help you study today?</Text>
                    <Text style={styles.emptySubtitle}>
                      Ask me to explain homework problems, generate practice quizzes for upcoming
                      exams, or break down difficult course materials.
                    </Text>

                    {/* Quick Suggestion Chips */}
                    <View style={styles.quickPromptsList}>
                      {quickPrompts.map((qp, idx) => (
                        <Pressable
                          key={idx}
                          style={({ pressed }) => [
                            styles.quickPromptChip,
                            pressed && styles.quickPromptChipPressed,
                          ]}
                          onPress={() => handleSendMessage(qp.prompt)}>
                          <Text style={styles.quickPromptText}>{qp.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  messages.map((m) => {
                    const isUser = m.role === 'user';
                    return (
                      <View
                        key={m.id}
                        style={[
                          styles.messageRow,
                          isUser ? styles.messageRowUser : styles.messageRowModel,
                        ]}>
                        {!isUser && (
                          <View style={styles.modelAvatar}>
                            <Bot size={13} color="#FFFFFF" />
                          </View>
                        )}
                        <View
                          style={[
                            styles.messageBubble,
                            isUser ? styles.bubbleUser : styles.bubbleModel,
                          ]}>
                          {isUser ? (
                            <Text style={styles.userMessageText}>{m.text}</Text>
                          ) : (
                            renderMessageContent(m.text)
                          )}

                          {!isUser && (
                            <View style={styles.messageFooterRow}>
                              <Text style={styles.messageTime}>
                                {new Date(m.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Text>
                              <Pressable
                                onPress={() => handleCopyText(m.id, m.text)}
                                style={({ pressed }) => [
                                  styles.copyButton,
                                  pressed && { opacity: 0.6 },
                                ]}>
                                {copiedId === m.id ? (
                                  <Check size={12} color={Colors.light.success} />
                                ) : (
                                  <Copy size={12} color={Colors.light.textMuted} />
                                )}
                              </Pressable>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}

                {/* Loading indicator */}
                {loading && (
                  <View style={[styles.messageRow, styles.messageRowModel]}>
                    <View style={styles.modelAvatar}>
                      <Bot size={13} color="#FFFFFF" />
                    </View>
                    <View style={[styles.messageBubble, styles.bubbleModel, styles.loadingBubble]}>
                      <ActivityIndicator size="small" color={Colors.light.primary} />
                      <Text style={styles.loadingText}>Synthesizing explanation...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Input Footer */}
              <View style={styles.footer}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={
                      selectedClass
                        ? `Ask about ${selectedClass.course_code}...`
                        : 'Ask about assignments, exams, or concepts...'
                    }
                    placeholderTextColor={Colors.light.textMuted}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={1500}
                    onSubmitEditing={() => {
                      if (Platform.OS === 'web') {
                        handleSendMessage();
                      }
                    }}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.sendButton,
                      !inputText.trim() || loading ? styles.sendButtonDisabled : null,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => handleSendMessage()}
                    disabled={!inputText.trim() || loading}
                    accessibilityLabel="Send Message">
                    <Send size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
                <Text style={styles.disclaimerText}>
                  AI Study Assistant provides guidance and active recall for your coursework.
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  /* Floating Action Button */
  fab: {
    position: 'absolute',
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  fabDesktop: {
    bottom: 24,
    right: 28,
  },
  fabMobile: {
    bottom: Platform.OS === 'ios' ? 96 : 76,
    right: 18,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  fabPulseBadge: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },

  /* Overlays */
  desktopOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 24,
  },
  mobileOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },

  /* Chat Window Container */
  chatCard: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chatCardDesktop: {
    width: 430,
    height: 620,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  chatCardMobile: {
    width: '100%',
    height: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: '#FAFAFA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    ...Typography.sm,
    fontWeight: '700',
    color: Colors.light.text,
  },
  geminiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  geminiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  headerSubtitle: {
    ...Typography.xs,
    color: Colors.light.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerActionBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
  },

  /* Course Context Filter Bar */
  courseFilterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingVertical: 8,
  },
  courseFilterScroll: {
    paddingHorizontal: Spacing.three,
    gap: 6,
  },
  coursePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundElement,
  },
  coursePillActive: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  coursePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  coursePillText: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  coursePillTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },

  /* Messages Container */
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messagesContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtitle: {
    ...Typography.xs,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.four,
    maxWidth: 320,
  },
  quickPromptsList: {
    width: '100%',
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  quickPromptChipPressed: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  quickPromptText: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.text,
  },

  /* Message Bubbles */
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginVertical: 2,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowModel: {
    justifyContent: 'flex-start',
  },
  modelAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: Colors.light.primary,
    borderBottomRightRadius: 4,
  },
  bubbleModel: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  userMessageText: {
    ...Typography.sm,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  messageFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  messageTime: {
    fontSize: 10,
    color: Colors.light.textMuted,
  },
  copyButton: {
    padding: 3,
  },

  /* Loading State */
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    ...Typography.xs,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },

  /* Markdown Content Styling */
  messageContentBlock: {
    gap: 2,
  },
  markdownH1: {
    ...Typography.md,
    fontWeight: '800',
    color: Colors.light.text,
    marginVertical: 4,
  },
  markdownH2: {
    ...Typography.sm,
    fontWeight: '700',
    color: Colors.light.text,
    marginVertical: 3,
  },
  markdownH3: {
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 4,
    marginBottom: 2,
  },
  markdownParagraph: {
    ...Typography.sm,
    color: Colors.light.text,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 4,
    marginVertical: 1,
  },
  bulletSymbol: {
    ...Typography.sm,
    color: Colors.light.primary,
    fontWeight: '700',
    lineHeight: 20,
  },
  numSymbol: {
    ...Typography.xs,
    color: Colors.light.primary,
    fontWeight: '700',
    lineHeight: 20,
  },
  bulletText: {
    ...Typography.sm,
    color: Colors.light.text,
    flex: 1,
    lineHeight: 20,
  },

  /* Footer & Input */
  footer: {
    padding: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textInput: {
    flex: 1,
    ...Typography.sm,
    color: Colors.light.text,
    maxHeight: 90,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  disclaimerText: {
    fontSize: 10,
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
});
