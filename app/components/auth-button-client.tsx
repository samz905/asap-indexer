'use client';

import { 
    Session, 
    createClientComponentClient 
} from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

// During initial load, there is no session (it is created after auth and needs to be fetched from the server)
// Also, useRouter only works with client components which is why we need this one to be a client component
// This is why we have a server component wrapper which fetches the session first and then passes it as a prop to this component
export default function AuthButtonClient({
    session,
  }: {
    session: Session | null;
  }) {
    const supabase = createClientComponentClient();
    const router = useRouter();

    // After auth, the user is redirected to the /auth/callback route with an access token (JWT) received from the auth provider
    // The access token is essentially present as a URL parameter with the key 'code' (<domain>?code=<code>)
    // The callback route uses the access token to create a session and redirects the user back to the application
    const handleSignInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent'
                },
                redirectTo: `https://asap-indexer.vercel.app/auth/callback`,
                scopes: "https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing https://www.googleapis.com/auth/cloud-platform"
            },
        });
    };

    // We use router.refresh (page refresh) since after logout, this component needs to know that the user isn't authenticated anymore
    // After refresh, the homepage tries to fetch the tweets again but this time can't as the user isn't authenticated
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    return session ? (
        <button onClick={handleSignOut}>Sign out</button>
    ) : (
        <div className="flex flex-col space-y-2 items-center justify-center w-full">
            <button className="text-sm bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors" onClick={handleSignInWithGoogle}>Sign in with Google</button>
        </div>
    );
}

