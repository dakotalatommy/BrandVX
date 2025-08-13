import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { toast } from 'sonner';

interface VoiceInterfaceProps {
  onSpeakingChange?: (speaking: boolean) => void;
  onTranscriptChange?: (transcript: string) => void;
}

export function VoiceInterface({ onSpeakingChange, onTranscriptChange }: VoiceInterfaceProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const chatRef = useRef<RealtimeChat | null>(null);

  const handleMessage = (event: any) => {
    console.log('Received message:', event);
    
    // Handle different event types
    if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
      onSpeakingChange?.(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      setCurrentTranscript(event.transcript || '');
      onTranscriptChange?.(event.transcript || '');
    } else if (event.type === 'response.text.delta') {
      setCurrentTranscript(prev => prev + (event.delta || ''));
      onTranscriptChange?.(currentTranscript + (event.delta || ''));
    }
  };

  const startConversation = async () => {
    setIsConnecting(true);
    try {
      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init();
      setIsConnected(true);
      setIsConnecting(false);
      
      toast.success('Voice chat connected! Start speaking.');
    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsConnecting(false);
      toast.error('Failed to connect voice chat. Please try again.');
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
    onSpeakingChange?.(false);
    onTranscriptChange?.('');
    toast.info('Voice chat disconnected');
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${
              isConnected 
                ? isSpeaking 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-green-500'
                : 'bg-gray-300'
            }`}>
              {isConnected ? (
                isSpeaking ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />
              ) : (
                <Phone className="h-6 w-6 text-gray-600" />
              )}
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold">Voice Assistant</h3>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>

          {currentTranscript && (
            <div className="w-full p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Live Transcript:</p>
              <p className="text-sm">{currentTranscript}</p>
            </div>
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              <Button 
                onClick={startConversation}
                disabled={isConnecting}
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {isConnecting ? 'Connecting...' : 'Start Voice Chat'}
              </Button>
            ) : (
              <Button 
                onClick={endConversation}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <PhoneOff className="h-4 w-4" />
                End Call
              </Button>
            )}
          </div>

          {isConnected && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {isSpeaking 
                  ? '🎙️ AI is speaking...' 
                  : '👂 Listening for your voice...'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}