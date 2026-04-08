import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Send, 
  X, 
  Minimize2,
  Bot,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, ChatMessage } from '../types';
import { aiService } from '../services/aiService';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAdvisorProps {
  data: AppState;
}

export default function AIAdvisor({ data }: AIAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.currentUser as any;
    if (!user || user.isMock) {
      // For demo/mock users, just show the initial message
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: '¡Hola! 👋 Soy tu socio de ModaFlow. ¿Qué tal va todo hoy? ¿En qué te puedo echar una mano con tu marca?',
          timestamp: new Date()
        }
      ]);
      return;
    }

    const unsubscribe = firebaseService.subscribeChatMessages((chatMsgs) => {
      if (chatMsgs.length === 0) {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: '¡Hola! 👋 Soy tu socio de ModaFlow. ¿Qué tal va todo hoy? ¿En qué te puedo echar una mano con tu marca?',
            timestamp: new Date()
          }
        ]);
      } else {
        setMessages(chatMsgs.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const user = auth.currentUser as any;
    const userMsgContent = input.trim();
    const userMsgId = Date.now().toString();
    const timestamp = new Date();

    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: userMsgContent,
      timestamp
    };

    // Optimistically add to UI if not logged in or demo
    if (!user || user.isMock) {
      setMessages(prev => [...prev, userMsg]);
    } else {
      // Save to Firestore
      await firebaseService.addChatMessage({
        id: userMsgId,
        role: 'user',
        content: userMsgContent,
        timestamp: timestamp.toISOString(),
        ownerUid: user.uid
      });
    }

    setInput('');
    setIsLoading(true);

    try {
      // Map current messages to ChatMessage format for the AI service
      const history: ChatMessage[] = messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        ownerUid: user?.uid || ''
      }));

      const advice = await aiService.getAdvice(data, userMsgContent, history);
      
      const assistantMsgId = (Date.now() + 1).toString();
      const assistantTimestamp = new Date();

      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: advice,
        timestamp: assistantTimestamp
      };

      if (!user || user.isMock) {
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        // Save to Firestore
        await firebaseService.addChatMessage({
          id: assistantMsgId,
          role: 'assistant',
          content: advice,
          timestamp: assistantTimestamp.toISOString(),
          ownerUid: user.uid
        });
      }
    } catch (error) {
      console.error("Error in AI Advisor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    const user = auth.currentUser as any;
    if (!user || user.isMock) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: '¡Hola! 👋 Soy tu socio de ModaFlow. ¿Qué tal va todo hoy? ¿En qué te puedo echar una mano con tu marca?',
          timestamp: new Date()
        }
      ]);
      return;
    }

    try {
      await firebaseService.clearChatHistory();
      toast.success('Historial de chat borrado');
    } catch (error) {
      toast.error('Error al borrar el historial');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[100] w-12 h-12 md:w-16 md:h-16 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.4)] border-2 border-white/20 transition-all",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-black" />
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            className="fixed bottom-6 right-6 z-[110] w-[calc(100vw-48px)] sm:w-[400px] h-[500px] md:h-[600px] bg-black border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 md:p-5 bg-orange-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="font-black text-black text-[16px] md:text-lg leading-none">ASESOR IA</h3>
                  <p className="text-black/60 text-[13px] md:text-[14px] font-bold mt-1">Online • ModaFlow Expert</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleClearChat}
                  title="Borrar historial"
                  className="p-2 hover:bg-black/10 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-black" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-black/10 rounded-full transition-colors"
                >
                  <Minimize2 className="w-5 h-5 text-black" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar bg-gradient-to-b from-black to-white/[0.02]"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                    msg.role === 'user' ? "bg-white/10" : "bg-orange-500/20"
                  )}>
                    {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-white/60" /> : <Bot className="w-4 h-4 text-orange-500" />}
                  </div>
                  <div className={cn(
                    "p-3 md:p-4 rounded-2xl text-[15px] md:text-[15px] leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-white/5 border border-white/5 text-white rounded-tr-none" 
                      : "bg-orange-500/5 border border-orange-500/10 text-white/90 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 mr-auto max-w-[85%]">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <Bot className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="p-3 md:p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                    <span className="text-[14px] text-white/40 font-medium">Pensando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 md:p-6 border-t border-white/5 bg-black">
              <div className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 md:py-4 pl-4 pr-12 focus:outline-none focus:border-orange-500/50 text-[15px] md:text-[16px] transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "absolute right-2 p-2 md:p-2.5 bg-orange-500 text-black rounded-xl transition-all shadow-lg shadow-orange-500/20",
                    (!input.trim() || isLoading) && "opacity-50 grayscale cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
              <p className="text-center text-[11px] md:text-[12px] text-white/20 mt-3 font-medium uppercase tracking-widest">
                Impulsado por Gemini AI • ModaFlow
              </p>
              {!data.settings.geminiApiKey && !data.settings.openaiApiKey && (
                <p className="text-center text-[10px] text-orange-500/40 mt-1 font-medium">
                  Usa tus propias llaves en <span className="underline cursor-pointer hover:text-orange-500" onClick={() => {
                    // We need a way to change the view from here. 
                    // Since we don't have a global state for activeView, 
                    // we might need to pass a setter or use a custom event.
                    window.dispatchEvent(new CustomEvent('change-view', { detail: 'settings' }));
                  }}>Configuración</span> para mejores consejos.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
