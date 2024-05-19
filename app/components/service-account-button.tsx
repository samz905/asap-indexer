'use client';

import { useState } from 'react';
import { createServiceAccount, addServiceAccount } from "@/lib/actions";

function ServiceAccountButton() {
    const [loading, setLoading] = useState(false);

    const handleCreateServiceAccount = async () => {
        setLoading(true);
        try {
            const service_email = await createServiceAccount();
            await addServiceAccount(service_email);
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

