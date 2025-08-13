import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (mode === 'signup') {
        result = await signUp(email, password, businessName, fullName);
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        });
      } else if (mode === 'signup') {
        if (result.needsConfirmation) {
          toast({
            title: "Check Your Email",
            description: "Please check your email and click the confirmation link to activate your account.",
          });
        } else {
          toast({
            title: "Welcome to BrandVX!",
            description: "Account created successfully. Redirecting to your dashboard...",
          });
        }
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-beauty border-beauty-blush/20">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl bg-gradient-beauty bg-clip-text text-transparent">
          {mode === 'signup' ? 'Start Your Free Analysis' : 'Welcome Back'}
        </CardTitle>
        <CardDescription>
          {mode === 'signup' 
            ? 'See how much time you can save in 30 seconds'
            : 'Sign in to your account'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-gradient-beauty hover:opacity-90 transition-opacity"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {mode === 'signup' ? 'Start Free Analysis' : 'Sign In'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onToggleMode} className="text-beauty-rose">
            {mode === 'signup' 
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}