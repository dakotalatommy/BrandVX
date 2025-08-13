import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Sparkles, ArrowRight, Star } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="animate-pulse bg-beauty-rose/20 rounded-full w-16 h-16"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-beauty-blush/20 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-beauty rounded-lg flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-beauty bg-clip-text text-transparent">
              Beauty Automation
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost"
              onClick={() => navigate('/auth?mode=signin')}
              className="text-foreground hover:bg-beauty-blush/20"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/auth?mode=signup')}
              className="bg-gradient-beauty hover:opacity-90 transition-opacity"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="secondary" className="bg-beauty-blush text-beauty-rose px-4 py-2">
            ✨ Trusted by 2,500+ beauty professionals
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold">
            Save{' '}
            <span className="bg-gradient-beauty bg-clip-text text-transparent">
              15+ Hours
            </span>{' '}
            Per Week
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See Your Results in 30 Seconds. Automate social media, client communication, 
            and admin tasks for your beauty business.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-gradient-beauty hover:opacity-90 transition-opacity px-8 py-6 text-lg"
            >
              Start Free Analysis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-beauty-rose text-beauty-rose hover:bg-beauty-blush px-8 py-6 text-lg"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What You'll Automate</h2>
            <p className="text-muted-foreground">
              Stop spending hours on tasks that can run themselves
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-beauty border-beauty-blush/20 hover:shadow-soft transition-shadow">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-beauty-blush rounded-lg flex items-center justify-center mx-auto">
                  <TrendingUp className="w-6 h-6 text-beauty-rose" />
                </div>
                <h3 className="text-xl font-semibold">Social Media Posting</h3>
                <p className="text-muted-foreground">
                  Auto-schedule posts, stories, and engagement across Instagram and Facebook. 
                  Save 8-12 hours per week.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-beauty border-beauty-blush/20 hover:shadow-soft transition-shadow">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-beauty-blush rounded-lg flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6 text-beauty-rose" />
                </div>
                <h3 className="text-xl font-semibold">Client Communication</h3>
                <p className="text-muted-foreground">
                  Automated appointment reminders, follow-ups, and booking confirmations. 
                  Save 4-6 hours per week.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-beauty border-beauty-blush/20 hover:shadow-soft transition-shadow">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-beauty-blush rounded-lg flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6 text-beauty-rose" />
                </div>
                <h3 className="text-xl font-semibold">Admin & Analytics</h3>
                <p className="text-muted-foreground">
                  Automated reporting, client data organization, and growth insights. 
                  Save 3-5 hours per week.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-4 py-16 bg-card/50">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">Loved by Beauty Professionals</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-soft border-beauty-blush/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-beauty-gold text-beauty-gold" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "I saved 18 hours last week! Now I can focus on my clients instead of 
                  constantly posting on social media."
                </p>
                <div className="text-sm">
                  <p className="font-semibold">Sarah Chen</p>
                  <p className="text-muted-foreground">Glow Beauty Studio</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-beauty-blush/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-beauty-gold text-beauty-gold" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "My clients love the automated reminders and I love having my 
                  evenings back. This is a game-changer!"
                </p>
                <div className="text-sm">
                  <p className="font-semibold">Maria Rodriguez</p>
                  <p className="text-muted-foreground">Radiant Lash Lounge</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">
            Ready to Get Your Time Back?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of beauty professionals saving 15+ hours per week
          </p>
          
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-gradient-beauty hover:opacity-90 transition-opacity px-12 py-6 text-xl"
          >
            Start Free Analysis Now
            <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
          
          <p className="text-sm text-muted-foreground">
            ✓ Free 7-day trial • ✓ No credit card required • ✓ Setup in 30 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card/80 backdrop-blur-sm border-t border-beauty-blush/20 px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground">
            © 2024 Beauty Automation. Helping beauty professionals save time and grow their business.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
