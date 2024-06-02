import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { insertCode } from "../../../lib/actions";

export const dynamic = 'force-dynamic';

// This is the callback route where the app is redirected after auth
// It exchanges the code received after successful auth for a session
export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    if (code) {
        const supabase = createRouteHandlerClient({ cookies });
        const session = await supabase.auth.exchangeCodeForSession(code);

        const refresh_token = session.data.session?.provider_refresh_token || '';

        await insertCode(refresh_token);
    }

    return NextResponse.redirect(requestUrl.origin);
}