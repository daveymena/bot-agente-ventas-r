import { useState, useEffect, useRef } from "react";
import { useListConversations, useGetConversationMessages, useSendMessage } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Search, Send, Bot, User, CheckCircle2, Clock, XCircle, BotOff, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function Conversations() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputText, setInputText] = useState("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: convData, isLoading: loadingConv } = useListConversations(
    { limit: 50 }, 
    { query: { refetchInterval: 5000 } }
  );

  const { data: messagesData, isLoading: loadingMsgs } = useGetConversationMessages(
    activeId!,
    { limit: 100 },
    { query: { enabled: !!activeId, refetchInterval: 3000 } }
  );

  const sendMutation = useSendMessage({
    mutation: {
      onSuccess: () => {
        setInputText("");
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${activeId}/messages`] });
      }
    }
  });

  const filteredConversations = convData?.conversations.filter(c => 
    c.contactPhone.includes(searchTerm) || (c.contactName?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  ) || [];

  const activeConversation = convData?.conversations.find(c => c.id === activeId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeId) return;
    sendMutation.mutate({ id: activeId, data: { content: inputText } });
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden shadow-2xl shadow-black/20">
      {/* Left Sidebar - Chat List */}
      <div className="w-80 flex-shrink-0 border-r border-border/50 flex flex-col bg-card/30">
        <div className="p-4 border-b border-border/50">
          <h2 className="font-display font-bold text-xl mb-4">Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search chats..." 
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/30"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="p-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-spin" /> Loading chats...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveId(chat.id)}
                className={`w-full text-left p-4 border-b border-border/20 transition-all duration-200 hover:bg-secondary/50 flex items-start gap-3 ${activeId === chat.id ? 'bg-secondary/80 border-l-2 border-l-primary' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center border border-border/50">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm truncate text-foreground">
                      {chat.contactName || chat.contactPhone}
                    </h3>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {chat.lastMessageAt ? format(new Date(chat.lastMessageAt), 'HH:mm') : ''}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">{chat.lastMessage || 'No messages yet'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {chat.aiHandled && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        <Bot className="w-3 h-3" /> AI Active
                      </span>
                    )}
                    {chat.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Content - Chat History */}
      <div className="flex-1 flex flex-col relative bg-background/20">
        {activeId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/50 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border/50">
                  <User className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{activeConversation?.contactName || activeConversation?.contactPhone}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{activeConversation?.contactPhone}</p>
                </div>
              </div>
              <div>
                 {activeConversation?.aiHandled ? (
                   <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-full font-medium border border-primary/20">
                     <Bot className="w-4 h-4" /> AI is handling this chat
                   </div>
                 ) : (
                   <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-full font-medium border border-border/50">
                     <BotOff className="w-4 h-4" /> Manual Mode
                   </div>
                 )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('/images/auth-bg.png')] bg-cover bg-center bg-no-repeat bg-fixed bg-opacity-5">
              <div className="absolute inset-0 bg-background/80 pointer-events-none z-0" />
              
              <div className="relative z-10 space-y-6">
                {loadingMsgs ? (
                  <div className="flex justify-center p-8"><Clock className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : messagesData?.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                    <p>No messages yet. Send one to start!</p>
                  </div>
                ) : (
                  messagesData?.messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[70%] rounded-2xl px-4 py-3 shadow-md relative group
                        ${msg.direction === 'outbound' 
                          ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                          : 'bg-card border border-border/50 text-foreground rounded-tl-sm'}
                      `}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        
                        <div className={`flex items-center justify-end gap-1 mt-1.5 ${msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {msg.aiGenerated && msg.direction === 'outbound' && <Bot className="w-3 h-3 mr-1" />}
                          <span className="text-[10px]">{format(new Date(msg.timestamp), 'HH:mm')}</span>
                          {msg.direction === 'outbound' && (
                            <CheckCircle2 className={`w-3 h-3 ${msg.status === 'read' ? 'text-blue-300' : ''}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card/80 backdrop-blur-xl border-t border-border/50 z-10">
              <form onSubmit={handleSend} className="flex items-center gap-3 max-w-4xl mx-auto">
                <Input 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-background border-border/50 rounded-full px-6 py-6 focus-visible:ring-primary/30"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!inputText.trim() || sendMutation.isPending}
                  className="h-12 w-12 rounded-full shadow-lg shadow-primary/25 hover:scale-105 transition-transform"
                >
                  <Send className="w-5 h-5 ml-1" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-[url('/images/auth-bg.png')] bg-cover bg-center">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-0" />
            <div className="relative z-10 text-center">
              <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6 shadow-2xl border border-border/50">
                <MessageSquare className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">Select a conversation</h2>
              <p className="mt-2 text-sm max-w-md mx-auto">Choose a contact from the sidebar to view history or start a new message.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
