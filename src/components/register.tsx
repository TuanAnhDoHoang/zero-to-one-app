import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/auth-context';
import { useToast } from '../hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all fields',
      });
      return;
    }

    setIsLoading(true);
    try {
      await login('traditional', { username: username, password });
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });
      onOpenChange(false);
      setUsername('');
      setPassword('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Login failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} >
      <DialogContent className="sm:max-w-[425px] text-slate-100">
        <DialogHeader className="items-center">
          <img src="/images/login_image.png" alt="logo" width={250} height={250} className='bg-transparent opacity-80'/>
          <DialogTitle className="text-2xl">Welcome Back!</DialogTitle>
          <DialogDescription>
            Sign in to continue your journey
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">username</Label>
            <Input
              id="username"
              placeholder="abcxyz"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin();
              }}
            />
          </div>
          <div className="space-y-2">
            <div className='flex justify-between items-center'>
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-sm text-primary hover:underline">Forgot Password?</a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="**********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin();
              }}
            />
          </div>
          <div className="flex items-center">
            <Input id="remember-me" type="checkbox" className="w-4 h-4 mr-2" />
            <Label htmlFor="remember-me">Remember me</Label>
          </div>
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
          >
            {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline">G</Button>
            <Button variant="outline">F</Button>
            <Button variant="outline">T</Button>
          </div>
          <div className="text-center text-sm">
            Don't have an account? <a href="#" className="text-primary hover:underline">Sign up</a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
