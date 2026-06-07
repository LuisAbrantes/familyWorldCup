import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

let memoizedAdminIds: Set<string> | null = null;

const getAdminIds = () => {
  const adminIdsStr = process.env.ADMIN_USER_IDS || "";
  return new Set(adminIdsStr.split(",").map(id => id.trim()).filter(Boolean));
};

export async function getOrCreateLocalUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  // Check db
  let localUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!localUser) {
    const userProfile = await currentUser();
    const displayName = userProfile?.firstName 
      ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim() 
      : "Participante";
      
    try {
      const result = await db.insert(users)
        .values({
          clerkUserId,
          displayName,
        })
        .onConflictDoUpdate({
          target: users.clerkUserId,
          set: { displayName }
        })
        .returning();
      
      localUser = result[0];
    } catch (error) {
      // Fallback in case of concurrent insert conflict
      console.warn("[Auth] Concurrent user sync detected, reloading profile:", error);
      localUser = await db.query.users.findFirst({
        where: eq(users.clerkUserId, clerkUserId),
      });
    }
  }

  return localUser;
}

export async function isAdmin(clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false;
  if (!memoizedAdminIds) {
    memoizedAdminIds = getAdminIds();
  }
  return memoizedAdminIds.has(clerkUserId);
}
