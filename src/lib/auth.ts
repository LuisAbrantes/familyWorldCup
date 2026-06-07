import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

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
      
    const result = await db.insert(users)
      .values({
        clerkUserId,
        displayName,
      })
      .returning();
    
    localUser = result[0];
  }

  return localUser;
}

export async function isAdmin(clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false;
  const adminIdsStr = process.env.ADMIN_USER_IDS || "";
  const adminIds = adminIdsStr.split(",").map(id => id.trim());
  return adminIds.includes(clerkUserId);
}
