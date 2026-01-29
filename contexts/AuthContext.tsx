import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { GeminiModelConfig } from '../types';
import { DEFAULT_MODEL_CONFIG } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  settings: GeminiModelConfig | null;
  hasApiKey: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<GeminiModelConfig & { geminiApiKey?: string }>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 's2v_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<GeminiModelConfig | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  const isAuthenticated = !!token;

  // 로그인
  const login = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        setToken(data.token);
        localStorage.setItem(TOKEN_KEY, data.token);
        return { success: true };
      }

      return { success: false, error: data.error || '로그인에 실패했습니다.' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '서버 연결에 실패했습니다.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 로그아웃
  const logout = useCallback(() => {
    setToken(null);
    setSettings(null);
    setHasApiKey(false);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  // 설정 불러오기
  const loadSettings = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // 토큰 만료
        logout();
        return;
      }

      const data = await response.json();

      if (data.success && data.settings) {
        setSettings({
          textModel: data.settings.textModel || DEFAULT_MODEL_CONFIG.textModel,
          imageModel: data.settings.imageModel || DEFAULT_MODEL_CONFIG.imageModel,
          videoModel: data.settings.videoModel || DEFAULT_MODEL_CONFIG.videoModel,
          ttsModel: data.settings.ttsModel || DEFAULT_MODEL_CONFIG.ttsModel,
          ttsVoice: data.settings.ttsVoice || DEFAULT_MODEL_CONFIG.ttsVoice,
        });
        setHasApiKey(data.settings.hasApiKey || false);
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  // 설정 저장
  const saveSettings = useCallback(async (
    newSettings: Partial<GeminiModelConfig & { geminiApiKey?: string }>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });

      if (response.status === 401) {
        logout();
        return { success: false, error: '세션이 만료되었습니다. 다시 로그인해 주세요.' };
      }

      const data = await response.json();

      if (data.success && data.settings) {
        setSettings({
          textModel: data.settings.textModel || DEFAULT_MODEL_CONFIG.textModel,
          imageModel: data.settings.imageModel || DEFAULT_MODEL_CONFIG.imageModel,
          videoModel: data.settings.videoModel || DEFAULT_MODEL_CONFIG.videoModel,
          ttsModel: data.settings.ttsModel || DEFAULT_MODEL_CONFIG.ttsModel,
          ttsVoice: data.settings.ttsVoice || DEFAULT_MODEL_CONFIG.ttsVoice,
        });
        setHasApiKey(data.settings.hasApiKey || false);
        return { success: true };
      }

      return { success: false, error: data.error || '설정 저장에 실패했습니다.' };
    } catch (error) {
      console.error('Save settings error:', error);
      return { success: false, error: '서버 연결에 실패했습니다.' };
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  // 토큰이 있으면 설정 불러오기
  useEffect(() => {
    if (token) {
      loadSettings();
    }
  }, [token, loadSettings]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        settings,
        hasApiKey,
        login,
        logout,
        loadSettings,
        saveSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
