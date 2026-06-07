import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/", "/api/matches(.*)", "/api/predictions(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|webp|jpg|jpeg|curl|ico|woff|woff2|ttf|csv|docx|xlsx|pdf|zip)).*)",
    "/(api|trpc)(.*)",
  ],
};
