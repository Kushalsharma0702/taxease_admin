import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';
import { Eye, EyeOff, Loader2, Building2, User } from 'lucide-react';

const PORTALS = {
  personal: {
    label: 'Personal',
    description: 'T1 personal tax returns',
    url: 'https://admin.diamondaccounts.ca',
    icon: User,
    color: 'from-blue-600 to-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    ring: 'ring-blue-500',
  },
  business: {
    label: 'Business',
    description: 'Corporate & T2 tax returns',
    url: 'https://adminbusiness.diamondaccounts.ca',
    icon: Building2,
    color: 'from-emerald-600 to-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    ring: 'ring-emerald-500',
  },
} as const;

type PortalType = keyof typeof PORTALS;

/** Detect which portal we're currently on from the hostname. */
function detectCurrentPortal(): PortalType {
  const host = window.location.hostname;
  if (host.includes('adminbusiness')) return 'business';
  return 'personal';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [portal, setPortal] = useState<PortalType>(detectCurrentPortal());
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handlePortalSwitch = (target: PortalType) => {
    if (target === portal) return;

    const targetUrl = PORTALS[target].url;
    const currentHost = window.location.hostname;

    // If we're already on the right domain, just update state
    if (
      (target === 'personal' && !currentHost.includes('adminbusiness')) ||
      (target === 'business' && currentHost.includes('adminbusiness'))
    ) {
      setPortal(target);
      return;
    }

    // Navigate to the other portal's login page
    window.location.href = `${targetUrl}/login`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        toast({
          title: 'Welcome back!',
          description: `Signed in to the ${PORTALS[portal].label} dashboard.`,
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Login failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const active = PORTALS[portal];
  const ActiveIcon = active.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 animate-fade-in">

        {/* ── Portal toggle ────────────────────────────────────────────── */}
        <div className="flex rounded-xl overflow-hidden border border-border shadow-sm bg-card">
          {(Object.keys(PORTALS) as PortalType[]).map((key) => {
            const p = PORTALS[key];
            const Icon = p.icon;
            const isActive = portal === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handlePortalSwitch(key)}
                className={[
                  'flex-1 flex flex-col items-center gap-1 py-3 px-4 text-sm font-medium transition-all duration-200',
                  isActive
                    ? `bg-gradient-to-br ${p.color} text-white`
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                <span>{p.label}</span>
                <span className={[
                  'text-[10px] font-normal px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-white/20 text-white' : p.badge,
                ].join(' ')}>
                  {p.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Login card ───────────────────────────────────────────────── */}
        <Card className={`transition-all duration-300 ring-2 ${active.ring}`}>
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${active.color} shadow-md`}>
                <img src={logo} alt="Diamond Accounts" className="h-10 w-10" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Diamond Accounts
            </CardTitle>
            <CardDescription className="flex items-center justify-center gap-1.5">
              <ActiveIcon className="h-3.5 w-3.5" />
              <span>{active.label} Admin Portal</span>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@diamondaccounts.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="transition-all duration-200 focus:scale-[1.01]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="transition-all duration-200 focus:scale-[1.01]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className={`w-full bg-gradient-to-br ${active.color} hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-white border-0`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  `Sign in to ${active.label} Portal`
                )}
              </Button>
            </form>

            {/* Quick switch hint */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {portal === 'personal' ? (
                <>Looking for business filing?{' '}
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('business')}
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    Switch to Business Portal
                  </button>
                </>
              ) : (
                <>Looking for personal T1 filing?{' '}
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('personal')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Switch to Personal Portal
                  </button>
                </>
              )}
            </p>

            {import.meta.env.DEV && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs">
                <p className="font-medium mb-1">Dev credentials:</p>
                <p className="text-muted-foreground">superadmin@taxease.ca / demo123</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portal URL indicator */}
        <p className="text-center text-[11px] text-muted-foreground">
          {active.url.replace('https://', '')}
        </p>
      </div>
    </div>
  );
}
