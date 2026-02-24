import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Create account — Meraki',
  description: 'Create your Meraki account and start learning froth flotation.',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex">

      {/* Left branding panel — server-rendered */}
      <AuthBrandPanel variant="signup" />

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

          {/* Heading — server-rendered */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Create your account
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Get started with Meraki in seconds
            </p>
          </div>

          {/* Client boundary */}
          <SignupForm />

          {/* Footer link — server-rendered */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}