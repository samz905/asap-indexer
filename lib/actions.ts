"use server";

import { 
    createServerActionClient, 
    createServerComponentClient 
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

async function insertCode(refresh_token: string) {
    const supabase = createServerActionClient({ cookies });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        const { 
            data: existingProfile 
        } = await supabase.from("profiles").select().match({ id: user.id }).single();

        if (existingProfile) {
            await supabase.from("profiles").update({ refresh_token: refresh_token }).match({ id: user.id });
        } else {
            console.log("No profile found for this user ID.");
        }

    } else {
        throw new Error("User not found");
    }
}

async function getAccessToken() {
    const supabase = createServerComponentClient({ cookies });
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const { 
        data: refresh_token 
    } = await supabase.from("profiles").select("refresh_token").match({ id: user.id }).single();

       const access_token_response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${process.env.GOOGLE_CLIENT_ID}&client_secret=${process.env.GOOGLE_CLIENT_SECRET}&refresh_token=${refresh_token?.refresh_token}&grant_type=refresh_token`
    });

    const data = await access_token_response.json();
    return data.access_token;
}

async function getDomainList() {
    const access_token = await getAccessToken();

    const response = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });

    const domains_data = await response.json();

    if (domains_data.siteEntry) {
        return domains_data.siteEntry.map((entry: { siteUrl: string }) => ({
            siteUrl: entry.siteUrl
        }));
    }
}

async function addDomainsToDB(domains: string[]) {
    const supabase = createServerComponentClient({ cookies });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        for (const domain of domains) {
            const { data: existingDomains, error: fetchError } = await supabase
                .from('domains')
                .select('domain_name')
                .match({ user_id: user.id, domain_name: domain });

            if (fetchError) {
                console.error('Error fetching existing domains:', fetchError);
                continue; // Skip to the next domain if there's an error fetching
            }

            if (existingDomains.length === 0) {
                const { error: insertError } = await supabase
                    .from('domains')
                    .insert([{ user_id: user.id, domain_name: domain }]);

                if (insertError) {
                    console.error('Error inserting domain:', insertError);
                    throw new Error(`Failed to insert domain ${domain} into the database`);
                }
            }
        }
    } else {
        throw new Error('User not authenticated');
    }
}

async function createServiceAccountForDomain(domainName: string) {
    const accessToken = await getAccessToken();
    const accountId = `sa-${Math.random().toString(36).substring(2, 15)}`;

    try {
        const response = await fetch(`https://iam.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/serviceAccounts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accountId: accountId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create service account');
        }

        const { email } = await response.json();

        await addServiceAccountToDomain(domainName, email);

        console.log(`Service account created and updated for domain ${domainName}`);
    } catch (error) {
        console.error('Error creating service account for domain:', error);
        throw error;
    }
}

async function addServiceAccountToDomain(domainName: string, serviceAccountEmail: string) {
    const supabase = createServerComponentClient({ cookies });

    const { data: domainData, error: updateError } = await supabase
        .from('domains')
        .update({ service_account_email: serviceAccountEmail })
        .match({ domain_name: domainName });

    if (updateError) {
        throw new Error(`Failed to update domain ${domainName} with service account email`);
    }
        
    console.log('Update successful!');
}


export { insertCode, getDomainList, addDomainsToDB, createServiceAccountForDomain };

