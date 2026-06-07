import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/", "/api/matches(.*)", "/api/predictions(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html|css|js(?!on)|gif|svg|png|webp|jpg|jpeg|curl|ico|woff\\d?|ttf|manifest\\.json)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
