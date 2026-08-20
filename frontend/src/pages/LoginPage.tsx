import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ROUTES } from '@/constants';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';
import { getErrorMessage } from '@/utils';
import logo from '@/assets/logo.png';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: 10 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>
);

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthForm = z.infer<typeof authSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<AuthForm>({
    resolver: zodResolver(authSchema)
  });

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const loginResult = await authService.loginWithFirebase(idToken);
      setAuth(loginResult.user, loginResult.profile, loginResult.tokens);
      toast.success('Welcome back!');
      if (!loginResult.user.profileCompleted) {
        navigate(ROUTES.PROFILE_SETUP, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Google sign-in failed');
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (data: AuthForm) => {
    setLoading(true);
    try {
      let result;
      if (mode === 'signup') {
        result = await authService.register(data.email, data.password);
        toast.success('Account created successfully!');
      } else {
        result = await authService.login(data.email, data.password);
        toast.success('Welcome back!');
      }
      setAuth(result.user, result.profile, result.tokens);
      if (!result.user.profileCompleted) {
        navigate(ROUTES.PROFILE_SETUP, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Authentication failed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a', padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 420, position: 'relative' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 140,
            margin: '0 auto 16px',
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <img src={logo} alt="ACM Logo" style={{ height: 48, objectFit: 'contain' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            ACM NMAMIT
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-tertiary)' }}>
            Competition Platform
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: 20, padding: 32 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 600, color: '#f5f5f5' }}>
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            {mode === 'signup' ? 'Sign up to get started' : 'Access the ACM Competition Platform'}
          </p>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
            loading={googleLoading}
            variant="secondary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              marginBottom: 16,
              cursor: 'pointer',
            }}
          >
            <GoogleIcon />
            {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
          </Button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '16px 0',
            color: 'var(--color-text-tertiary)',
            fontSize: 12
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ padding: '0 12px' }}>or use email & password</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ marginBottom: 16 }}>
              <Input
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                leftElement={<Mail size={16} />}
                error={errors.email?.message}
                {...register('email')}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                leftElement={<Lock size={16} />}
                error={errors.password?.message}
                {...register('password')}
              />
            </div>
            <Button
              type="submit"
              loading={loading}
              style={{ width: '100%' }}
              rightIcon={<ArrowRight size={16} />}
            >
              {mode === 'signup' ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              style={{
                background: 'none',
                border: 'none',
                color: '#a855f7',
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              {mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
