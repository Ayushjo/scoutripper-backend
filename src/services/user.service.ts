import prisma from "../utils/db";
import { buildImageUrl } from "../utils/image";
import { UserProfileResponse } from "../types/user.types";

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  role: string;
  createdAt: Date;
}): UserProfileResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: buildImageUrl(user.image),
    emailVerified: user.emailVerified,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export const getMe = async (userId: string): Promise<UserProfileResponse | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      role: true,
      createdAt: true,
    },
  });

  return user ? serializeUser(user) : null;
};

export const updateMe = async (
  userId: string,
  data: { name?: string; image?: string },
): Promise<UserProfileResponse | null> => {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existing) return null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.image !== undefined ? { image: data.image || null } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      role: true,
      createdAt: true,
    },
  });

  return serializeUser(user);
};
