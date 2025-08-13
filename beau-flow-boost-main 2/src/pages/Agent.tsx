import { BrandVXChat } from '@/components/agent/BrandVXChat';

export default function Agent() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">BrandVX Agent</h1>
        <p className="text-muted-foreground">
          Chat with your AI business assistant powered by GPT-5 intelligence
        </p>
      </div>
      
      <div className="max-w-4xl">
        <BrandVXChat />
      </div>
    </div>
  );
}