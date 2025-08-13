import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Users, 
  Settings, 
  Shield, 
  LogOut,
  Menu,
  X,
  Zap,
  BarChart3
} from "lucide-react";

const Navigation = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('business_name, role')
        .eq('id', user?.id)
        .maybeSingle();

      if (data) {
        // Set hierarchy based on role
        const enrichedProfile = {
          ...data,
          hierarchy_level: data.role === 'admin' ? 'admin' : 'owner'
        };
        setProfile(enrichedProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const navItems = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/dashboard", icon: BarChart3, label: "Dashboard" },
    { path: "/contacts", icon: Users, label: "Contacts" },
    { path: "/agent", icon: Zap, label: "Agent" },
    { path: "/integrations", icon: Settings, label: "Integrations" },
  ];

  // Add admin panel for owners and admins
  if (profile?.hierarchy_level === 'owner' || profile?.hierarchy_level === 'admin') {
    navItems.push({ path: "/admin", icon: Shield, label: "Admin" });
  }

  const isActive = (path: string) => location.pathname === path;

  const getHierarchyBadge = () => {
    if (!profile?.hierarchy_level) return null;
    
    const colors = {
      owner: 'bg-gradient-to-r from-amber-500 to-orange-500',
      admin: 'bg-gradient-to-r from-blue-500 to-indigo-500',
      operator: 'bg-gradient-to-r from-green-500 to-emerald-500',
      viewer: 'bg-gradient-to-r from-gray-500 to-slate-500'
    };

    return (
      <Badge className={`text-white text-xs ${colors[profile.hierarchy_level as keyof typeof colors]}`}>
        {profile.hierarchy_level.toUpperCase()}
      </Badge>
    );
  };

  if (!user) return null;

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white/90 backdrop-blur-sm"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white/95 backdrop-blur-sm border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">BrandVX</h1>
            </div>
            {profile?.business_name && (
              <p className="text-sm text-muted-foreground">{profile.business_name}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {getHierarchyBadge()}
              {profile?.admin_role && (
                <Badge variant="outline" className="text-xs">
                  {profile.admin_role.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${isActive(item.path) 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={signOut}
              className="w-full justify-start text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation;