'use client';

import { useState } from 'react';
import { createServiceAccount } from "@/lib/actions";

function ServiceAccountButton() {
    const [loading, setLoading] = useState(false);

    const handleCreateServiceAccount = async () => {
        setLoading(true);
        try {
            await createServiceAccount();
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

