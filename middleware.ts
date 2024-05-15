import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

// This is the middleware that intercepts every request to the server to ensure the user's session is active
// The request contains the access token (JWT) received during the initial auth
// This function uses that JWT in the request to create a new session if it has expired to ensure a smooth experience for the user
export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });
    await supabase.auth.getSession();
    return res;
}