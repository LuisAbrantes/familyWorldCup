import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT DEFINED",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.substring(0, 15)}...`
      : "NOT DEFINED",
    DATABASE_URL_DEFINED: !!process.env.DATABASE_URL,
    ADMIN_USER_IDS: process.env.ADMIN_USER_IDS || "NOT DEFINED",
    NODE_ENV: process.env.NODE_ENV || "unknown"
  });
}
