'use client';

import { useEffect, useState } from 'react';
import { checkSiteUrl, getSitemapPages } from '../../../lib/actions';
import { convertToSiteUrl } from '../../../lib/utils';
// import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { getDomainFromId } from '@/lib/actions';

// const Page = ({ params }: { params: { id: string } }) => {
//     const { id } = params;

//     const [domains, setDomains] = useState([]);
//     const [pages, setPages] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState('');

//     useEffect(() => {
//         const fetchPages = async () => {
//         try {
//             setLoading(true);
//             const domain = await getDomainFromId(id);

//             setDomains(domain?.[0]?.domain_name);

//             // const siteUrl = convertToHTTPS(domains?.[0]?.domain_name);
//             // const [, uniquePages] = await getSitemapPages(siteUrl);
//             // setPages(uniquePages);
//         } catch (err) {
//             setError('Failed to fetch pages. Please try again.');
//             console.error(err);
//         } finally {
//             setLoading(false);
//         }
//         };

//         fetchPages();
//     }, [id]);

//     if (loading) return <div>Loading...</div>;
//     if (error) return <div>Error: {error}</div>;

//     return (
//         <div>
//         <h1>Pages in Domain: {id}</h1>
//         {/* <ul>
//             {pages.map((page, index) => (
//             <li key={index}>{page}</li>
//             ))}
//         </ul> */}
//         <ul>
//             {domains.map((domain) => (
//             <li key={domain}>{domain}</li>
//             ))}
//         </ul>
//         </div>
//     );
// };

// export default Page;

const Page = ({ params }: { params: { id: string } }) => {
    const { id } = params;

    const [domains, setDomains] = useState('');
    const [pages, setPages] = useState<string[]>([]);
    const [sitemaps, setSitemaps] = useState<string[]>([]);

    useEffect(() => {
        const fetchPages = async () => {
            try {
                const extractedDomain = await getDomainFromId(id);
                let siteUrl = convertToSiteUrl(extractedDomain?.[0]?.domain_name);
                setDomains(siteUrl);
                siteUrl = await checkSiteUrl(siteUrl) || '';
                const [, uniquePages] = await getSitemapPages(siteUrl);
                setPages(uniquePages);
            } catch (err) {
                console.error(err);
            }
        };

        fetchPages();
    }, [id]);

    return (
        <div>
            <h1>Pages in Domain: {id}</h1>
            <p>{domains}</p>
            <ul>
                {pages.map((page, index) => (
                    <li key={index}>{page}</li>
                ))}
            </ul>
            <pre>{JSON.stringify(pages, null, 2)}</pre>
            <p>{pages.length}</p>
        </div>
    );
};

export default Page;

