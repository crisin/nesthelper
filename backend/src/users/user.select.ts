import { Prisma } from '@prisma/client';

/** Everything that is safe to send to a client. Never includes `password`. */
export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  isProtected: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;
