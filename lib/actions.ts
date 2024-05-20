"use server";

import { 
    createServerActionClient, 
    createServerComponentClient 
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { convertToHTTP, convertToHTTPS, convertToSCDomain } from "./utils";
import { Status } from "./types";
import { fetchRetry } from "./utils";
import { webmasters_v3 } from "googleapis";
import Sitemapper from "sitemapper";


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

async function getAccessToken(admin: boolean = false) {
    const supabase = createServerComponentClient({ cookies });
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    let { 
        data: refresh_token 
    } = await supabase.from("profiles").select("refresh_token").match({ id: user.id }).single();

    admin ? refresh_token = process.env.GOOGLE_REFRESH_TOKEN : refresh_token = refresh_token.refresh_token;

    const access_token_response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${process.env.GOOGLE_CLIENT_ID}&client_secret=${process.env.GOOGLE_CLIENT_SECRET}&refresh_token=${refresh_token}&grant_type=refresh_token`
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

async function deleteDomainsFromDB(domainNames: string[]) {
    const supabase = createServerComponentClient({ cookies });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        const { data: dbDomains, error: fetchError } = await supabase
            .from('domains')
            .select('domain_name')
            .eq('user_id', user.id);

        if (fetchError) {
            console.error('Error fetching domains from DB:', fetchError);
            throw new Error('Failed to fetch domains from the database');
        }

        const dbDomainNames = dbDomains.map(dbDomain => dbDomain.domain_name);

        const domainsToDelete = dbDomainNames.filter(dbDomainName => !domainNames.includes(dbDomainName));

        for (const domainName of domainsToDelete) {
            const { error: deleteError } = await supabase
                .from('domains')
                .delete()
                .match({ user_id: user.id, domain_name: domainName });

            if (deleteError) {
                console.error('Error deleting domain:', deleteError);
                continue; // Skip to the next domain if there's an error deleting
            }
        }
    } else {
        throw new Error('User not authenticated');
    }
}

async function getDomainFromId(id: string) {
    const supabase = createServerComponentClient({ cookies });

    const { data: domains } = await supabase
        .from('domains')
        .select('domain_name')
        .match({ id: id });

    return domains;
}

async function createServiceAccount() {
    const accessToken = await getAccessToken(true);
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

        console.log(`Service account created!`);
        return email;
    } catch (error) {
        console.error('Error creating service account:', error);
        throw error;
    }
}

async function createJSONPrivateKey() {
    const supabase = createServerComponentClient({ cookies });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data: serviceAccountEmail } = await supabase
        .from('profiles')
        .select('service_account_email')
        .match({ id: user.id })
        .single();

    const accessToken = await getAccessToken(true);

    try {
        const response = await fetch(`https://iam.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/serviceAccounts/${serviceAccountEmail?.service_account_email}/keys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                keyAlgorithm: 'KEY_ALG_UNSPECIFIED',
                privateKeyType: 'TYPE_UNSPECIFIED'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create JSON private key');
        }

        const { privateKeyData } = await response.json();

        console.log(`JSON private key created!`);
        return privateKeyData;
    } catch (error) {
        console.error('Error creating JSON private key:', error);
        throw error;
    }
}

async function addPrivateKeytoDB() {
    const privateKey = await createJSONPrivateKey();
    const supabase = createServerComponentClient({ cookies });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        await supabase.from('profiles').update({ private_key: privateKey }).match({ id: user.id });
    }
}

async function checkIfPrivateKeyExists() {
    const supabase = createServerComponentClient({ cookies });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: private_key_data } = await supabase
        .from('profiles')
        .select('private_key')
        .match({ id: user?.id })
        .single();
    
    const check = private_key_data && private_key_data?.private_key !== null;
    return check;
}

async function verifyServiceAccount(domainName: string) {
}

async function addServiceAccount(serviceAccountEmail: string) {
    const supabase = createServerComponentClient({ cookies });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        const { data: domainData } = await supabase
            .from('profiles')
            .update({ service_account_email: serviceAccountEmail })
            .match({ id: user.id });
    }
        
    console.log('Update successful!');
}

async function getAccessTokenFromPrivateKey() {
    const supabase = createServerComponentClient({ cookies });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        console.error("❌ No user found.");
        return null;
    }

    const { data: profileData, error } = await supabase
        .from("profiles")
        .select("service_account_email, private_key")
        .match({ id: user.id })
        .single();

    if (error || !profileData) {
        console.error("❌ Failed to retrieve service account credentials:", error?.message);
        return null;
    }

    const { service_account_email, private_key } = profileData;

    if (!service_account_email || !private_key) {
        console.error("❌ Missing client_email or private_key in service account credentials.");
        return null;
    }

    // Decode the base64-encoded private key data
    const decodedKey = JSON.parse(Buffer.from(private_key, 'base64').toString('utf8')).private_key;

    try {
        const jwtClient = new google.auth.JWT(
            service_account_email,
            null,
            decodedKey.replace(/\\n/g, '\n'),
            ["https://www.googleapis.com/auth/webmasters.readonly", "https://www.googleapis.com/auth/indexing"]
        );

        const tokens = await jwtClient.authorize();
        return tokens.access_token;
    } catch (error) {
        console.error("❌ Error authorizing JWT client:", error);
        return null;
    }
}


export async function checkSiteUrl(siteUrl: string) {
    let sites = await getDomainList();
    console.log("Sites", sites);
    sites = sites.map(site => site.siteUrl);
    let formattedUrls: string[] = [];
  
    // Convert the site URL into all possible formats
    if (siteUrl.startsWith("https://")) {
      formattedUrls.push(siteUrl);
      formattedUrls.push(convertToHTTP(siteUrl));
      formattedUrls.push(convertToSCDomain(siteUrl));
    } else if (siteUrl.startsWith("http://")) {
      formattedUrls.push(siteUrl);
      formattedUrls.push(convertToHTTPS(siteUrl));
      formattedUrls.push(convertToSCDomain(siteUrl));
    } else if (siteUrl.startsWith("sc-domain:")) {
      formattedUrls.push(siteUrl);
      formattedUrls.push(convertToHTTP(siteUrl.replace("sc-domain:", "")));
      formattedUrls.push(convertToHTTPS(siteUrl.replace("sc-domain:", "")));
    } else {
      console.error("❌ Unknown site URL format.");
    }

    // Check if any of the formatted URLs are accessible
    for (const formattedUrl of formattedUrls) {
        if (sites.includes(formattedUrl)) {
            return formattedUrl;
        }
    }

    // If none of the formatted URLs are accessible
    console.error("❌ This service account doesn't have access to this site.");
}


export async function getPageIndexingStatus(
    siteUrl: string,
    inspectionUrl: string
  ): Promise<Status> {
    const accessToken = await getAccessTokenFromPrivateKey();

    try {
      const response = await fetchRetry(`https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          inspectionUrl,
          siteUrl,
        }),
      });
  
      if (response.status === 403) {
        console.error(`🔐 This service account doesn't have access to this site.`);
        console.error(await response.text());
  
        return Status.Forbidden;
      }
  
      if (response.status >= 300) {
        if (response.status === 429) {
          return Status.RateLimited;
        } else {
          console.error(`❌ Failed to get indexing status.`);
          console.error(`Response was: ${response.status}`);
          console.error(await response.text());
  
          return Status.Error;
        }
      }
  
      const body = await response.json();
      return body.inspectionResult.indexStatusResult.coverageState;
    } catch (error) {
      console.error(`❌ Failed to get indexing status.`);
      console.error(`Error was: ${error}`);
      throw error;
    }
}


export async function getPublishMetadata(url: string) {
    const accessToken = await getAccessTokenFromPrivateKey();

    const response = await fetchRetry(
      `https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodeURIComponent(url)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  
    if (response.status === 403) {
      console.error(`🔐 This service account doesn't have access to this site.`);
      console.error(`Response was: ${response.status}`);
      console.error(await response.text());
    }
  
    if (response.status === 429) {
      console.error("🚦 Rate limit exceeded, try again later.");
      console.error("");
      console.error("   Quota: https://developers.google.com/search/apis/indexing-api/v3/quota-pricing#quota");
      console.error("   Usage: https://console.cloud.google.com/apis/enabled");
      console.error("");
      process.exit(1);
    }
  
    if (response.status >= 500) {
      console.error(`❌ Failed to get publish metadata.`);
      console.error(`Response was: ${response.status}`);
      console.error(await response.text());
    }
    return response.status;
}
  

export async function requestIndexing(url: string) {
    const accessToken = await getAccessTokenFromPrivateKey();

    const response = await fetchRetry("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            url: url,
            type: "URL_UPDATED",
        }),
    });
  
    if (response.status === 403) {
      console.error(`🔐 This service account doesn't have access to this site.`);
      console.error(`Response was: ${response.status}`);
    }
  
    if (response.status >= 300) {
      if (response.status === 429) {
        console.error("🚦 Rate limit exceeded, try again later.");
        console.error("");
        console.error("   Quota: https://developers.google.com/search/apis/indexing-api/v3/quota-pricing#quota");
        console.error("   Usage: https://console.cloud.google.com/apis/enabled");
        console.error("");
        process.exit(1);
      } else {
        console.error(`❌ Failed to request indexing.`);
        console.error(`Response was: ${response.status}`);
        console.error(await response.text());
      }
    }
}

/**
 * Retrieves a list of sitemaps associated with the specified site URL from the Google Webmasters API.
 * @param accessToken The access token for authentication.
 * @param siteUrl The URL of the site for which to retrieve the list of sitemaps.
 * @returns An array containing the paths of the sitemaps associated with the site URL.
 */
async function getSitemapsList(siteUrl: string) {
    const accessToken = await getAccessTokenFromPrivateKey();
    // const accessToken = await getAccessToken(true);

    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`;
  
    const response = await fetchRetry(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    if (response.status === 403) {
      console.error(`🔐 This service account doesn't have access to this site.`);
      return [];
    }
  
    if (response.status >= 300) {
      console.error(`❌ Failed to get list of sitemaps.`);
      console.error(`Response was: ${response.status}`);
      console.error(await response.text());
      return [];
    }
  
    const body: webmasters_v3.Schema$SitemapsListResponse = await response.json();
  
    if (!body.sitemap) {
      console.error("❌ No sitemaps found, add them to Google Search Console and try again.");
      return [];
    }
  
    return body.sitemap.filter((x) => x.path !== undefined && x.path !== null).map((x) => x.path as string);
}
  
/**
 * Retrieves a list of pages from all sitemaps associated with the specified site URL.
 * @param accessToken The access token for authentication.
 * @param siteUrl The URL of the site for which to retrieve the sitemap pages.
 * @returns An array containing the list of sitemaps and an array of unique page URLs extracted from those sitemaps.
 */
export async function getSitemapPages(siteUrl: string) {
    const sitemaps = await getSitemapsList(siteUrl);
  
    let pages: string[] = [];
    for (const url of sitemaps) {
      const Google = new Sitemapper({
        url,
      });
  
      const { sites } = await Google.fetch();
      pages = [...pages, ...sites];
    }
  
    return [sitemaps, Array.from(new Set(pages))];
}
  

export { 
    insertCode, 
    getDomainList, 
    addDomainsToDB, 
    deleteDomainsFromDB,
    getDomainFromId,
    createServiceAccount, 
    addServiceAccount, 
    verifyServiceAccount,
    addPrivateKeytoDB,
    checkIfPrivateKeyExists,
    getAccessTokenFromPrivateKey
};

