# Meraki - AI Educational Assistant Frontend

A modern Next.js 16 web application that provides an AI-powered educational experience with video responses and synchronized subtitles.

## Overview

Meraki is the student-facing frontend for an educational AI assistant that delivers responses as engaging videos instead of plain text. Students can:

- Ask questions via text or voice input
- Receive pedagogically-appropriate video responses
- View synchronized subtitles for accessibility
- Maintain conversation history
- Personalize learning preferences

## Technology Stack

### Core Frontend
- **Next.js 16** - React framework with App Router
- **React 19.2** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library with Lucide icons

### State Management & Data
- **Zustand** - Client state management
- **TanStack Query** - Server state & caching
- **Zod** - Schema validation

### Forms & Validation
- **React Hook Form** - Form handling
- **Zod** - Data validation

### UI & Interactions
- **Framer Motion** - Animations
- **React Hot Toast** - Notifications
- **next-themes** - Theme management

### Media & Streaming
- **hls.js** - HLS video streaming
- **RecordRTC** - Audio recording
- **date-fns** - Date formatting

## Project Structure

```
meraki/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Landing page
│   ├── dashboard/
│   │   └── page.tsx                  # Main chat interface
│   ├── conversation/
│   │   └── [id]/page.tsx             # Conversation detail view
│   ├── globals.css                   # Global styles & theme
│   └── api/                          # API routes (if needed)
│
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx      # Main chat wrapper
│   │   │   ├── MessageList.tsx        # Messages display
│   │   │   ├── UserMessage.tsx        # User message bubble
│   │   │   ├── AIResponse.tsx         # AI response component
│   │   │   ├── VideoPlayer.tsx        # Video player with controls
│   │   │   ├── SubtitleDisplay.tsx    # Synchronized subtitles
│   │   │   ├── InputArea.tsx          # Message input section
│   │   │   ├── VoiceInput.tsx         # Voice recording UI
│   │   │   └── LoadingState.tsx       # Loading animation
│   │   │
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   │   ├── ConversationList.tsx   # Conversation list
│   │   │   ├── NewChat.tsx            # New conversation button
│   │   │   └── SidebarMenu.tsx        # Settings menu
│   │   │
│   │   ├── common/
│   │   │   ├── Header.tsx             # Top navigation
│   │   │   ├── Toast.tsx              # Notifications (via react-hot-toast)
│   │   │   ├── Loading.tsx            # Loading components
│   │   │   └── ErrorBoundary.tsx      # Error handling
│   │   │
│   │   ├── providers/
│   │   │   ├── ThemeProvider.tsx      # Dark/light theme
│   │   │   └── QueryProvider.tsx      # TanStack Query setup
│   │   │
│   │   └── ui/
│   │       └── ... (shadcn components)
│   │
│   ├── hooks/
│   │   ├── useChat.ts                 # Chat logic hook (to implement)
│   │   ├── useVoiceInput.ts           # Voice recording hook (to implement)
│   │   ├── useVideoPlayback.ts        # Video player hook (to implement)
│   │   ├── useSubtitleSync.ts         # Subtitle sync hook (to implement)
│   │   └── useMediaDevices.ts         # Microphone access hook (to implement)
│   │
│   ├── services/
│   │   ├── api.ts                     # API client class
│   │   └── websocket.ts               # WebSocket service (to implement)
│   │
│   ├── store/
│   │   ├── chatStore.ts               # Chat state (Zustand)
│   │   ├── userStore.ts               # User state (Zustand)
│   │   └── uiStore.ts                 # UI state (Zustand)
│   │
│   ├── types/
│   │   ├── chat.ts                    # Chat types
│   │   ├── user.ts                    # User types
│   │   ├── video.ts                   # Video types
│   │   ├── api.ts                     # API types
│   │   └── index.ts                   # Barrel exports
│   │
│   ├── lib/
│   │   ├── constants.ts               # App constants & endpoints
│   │   ├── validators.ts              # Zod validators
│   │   ├── utils.ts                   # Utility functions
│   │   └── cn.ts                      # ClassNames helper
│   │
│   └── middleware.ts                  # NextAuth middleware (optional)
│
├── public/
│   ├── images/                        # Static images
│   └── icons/                         # Custom icons
│
├── styles/
│   └── animations.css                 # Custom animations
│
├── .env.example                       # Environment variables template
├── INTEGRATION_GUIDE.md                # Backend integration guide
├── README.md                          # This file
├── next.config.ts                     # Next.js configuration
├── tailwind.config.ts                 # Tailwind configuration
├── tsconfig.json                      # TypeScript configuration
└── package.json                       # Dependencies
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Python 3.9+ (for backend)
- PostgreSQL (for database)

### Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd meraki
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

4. **Run development server**
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### Implemented in Frontend
- ✅ Landing page with feature showcase
- ✅ Modern dark theme with Meraki branding
- ✅ Chat interface with message display
- ✅ Video player with controls and timeline
- ✅ Synchronized subtitle rendering
- ✅ Voice recording with visual feedback
- ✅ Text input with keyboard shortcuts
- ✅ Conversation history management
- ✅ Sidebar with conversation list
- ✅ User authentication UI (hooks ready)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Loading states and animations
- ✅ Error handling and toast notifications
- ✅ Zustand state management
- ✅ TanStack Query for data fetching

### Requires Backend Implementation
- 🔧 API authentication (login/signup)
- 🔧 Message processing
- 🔧 Video generation (D-ID API)
- 🔧 Text-to-speech (ElevenLabs)
- 🔧 Speech-to-text (Whisper API)
- 🔧 Conversation AI (Claude API)
- 🔧 Database persistence
- 🔧 WebSocket real-time updates

## Component API Reference

### ChatContainer
Main chat interface wrapper managing layout and state.

```tsx
<ChatContainer />
```

### MessageList
Displays user and AI messages with auto-scroll.

```tsx
<MessageList />
```

### VideoPlayer
Video player with HLS support, controls, and subtitle sync.

```tsx
<VideoPlayer
  videoUrl="https://..."
  subtitles={[...]}
  duration={15000}
/>
```

### VoiceInput
Voice recording button with visual feedback.

```tsx
<VoiceInput
  onRecordingComplete={(audioUrl) => {
    // Handle audio blob
  }}
/>
```

### InputArea
Text input + send button + voice input.

```tsx
<InputArea />
```

## State Management

### Chat Store (Zustand)
```typescript
import { useChatStore } from '@/store/chatStore';

const {
  messages,
  currentConversationId,
  isGeneratingVideo,
  currentVideoResponse,
  addMessage,
  setVideoResponse,
  // ... more actions
} = useChatStore();
```

### User Store (Zustand)
```typescript
import { useUserStore } from '@/store/userStore';

const {
  user,
  preferences,
  isAuthenticated,
  setUser,
  setPreferences,
  logout,
} = useUserStore();
```

### UI Store (Zustand)
```typescript
import { useUIStore } from '@/store/uiStore';

const {
  sidebarOpen,
  isRecording,
  recordingDuration,
  toggleSidebar,
  setIsRecording,
} = useUIStore();
```

## API Integration

All API calls go through the `apiClient` service:

```typescript
import { apiClient } from '@/services/api';

// Send message
const response = await apiClient.sendMessage({
  conversationId: 'conv-id',
  message: 'Hello',
  audioUrl: undefined,
});

// Get conversations
const conversations = await apiClient.getConversations(1, 20);

// Create conversation
const newConv = await apiClient.createConversation('Title');
```

See **INTEGRATION_GUIDE.md** for complete API endpoint documentation.

## Styling & Theme

### Color System (Meraki)
- **Primary**: Indigo/Purple (`#4f46e5`)
- **Background**: Deep Dark (`#030303`)
- **Card**: Dark Gray (`#0d0d0d`)
- **Accent**: Indigo/Purple (`#4f46e5`)

### Tailwind Configuration
Custom colors defined in `tailwind.config.ts` and CSS custom properties in `globals.css`.

```css
:root {
  --primary: 250 89% 63%;
  --background: 0 0% 2%;
  --card: 0 0% 5%;
  /* ... more colors */
}
```

### Typography
- **Headings**: Geist Sans (default)
- **Body**: System fonts
- **Code**: Monospace

## Customization

### Change Brand Color
1. Edit `globals.css` CSS custom properties
2. Update `tailwind.config.ts` if needed
3. Colors are automatically applied via Tailwind tokens

### Add New Routes
1. Create folder in `app/` directory
2. Add `page.tsx` with React component
3. Use Next.js routing automatically

### Add New Components
1. Create component file in `src/components/`
2. Use shadcn/ui components as building blocks
3. Follow existing patterns (hooks + state)

## Performance Optimizations

- Code splitting with dynamic imports
- Image optimization via Next.js `<Image>`
- TanStack Query caching strategy
- Zustand for lightweight state
- CSS-in-JS via Tailwind (no runtime)
- Debounced API calls
- Lazy loading for heavy components

## Testing

### Unit Tests (To implement)
```bash
pnpm test
```

### E2E Tests (To implement)
```bash
pnpm test:e2e
```

## Deployment

### Vercel (Recommended)
```bash
pnpm run build
# Deploy to Vercel
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build
EXPOSE 3000
CMD ["pnpm", "start"]
```

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `ws://localhost:8000` |

## Troubleshooting

### Build Errors
```bash
# Clear cache
rm -rf .next
pnpm run build
```

### Port Already in Use
```bash
# Use different port
pnpm dev -- -p 3001
```

### API Connection Failed
1. Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. Verify backend is running
3. Check CORS configuration in backend
4. Check browser console for details

### Video Not Playing
1. Verify video URL is accessible
2. Check video format (MP4 or HLS)
3. Check browser console for errors
4. Ensure CORS headers are set

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m 'Add feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Open pull request

## Architecture Decisions

### Why Zustand over Redux?
- Simpler API
- Less boilerplate
- Smaller bundle size
- Perfect for medium complexity apps

### Why TanStack Query for server state?
- Automatic caching
- Built-in loading/error states
- Handles stale data
- Syncs across tabs

### Why Tailwind CSS?
- Utility-first approach
- No CSS naming issues
- Built-in dark mode
- Great with shadcn/ui

### Why shadcn/ui?
- Unstyled, fully customizable
- Radix UI accessible primitives
- Works perfectly with Tailwind
- No dependencies (copy-paste)

## Next Steps

1. **Build Backend** - Python FastAPI with all integrations
2. **Connect APIs** - Test all endpoints with frontend
3. **Implement WebSocket** - Real-time updates during generation
4. **Add Authentication** - NextAuth integration with backend
5. **Deploy** - Frontend to Vercel, Backend to Railway/Render
6. **Monitor & Optimize** - Analytics, error tracking, performance

## Support & Resources

- **INTEGRATION_GUIDE.md** - Backend integration details
- **Next.js Docs** - https://nextjs.org
- **shadcn/ui** - https://ui.shadcn.com
- **Tailwind CSS** - https://tailwindcss.com
- **TanStack Query** - https://tanstack.com/query
- **Zustand** - https://github.com/pmndrs/zustand

## License

MIT License - feel free to use for educational purposes.

## Author

Built with Vercel v0 AI assistant.

---

**Status**: Frontend complete, ready for backend integration.

For backend development guide, see INTEGRATION_GUIDE.md.
