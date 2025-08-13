import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { VoiceInterface } from '@/components/voice/VoiceInterface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Bot, User, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  agentType?: string;
  events?: any[];
  nextActions?: string[];
}

interface AgentResponse {
  type: string;
  text: string;
  data?: any;
  next_actions?: string[];
  events?: any[];
}

export function BrandVXChat() {
  const { user } = useAuth();
  const [showVoice, setShowVoice] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'agent',
      content: "Hi! I'm your BrandVX AI assistant. I can help you with appointments, treatments, content creation, inventory management, and business insights. What would you like to work on today?",
      timestamp: new Date(),
      agentType: 'welcome'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the master agent orchestrator
      const { data, error } = await supabase.functions.invoke('master-agent-orchestrator', {
        body: {
          intent: {
            type: 'general',
            user_id: user.id,
            payload: {
              message: input.trim(),
              context: 'chat_interface'
            }
          },
          temporalContext: {
            session_id: `chat_${Date.now()}`,
            previous_messages: messages.slice(-5).map(m => ({
              role: m.type,
              content: m.content
            }))
          }
        }
      });

      if (error) {
        throw error;
      }

      const response: AgentResponse = data;
      
      const agentMessage: Message = {
        id: Date.now().toString(),
        type: 'agent',
        content: response.text,
        timestamp: new Date(),
        agentType: response.type,
        events: response.events,
        nextActions: response.next_actions
      };

      setMessages(prev => [...prev, agentMessage]);

      // Show success toast for certain agent types
      if (response.type === 'result' || response.type === 'plan') {
        toast.success('Task completed successfully');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'agent',
        content: "I'm sorry, I encountered an error. Please try again or rephrase your request.",
        timestamp: new Date(),
        agentType: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getAgentTypeColor = (agentType?: string) => {
    switch (agentType) {
      case 'appointment': return 'bg-blue-500/10 text-blue-600';
      case 'treatment': return 'bg-purple-500/10 text-purple-600';
      case 'content': return 'bg-green-500/10 text-green-600';
      case 'inventory': return 'bg-orange-500/10 text-orange-600';
      case 'admin': return 'bg-red-500/10 text-red-600';
      case 'plan': return 'bg-yellow-500/10 text-yellow-600';
      case 'result': return 'bg-emerald-500/10 text-emerald-600';
      case 'error': return 'bg-red-500/10 text-red-600';
      default: return 'bg-primary/10 text-primary';
    }
  };

  const getAgentIcon = (agentType?: string) => {
    switch (agentType) {
      case 'plan':
      case 'result':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">BrandVX Agent</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Powered by GPT-5 • Multi-specialist AI
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVoice(!showVoice)}
              className="flex items-center gap-2"
            >
              <Bot className="h-4 w-4" />
              {showVoice ? 'Hide Voice' : 'Voice Chat'}
            </Button>
          </div>
        </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'agent' && (
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getAgentTypeColor(message.agentType)}`}>
                    {getAgentIcon(message.agentType)}
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {message.agentType && message.type === 'agent' && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={`text-xs ${getAgentTypeColor(message.agentType)}`}>
                        {message.agentType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {message.nextActions && message.nextActions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Suggested actions:</p>
                      {message.nextActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="mr-2 text-xs"
                          onClick={() => setInput(action)}
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
                <div className="max-w-[80%]">
                  <div className="rounded-lg px-3 py-2 bg-muted">
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about appointments, treatments, content, inventory, or business insights..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    {showVoice && (
      <div className="max-w-md mx-auto">
        <VoiceInterface />
      </div>
    )}
  </div>
  );
}