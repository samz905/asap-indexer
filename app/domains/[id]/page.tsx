'use client';

import { useEffect, useState } from 'react';
import { 
    checkSiteUrl, 
    getSitemapPages, 
} from '../../../lib/actions';
import { convertToSiteUrl } from '../../../lib/utils';
import { getDomainFromId } from '@/lib/actions';

const Page = ({ params }: { params: { id: string } }) => {
    const { id } = params;

    const [domains, setDomains] = useState('');
    const [pages, setPages] = useState<string[]>([]);
    const [sitemaps, setSitemaps] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPages = async () => {
            setLoading(true);
            try {
                const extractedDomain = await getDomainFromId(id);
                let siteUrl = convertToSiteUrl(extractedDomain?.[0]?.domain_name);
                setDomains(siteUrl);
                siteUrl = await checkSiteUrl(siteUrl) || '';
                if (siteUrl) {
                    const [, uniquePages] = await getSitemapPages(siteUrl);
                    setPages(uniquePages);
                }
            } catch (err) {
                console.error(err);
                setError('Failed to fetch pages. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchPages();
    }, [id]);

    return (
        <div>
            <p>Domains: {domains}</p>
            {loading ? (
                <p>Loading pages...</p>
            ) : (
                <ul>
                    {pages.map((page, index) => (
                        <li key={index}>{page}</li>
                    ))}
                </ul>
            )}
            <p>Number of pages: {pages.length}</p>
            {error && <p>Error: {error}</p>}
        </div>
    );
};

export default Page;

