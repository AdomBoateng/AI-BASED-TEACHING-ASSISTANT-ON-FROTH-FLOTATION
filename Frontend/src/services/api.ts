import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import type {
  ApiResponse,
  ChatRequest,
  ChatResponse,
  Conversation,
  User,
} from '@/types';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include',
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[API Error]', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email: string, password: string, name: string) {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async getSession() {
    return this.request<any>('/api/auth/session');
  }

  // Chat endpoints
  async sendMessage(payload: ChatRequest) {
    return this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getConversations(page = 1, pageSize = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    return this.request(
      `/api/conversations?${params.toString()}`
    );
  }

  async getConversation(conversationId: string) {
    return this.request<Conversation>(
      `/api/conversations/${conversationId}`
    );
  }

  async createConversation(title: string) {
    return this.request<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async deleteConversation(conversationId: string) {
    return this.request(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // User endpoints
  async getUserProfile() {
    return this.request<User>('/api/user/profile');
  }

  async updateUserPreferences(preferences: Record<string, any>) {
    return this.request('/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Upload endpoints
  async uploadAudio(audioFile: Blob) {
    const formData = new FormData();
    formData.append('audio', audioFile);

    return this.request('/api/upload/audio', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
