import { Request } from 'express';

export interface User {
  id: number;
  youtubeUserId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  excludeShorts?: boolean;
  excludeLivestreams?: boolean;
  maxVideoDuration?: number;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface TokenPayload {
  userId: number;
  youtubeUserId: string;
}