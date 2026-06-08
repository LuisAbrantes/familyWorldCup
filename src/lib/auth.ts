import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { users, authorizedCreators, roomMembers, rooms } from "@/db/schema";
import { eq, and } from "drizzle-orm";

let memoizedAdminIds: Set<string> | null = null;

const getAdminIds = () => {
  const adminIdsStr = process.env.ADMIN_USER_IDS || "";
  return new Set(adminIdsStr.split(",").map(id => id.trim()).filter(Boolean));
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

export async function getOrCreateLocalUserDetailed(req?: Request): Promise<{ user: any; error: string | null }> {
  if (!req) return { user: null, error: "No request object provided" };
  
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "No Authorization header present" };
  }
  if (!authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Authorization header must start with Bearer" };
  }
  
  const token = authHeader.split(" ")[1];
  if (!token) {
    return { user: null, error: "Token is empty" };
  }

  try {
    const { data: { user: supabaseUser }, error } = await supabaseServer.auth.getUser(token);
    
    if (error) {
      return { user: null, error: `Supabase auth error: ${error.message} (status: ${error.status})` };
    }
    if (!supabaseUser) {
      return { user: null, error: "Supabase returned no user for this token" };
    }

    const clerkUserId = supabaseUser.id; // Map Supabase user ID to clerkUserId column to avoid schema changes

    // Check db
    let localUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    const email = supabaseUser.email || null;

    if (!localUser) {
      const displayName = supabaseUser.user_metadata?.display_name 
        || supabaseUser.user_metadata?.first_name 
        || supabaseUser.email?.split("@")[0] 
        || "Participante";
        
      try {
        const result = await db.insert(users)
          .values({
            clerkUserId,
            displayName,
            email,
          })
          .onConflictDoUpdate({
            target: users.clerkUserId,
            set: { displayName, email }
          })
          .returning();
        
        localUser = result[0];
      } catch (error) {
        console.warn("[Auth] Concurrent user sync detected, reloading profile:", error);
        localUser = await db.query.users.findFirst({
          where: eq(users.clerkUserId, clerkUserId),
        });
      }
    } else {
      // Sync display name or email if they changed in Supabase metadata
      const metaName = supabaseUser.user_metadata?.display_name 
        || supabaseUser.user_metadata?.first_name 
        || supabaseUser.email?.split("@")[0] 
        || "Participante";
        
      if (localUser.displayName !== metaName || localUser.email !== email) {
        try {
          const result = await db.update(users)
            .set({ displayName: metaName, email })
            .where(eq(users.clerkUserId, clerkUserId))
            .returning();
          if (result[0]) {
            localUser = result[0];
          }
        } catch (updateErr) {
          console.warn("[Auth] Failed to sync display name or email:", updateErr);
        }
      }
    }

    // Claim pre-assigned rooms
    if (localUser && localUser.email) {
      const userEmail = localUser.email.toLowerCase().trim();
      try {
        const preAssignedRooms = await db.query.rooms.findMany({
          where: eq(rooms.adminEmail, userEmail),
        });

        for (const room of preAssignedRooms) {
          // Update creatorUserId if not already correct
          if (room.creatorUserId !== localUser.id) {
            await db
              .update(rooms)
              .set({ creatorUserId: localUser.id })
              .where(eq(rooms.id, room.id));
          }

          // Check if already a member
          const existingMember = await db.query.roomMembers.findFirst({
            where: and(
              eq(roomMembers.roomId, room.id),
              eq(roomMembers.userId, localUser.id)
            )
          });

          if (!existingMember) {
            await db.insert(roomMembers).values({
              roomId: room.id,
              userId: localUser.id,
              role: "admin",
            });
          } else if (existingMember.role !== "admin") {
            await db
              .update(roomMembers)
              .set({ role: "admin" })
              .where(eq(roomMembers.id, existingMember.id));
          }
        }
      } catch (claimErr) {
        console.error("[Auth] Error claiming pre-assigned rooms:", claimErr);
      }
    }

    return { user: localUser, error: null };
  } catch (err: any) {
    console.error("[Auth] Error validating token:", err);
    return { user: null, error: `Exception during validation: ${err?.message || err}` };
  }
}

export async function getOrCreateLocalUser(req?: Request) {
  const { user } = await getOrCreateLocalUserDetailed(req);
  return user;
}

export async function isAdmin(clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false;
  if (!memoizedAdminIds) {
    memoizedAdminIds = getAdminIds();
  }
  return memoizedAdminIds.has(clerkUserId);
}

export async function isRoomAdmin(userId: number | null, roomId: number | null): Promise<boolean> {
  if (!userId || !roomId) return false;
  const member = await db.query.roomMembers.findFirst({
    where: and(
      eq(roomMembers.roomId, roomId),
      eq(roomMembers.userId, userId),
      eq(roomMembers.role, "admin")
    )
  });
  return !!member;
}

export async function isRoomMember(userId: number | null, roomId: number | null): Promise<boolean> {
  if (!userId || !roomId) return false;
  const member = await db.query.roomMembers.findFirst({
    where: and(
      eq(roomMembers.roomId, roomId),
      eq(roomMembers.userId, userId)
    )
  });
  return !!member;
}

export async function isEmailAuthorizedCreator(email: string | null): Promise<boolean> {
  if (!email) return false;
  const auth = await db.query.authorizedCreators.findFirst({
    where: eq(authorizedCreators.email, email.toLowerCase().trim())
  });
  return !!auth && auth.roomsAllowed > 0;
}

