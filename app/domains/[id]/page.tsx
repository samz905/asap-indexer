'use client';

import { useEffect, useState } from 'react';
import { 
    checkSiteUrl, 
    getSitemapPages, 
    getPageIndexingStatus
} from '../../../lib/actions';
import { convertToSiteUrl } from '../../../lib/utils';
import { getDomainFromId } from '@/lib/actions';
import IndexButton from '@/app/components/index-button'; // Import the IndexButton component

const Page = ({ params }: { params: { id: string } }) => {
    const { id } = params;

    const [domains, setDomains] = useState('');
    const [pages, setPages] = useState<string[]>([]);
    const [sitemaps, setSitemaps] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [pageStatuses, setPageStatuses] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchPages = async () => {
            setLoading(true);
            try {
                const extractedDomain = await getDomainFromId(id);
                let siteUrl = convertToSiteUrl(extractedDomain?.[0]?.domain_name);
                setDomains(siteUrl);
                siteUrl = await checkSiteUrl(siteUrl) || '';
                if (siteUrl) {
                    const [sitemaps, uniquePages] = await getSitemapPages(siteUrl);
                    if (sitemaps.length === 0) {
                        console.error("❌ No sitemaps found, add them to Google Search Console and try again.");
                    }
                    setPages(uniquePages);
                    const statuses = await Promise.all(uniquePages.map(page => getPageIndexingStatus(siteUrl, page)));
                    const statusMap = uniquePages.reduce((acc: Record<string, string>, page: string, index: number) => {
                        acc[page] = statuses[index];
                        return acc;
                    }, {});
                    setPageStatuses(statusMap);
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
                        <li key={index}>
                            {page} - Status: {pageStatuses[page]}
                            <IndexButton pageUrl={page} /> {/* Add the IndexButton next to each page with the corrected props */}
                        </li>
                    ))}
                </ul>
            )}
            <p>Number of pages: {pages.length}</p>
            {error && <p>Error: {error}</p>}
        </div>
    );
};

export default Page;

