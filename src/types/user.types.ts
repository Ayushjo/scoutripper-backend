export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  role: string;
  createdAt: string;
}
