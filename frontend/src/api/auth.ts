import { request } from './request';
import type { AuthUser } from '@/utils/auth';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export async function login(payload: LoginPayload) {
  const { data } = await request.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function getMe() {
  const { data } = await request.get<AuthUser>('/auth/me');
  return data;
}
