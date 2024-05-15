import { useState } from 'react';
import { createServiceAccountForDomain } from "@/lib/actions";

function ServiceAccountButton({ domain }: { domain: string }) {
    const [loading, setLoading] = useState(false);

    const handleCreateServiceAccount = async () => {
        setLoading(true);
        try {
            await createServiceAccountForDomain(domain);
            console.log('Service account created successfully!');
        } catch (error) {
            console.error('Failed to create service account:', error);
        }
        setLoading(false);
    };

    return (
        <button onClick={handleCreateServiceAccount} disabled={loading}>
            {loading ? 'Creating...' : 'Create Service Account'}
        </button>
    );
}

export default ServiceAccountButton;

