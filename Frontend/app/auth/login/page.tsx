import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Sign in — Meraki',
  description: 'Sign in to your Meraki account to continue learning.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex">

      {/* Left branding panel — pure server HTML, no JS */}
      <AuthBrandPanel variant="login" />

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile-only logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">Meraki</span>
          </div>

          {/* Heading — server-rendered, no JS */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to continue your learning journey
            </p>
          </div>

          {/* Client boundary — only this part ships JS */}
          <LoginForm />

          {/* Footer link — server-rendered */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}