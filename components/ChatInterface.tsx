
import React, { useState, useRef, useEffect } from 'react';
import { Message, UserLocation } from '../types';
import { processConversation, analyzeImage } from '../geminiService';
import PlaceCard from './PlaceCard';
import ComparisonTable from './ComparisonTable';

const STORAGE_KEY = 'vibescout_chat_history';

const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('chat');
    
    let initialMessages: Message[] = [];

    if (sharedData) {
      try {
        const decoded = JSON.parse(atob(sharedData));
        if (Array.isArray(decoded)) {
          initialMessages = decoded.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error("Failed to restore shared chat", e);
      }
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const decoded = JSON.parse(saved);
          if (Array.isArray(decoded)) {
            initialMessages = decoded.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }));
          }
        } catch (e) {
          console.error("Failed to restore saved chat", e);
        }
      }
    }

    if (!Array.isArray(initialMessages) || initialMessages.length === 0) {
      initialMessages = [{
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm VibeScout. You can tell me what you're looking for, or even upload a photo of a place you love, and I'll find where it is and what its vibe is!",
        timestamp: new Date()
      }];
    }

    setMessages(initialMessages);
    setIsInitialized(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.warn("Location permission denied", err)
      );
    }
  }, []);

  useEffect(() => {
    if (isInitialized && Array.isArray(messages) && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear your chat history?")) {
      const resetMessages: Message[] = [{
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: "Chat cleared. What can I help you find now?",
        timestamp: new Date()
      }];
      setMessages(resetMessages);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleShareLink = () => {
    try {
      if (!Array.isArray(messages)) return;
      const dataToShare = messages.map(({ role, content, timestamp, image }) => ({ role, content, timestamp, image }));
      const encoded = btoa(JSON.stringify(dataToShare));
      const url = new URL(window.location.href);
      url.searchParams.set('chat', encoded);
      navigator.clipboard.writeText(url.toString());
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) { console.error("Sharing failed", e); }
  };

  const handleScreenshot = async () => {
    if (!chatContainerRef.current) return;
    const windowAny = window as any;
    if (typeof windowAny.html2canvas !== 'function') {
      console.error("html2canvas not loaded");
      return;
    }
    const canvas = await windowAny.html2canvas(chatContainerRef.current, {
      backgroundColor: '#f8fafc',
      scale: 2,
      useCORS: true,
      scrollY: -window.scrollY,
      onclone: (clonedDoc: Document) => {
        const el = clonedDoc.getElementById('chat-scroll-area');
        if (el) { el.style.height = 'auto'; el.style.overflow = 'visible'; }
      }
    });
    const link = document.createElement('a');
    link.download = `VibeScout-Chat-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage || undefined,
      timestamp: new Date()
    };

    const newMessages = [...(Array.isArray(messages) ? messages : []), userMessage];
    setMessages(newMessages);
    const currentInput = input;
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      let response;
      let groundingLinks = undefined;

      if (currentImage) {
        response = await analyzeImage(currentImage, currentInput, location);
      } else {
        const res = await processConversation(
          newMessages.map(m => ({ role: m.role, content: m.content })),
          location
        );
        response = res;
        groundingLinks = res.groundingLinks;
      }

      let suggestions = undefined;
      let comparison = undefined;
      let cleanContent = response.text || "";

      const jsonMatch = cleanContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          suggestions = parsed.suggestions;
          comparison = parsed.comparison;
          cleanContent = cleanContent.replace(jsonMatch[0], '').trim();
        } catch (e) { console.error("Failed to parse response JSON", e); }
      }

      setMessages(prev => [...(Array.isArray(prev) ? prev : []), {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanContent,
        suggestions,
        comparison,
        groundingLinks,
        timestamp: new Date()
      }]);
    } catch (err) {
      setMessages(prev => [...(Array.isArray(prev) ? prev : []), {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I hit a snag while scouting. Could you try that again?",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto px-4 relative">
      <div className="absolute top-0 right-4 z-10 flex items-center gap-2">
        <button onClick={handleClearChat} className="p-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm hover:bg-rose-50 hover:border-rose-200 transition-all text-slate-500 hover:text-rose-600" title="Clear Chat History">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
        <button onClick={handleScreenshot} className="p-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-900" title="Download Chat Screenshot">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
        <button onClick={handleShareLink} className="p-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-900 flex items-center gap-2" title="Copy Share Link">
          {copyFeedback ? <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Copied!</span> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>}
        </button>
      </div>

      <div id="chat-scroll-area" ref={chatContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-6 pb-24 scroll-smooth no-scrollbar pt-10">
        {Array.isArray(messages) && messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl ${m.role === 'user' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-800 shadow-sm'}`}>
              {m.image && (
                <div className="p-2">
                  <img src={m.image} alt="User upload" className="rounded-xl max-h-64 w-full object-cover shadow-inner" />
                </div>
              )}
              <div className="px-5 py-3">
                <p className="text-base leading-relaxed whitespace-pre-wrap">{m.content}</p>
                
                {/* Defensive check for groundingLinks being an array */}
                {Array.isArray(m.groundingLinks) && m.groundingLinks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {m.groundingLinks.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[11px] flex items-center gap-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200 font-medium"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {link.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {Array.isArray(m.suggestions) && m.suggestions.length > 0 && (
              <div className="w-full mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {m.suggestions.map((p, idx) => <PlaceCard key={idx} place={p} />)}
              </div>
            )}
            {m.comparison && <div className="w-full"><ComparisonTable matrix={m.comparison} /></div>}
            <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest px-1">
              {m.timestamp && m.timestamp instanceof Date ? m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-400 font-medium animate-pulse">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
            <span className="text-xs uppercase tracking-widest ml-2">Analyzing perspective...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
        <div className="max-w-4xl mx-auto">
          {selectedImage && (
            <div className="mb-2 p-2 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center gap-3 w-fit animate-in fade-in slide-in-from-bottom-2">
              <div className="relative">
                <img src={selectedImage} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Image ready for analysis</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1 group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedImage ? "Add context about this photo..." : "Ask VibeScout or upload a photo..."}
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-6 pr-12 shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors p-2"
                title="Upload Photo"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 disabled:bg-slate-200 transition-all shadow-xl active:scale-95 flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-3 uppercase tracking-[0.2em] font-medium">
            Gemini 3 Pro Vision &bull; Google Maps Grounded
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
