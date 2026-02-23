// import { AuthGuard } from '@/components/dashboard/AuthGuard';

// export const metadata = {
//   title: 'Dashboard — Meraki',
//   description: 'Your AI-powered froth flotation learning dashboard.',
// };

// export default function DashboardPage() {
//   return (
//     <main className="min-h-screen bg-background">
//       {/*
//         AuthGuard is a client component in src/components/dashboard/.
//         It reads isAuthenticated from Zustand (localStorage) and either
//         redirects to /auth/login or renders <ChatContainer />.
//       */}
//       <AuthGuard />
//     </main>
//   );
// }
import { AuthGuard } from '@/components/dashboard/AuthGuard';

export const metadata = {
  title: 'Dashboard — Meraki',
  description: 'Your AI-powered froth flotation learning dashboard.',
};

export default function DashboardPage() {
  // CRITICAL: No wrapper div! AuthGuard → ChatContainer has h-screen.
  // Any wrapper here breaks the flex height chain needed for scroll.
  return <AuthGuard />;
}