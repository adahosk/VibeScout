
import React, { useState, useRef, useEffect } from 'react';
import { Message, UserLocation } from '../types';
import { processConversation } from '../geminiService';
import PlaceCard from './PlaceCard';
import ComparisonTable from './ComparisonTable';

const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm VibeScout. Tell me what you're in the mood for. I focus on the 'vibe' of a place—whether you need a quiet corner for work or a romantic spot for a date.",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.warn("Location permission denied", err)
      );
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await processConversation(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        location
      );

      // Extract JSON if present
      let suggestions = undefined;
      let comparison = undefined;
      let cleanContent = response.text;

      const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          suggestions = parsed.suggestions;
          comparison = parsed.comparison;
          cleanContent = response.text.replace(jsonMatch[0], '').trim();
        } catch (e) {
          console.error("Failed to parse response JSON", e);
        }
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanContent,
        suggestions,
        comparison,
        timestamp: new Date()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I hit a snag while scouting. Could you try that again?",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto px-4">
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-24 scroll-smooth">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
              m.role === 'user' 
                ? 'bg-slate-900 text-white shadow-lg' 
                : 'bg-white border border-slate-100 text-slate-800 shadow-sm'
            }`}>
              <p className="text-base leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
            
            {m.suggestions && (
              <div className="w-full mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {m.suggestions.map((p, idx) => (
                  <PlaceCard key={idx} place={p} />
                ))}
              </div>
            )}

            {m.comparison && (
              <div className="w-full">
                <ComparisonTable matrix={m.comparison} />
              </div>
            )}
            
            <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest px-1">
              {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-400 font-medium animate-pulse">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
            <span className="text-xs uppercase tracking-widest ml-2">Scouting vibes...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., I want a quiet Italian spot for a date nearby"
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-6 pr-16 shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 transition-all text-slate-800"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white p-2.5 rounded-xl hover:bg-slate-800 disabled:bg-slate-200 transition-all shadow-md active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-3 uppercase tracking-[0.2em] font-medium">
            AI-Powered Vibe Analysis &bull; Google Maps Grounded
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
