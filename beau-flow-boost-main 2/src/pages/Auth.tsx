import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');

  useEffect(() => {
    const paramMode = searchParams.get('mode');
    if (paramMode === 'signin' || paramMode === 'signup') {
      setMode(paramMode);
    }
  }, [searchParams]);

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Hero content */}
        <div className="text-center lg:text-left space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground">
              Save{' '}
              <span className="bg-gradient-beauty bg-clip-text text-transparent">
                15+ Hours
              </span>{' '}
              Per Week
            </h1>
            <p className="text-xl text-muted-foreground">
              See Your Results in 30 Seconds
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 shadow-soft">
              <h3 className="font-semibold text-beauty-rose mb-2">Automate Your Beauty Business</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✨ Social media posting & scheduling</li>
                <li>💬 Client communication & follow-ups</li>
                <li>📅 Appointment reminders & bookings</li>
                <li>📊 Analytics & growth insights</li>
              </ul>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 shadow-soft">
              <p className="text-sm font-medium text-beauty-rose">
                Join 2,500+ beauty professionals saving time daily
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="flex justify-center lg:justify-end">
          <AuthForm mode={mode} onToggleMode={toggleMode} />
        </div>
      </div>
    </div>
  );
}