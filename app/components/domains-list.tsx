'use client';

import { useEffect, useState } from 'react';
import { 
    getDomainList, 
    addDomainsToDB, 
    deleteDomainsFromDB 
} from "@/lib/actions";

type Domain = { 
    siteUrl: string 
};

function DomainsList() {
    const [domains, setDomains] = useState<Domain[] | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchDomains = async () => {
        setLoading(true);
        try {
            const domainsData = await getDomainList();
            const cleanedDomains = domainsData.map((domain: Domain) => domain.siteUrl.replace('sc-domain:', ''));
            await addDomainsToDB(cleanedDomains);
            await deleteDomainsFromDB(cleanedDomains);
            setDomains(domainsData);
        } catch (error) {
            console.error("Failed to fetch domains:", error);
            setDomains([]); // Set to empty array to indicate no domains found
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, []);

    const handleRefresh = () => {
        fetchDomains();
    };

    return (
        <div>
            <h1>My Domains</h1>
            <button onClick={handleRefresh} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh Domains'}
            </button>
            <ul>
                {loading ? (
                    <li>Loading domains...</li>
                ) : domains && domains.length > 0 ? (
                    domains.map((domain: { siteUrl: string }) => (
                        <li key={domain.siteUrl}>
                            {domain.siteUrl.replace('sc-domain:', '')}
                        </li>
                    ))
                ) : (
                    <li>No domains found.</li>
                )}
            </ul>
        </div>
    );
};

export default DomainsList;