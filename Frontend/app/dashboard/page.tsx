import { AuthGuard } from '@/components/dashboard/AuthGuard';

export const metadata = {
  title: 'Dashboard — Meraki',
  description: 'Your AI-powered froth flotation learning dashboard.',
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background">
      {/*
        AuthGuard is a client component in src/components/dashboard/.
        It reads isAuthenticated from Zustand (localStorage) and either
        redirects to /auth/login or renders <ChatContainer />.
      */}
      <AuthGuard />
    </main>
  );
}