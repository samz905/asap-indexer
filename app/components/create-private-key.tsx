'use client';

import { useState, useEffect } from 'react';
import { addPrivateKeytoDB, checkIfPrivateKeyExists } from "@/lib/actions";

function CreatePrivateKey() {
    const [privateKeyExists, setPrivateKeyExists] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkPrivateKey = async () => {
            const exists = await checkIfPrivateKeyExists();
            setPrivateKeyExists(exists || false);
            setLoading(false);
        };
        checkPrivateKey();
    }, []);

    const onClick = async () => {
        if (!privateKeyExists) {
            await addPrivateKeytoDB();
            setPrivateKeyExists(true);
        }
    };

    if (loading) {
        return <button disabled>Loading...</button>;
    }

    return (
        <button onClick={onClick} disabled={privateKeyExists}>
            {privateKeyExists ? 'Key Already Exists' : 'Create Private Key'}
        </button>
    );
}

export default CreatePrivateKey;

