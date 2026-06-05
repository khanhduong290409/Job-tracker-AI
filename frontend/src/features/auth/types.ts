export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  gmailConnected: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}
