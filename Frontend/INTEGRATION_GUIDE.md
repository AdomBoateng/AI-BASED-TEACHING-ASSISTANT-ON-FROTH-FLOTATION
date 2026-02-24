# Meraki AI Frontend - Backend Integration Guide

This guide explains how the frontend communicates with the Python FastAPI backend and what API endpoints/WebSocket events are expected.

---

## Frontend Architecture Overview

### Directory Structure
```
src/
├── components/           # React components
│   ├── chat/            # Chat interface components
│   ├── sidebar/         # Sidebar & navigation
│   ├── common/          # Shared components
│   ├── providers/       # Context/Provider components
│   └── ui/              # shadcn UI components
├── hooks/               # Custom React hooks
├── services/            # API client & services
├── store/               # Zustand state management
├── types/               # TypeScript type definitions
└── lib/                 # Utilities & validators
```

### State Management Flow
```
User Input
    ↓
InputArea Component → addMessage to chatStore
    ↓
apiClient.sendMessage(ChatRequest) → Backend API
    ↓
Backend processes & returns ChatResponse
    ↓
chatStore updates with videoResponse
    ↓
AIResponse Component renders VideoPlayer + Subtitles
```

---

## API Endpoints Required

### 1. **POST /api/chat** - Send Message & Get Video Response

**Request:**
```json
{
  "conversationId": "uuid",
  "message": "What is photosynthesis?",
  "audioUrl": "blob:http://..." // optional
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "messageId": "uuid",
    "videoResponse": {
      "videoUrl": "https://..../response.mp4",
      "hlsUrl": "https://..../response.m3u8", // optional for streaming
      "subtitles": [
        {
          "start": 0,
          "end": 2500,
          "text": "Photosynthesis is a process where plants..."
        },
        {
          "start": 2500,
          "end": 5000,
          "text": "It converts light energy into chemical energy..."
        }
      ],
      "duration": 15000 // milliseconds
    }
  }
}
```

**Frontend Implementation:**
```typescript
// Location: src/services/api.ts
async sendMessage(payload: ChatRequest) {
  return this.request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Usage in InputArea.tsx
const response = await apiClient.sendMessage({
  conversationId: currentConversationId,
  message: message.trim(),
});
```

---

### 2. **POST /api/auth/login** - User Login

**Request:**
```json
{
  "email": "student@example.com",
  "password": "securepassword"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@example.com",
      "name": "John Doe",
      "avatar": "https://...",
      "createdAt": "2024-01-01T00:00:00Z",
      "preferences": {
        "theme": "dark",
        "language": "en",
        "subtitlesEnabled": true,
        "autoPlayVideo": true
      }
    },
    "token": "jwt-token-here"
  }
}
```

**Frontend Hook:**
```typescript
// useAuth.ts hook to be created for authentication
const handleLogin = async (email, password) => {
  const response = await apiClient.login(email, password);
  if (response.success) {
    useUserStore.setState({ user: response.data.user, isAuthenticated: true });
  }
};
```

---

### 3. **GET /api/conversations** - Get Conversation History

**Query Parameters:**
```
?page=1&pageSize=20
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "title": "Understanding Photosynthesis",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "previewMessage": "What is photosynthesis?"
      }
    ],
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

**Frontend Usage:**
```typescript
// ConversationList.tsx component
const handleSelectConversation = async (id: string) => {
  const response = await apiClient.getConversation(id);
  // Load messages from response
  setMessages(response.data.messages);
};
```

---

### 4. **POST /api/conversations** - Create New Conversation

**Request:**
```json
{
  "title": "New Conversation"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "New Conversation",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "messages": []
  }
}
```

**Frontend Usage:**
```typescript
// NewChat.tsx component
const handleNewChat = async () => {
  const response = await apiClient.createConversation('New Conversation');
  if (response.success) {
    addConversation(response.data);
    setCurrentConversation(response.data.id);
  }
};
```

---

### 5. **GET /api/conversations/:id** - Get Specific Conversation

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Understanding Photosynthesis",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "messages": [
      {
        "id": "uuid",
        "conversationId": "uuid",
        "role": "user",
        "content": "What is photosynthesis?",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "id": "uuid",
        "conversationId": "uuid",
        "role": "assistant",
        "content": "Video response",
        "timestamp": "2024-01-15T10:35:00Z"
      }
    ]
  }
}
```

---

### 6. **POST /api/auth/logout** - Logout User

**Expected Response:**
```json
{
  "success": true
}
```

**Frontend Usage:**
```typescript
// SidebarMenu.tsx component
const handleLogout = async () => {
  await apiClient.logout();
  useUserStore.setState({ user: null, isAuthenticated: false });
};
```

---

## WebSocket Events (Optional but Recommended)

For real-time updates during video generation, implement WebSocket on the backend:

### Connection
```typescript
// Path: ws://localhost:8000/ws/chat/:conversationId
const ws = new WebSocket(`${WS_BASE_URL}/ws/chat/${conversationId}`);
```

### Events to Send from Backend

1. **video_chunk_ready** - Progressive video loading
```json
{
  "type": "video_chunk_ready",
  "data": {
    "url": "https://..../chunk-1.m3u8",
    "duration": 5000
  }
}
```

2. **subtitles_ready** - Subtitles generated
```json
{
  "type": "subtitles_ready",
  "data": {
    "subtitles": [
      {
        "start": 0,
        "end": 2500,
        "text": "..."
      }
    ]
  }
}
```

3. **response_complete** - Full response ready
```json
{
  "type": "response_complete",
  "data": {
    "videoUrl": "https://..../response.mp4",
    "duration": 15000
  }
}
```

### Frontend WebSocket Service (To be created)
```typescript
// services/websocket.ts - To be implemented
export class WebSocketClient {
  private ws: WebSocket | null = null;

  connect(conversationId: string) {
    this.ws = new WebSocket(`${WS_BASE_URL}/ws/chat/${conversationId}`);
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'video_chunk_ready':
          // Update video URL
          break;
        case 'subtitles_ready':
          // Update subtitles
          break;
        case 'response_complete':
          // Mark as complete
          break;
      }
    };
  }
}
```

---

## Backend Integration Checklist

- [ ] **POST /api/chat** endpoint processes:
  - User message with Whisper API (if audio URL provided)
  - Claude API for pedagogically appropriate response
  - ElevenLabs API for text-to-speech
  - D-ID API for avatar video generation
  - Returns video URL + WebVTT subtitles

- [ ] **Auth Endpoints** (/api/auth/*)
  - Login/Signup with password hashing (bcrypt)
  - JWT token generation
  - User session management
  - CORS configuration for frontend

- [ ] **Conversation Management**
  - PostgreSQL schema for users, conversations, messages
  - CRUD operations for conversations
  - Message history persistence

- [ ] **Video Processing Pipeline**
  - File upload handling for audio
  - Video storage (S3, local, or CDN)
  - HLS streaming support (optional)
  - Subtitle synchronization

- [ ] **Error Handling**
  - API error responses with proper status codes
  - User-friendly error messages
  - Retry logic for failed requests

- [ ] **Performance**
  - Response caching where applicable
  - Video compression
  - Database query optimization
  - Rate limiting

---

## Testing the Integration

### 1. Start the Frontend
```bash
npm run dev
# Frontend running at http://localhost:3000
```

### 2. Test Endpoints with cURL/Postman
```bash
# Test chat endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-id",
    "message": "Hello, what is AI?"
  }'
```

### 3. Check Console for Errors
The frontend logs API calls with `[API Error]` prefix. Monitor browser console for integration issues.

### 4. Verify Store Updates
Check React DevTools to see `chatStore` and `userStore` updating correctly as responses come in.

---

## Environment Variables

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**Backend (.env):**
```
DATABASE_URL=postgresql://user:password@localhost:5432/meraki
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
ELEVENLABS_API_KEY=...
D_ID_API_KEY=...
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

---

## Common Issues & Debugging

### Issue: CORS Errors
**Solution:** Ensure backend has CORS configured:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: Video Not Playing
**Solution:** Verify:
1. Video URL is accessible from frontend
2. MIME type is correct (`video/mp4` or `application/x-mpegURL` for HLS)
3. Video has proper duration metadata
4. Subtitles are in correct WebVTT format

### Issue: Subtitles Out of Sync
**Solution:** Ensure:
1. Subtitle timestamps (start/end) are in milliseconds
2. Video duration matches subtitle end times
3. Browser's video element `currentTime` is being tracked correctly

### Issue: Messages Not Loading
**Solution:** Check:
1. API returns proper `ChatResponse` structure
2. Store is being updated with `addMessage()`
3. Browser network tab shows successful API call

---

## Next Steps

1. **Phase 2** - Build chat interface core (already done in frontend)
2. **Phase 3** - Implement voice input (already done in frontend)
3. **Phase 4** - Build video response system (already done in frontend)
4. **Phase 5** - Conversation history management (already done in frontend)
5. **Implement Backend** - FastAPI with all integrations
6. **Connect Frontend ↔ Backend** - Test all endpoints
7. **Deploy** - Railway or Render for backend

---

## Support

For issues or questions about integration:
1. Check the browser console for error messages
2. Verify backend API responses match expected format
3. Ensure environment variables are set correctly
4. Test endpoints with Postman before connecting frontend
