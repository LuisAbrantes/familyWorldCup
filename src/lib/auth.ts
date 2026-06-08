import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

let memoizedAdminIds: Set<string> | null = null;

const getAdminIds = () => {
  const adminIdsStr = process.env.ADMIN_USER_IDS || "";
  return new Set(adminIdsStr.split(",").map(id => id.trim()).filter(Boolean));
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

export async function getOrCreateLocalUser(req?: Request) {
  if (!req) return null;
  
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    const { data: { user: supabaseUser }, error } = await supabaseServer.auth.getUser(token);
    
    if (error || !supabaseUser) {
      console.error("[Auth] Supabase validation error:", error);
      return null;
    }

    const clerkUserId = supabaseUser.id; // Map Supabase user ID to clerkUserId column to avoid schema changes

    // Check db
    let localUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

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
          })
          .onConflictDoUpdate({
            target: users.clerkUserId,
            set: { displayName }
          })
          .returning();
        
        localUser = result[0];
      } catch (error) {
        console.warn("[Auth] Concurrent user sync detected, reloading profile:", error);
        localUser = await db.query.users.findFirst({
          where: eq(users.clerkUserId, clerkUserId),
        });
      }
    }

    return localUser;
  } catch (err) {
    console.error("[Auth] Error validating token:", err);
    return null;
  }
}

export async function isAdmin(clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false;
  if (!memoizedAdminIds) {
    memoizedAdminIds = getAdminIds();
  }
  return memoizedAdminIds.has(clerkUserId);
}
