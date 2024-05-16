'use client';

import { useState } from 'react';
import { verifyServiceAccount, getDomainList } from "@/lib/actions";

function VerifyButton() {
    const [isVerifying, setIsVerifying] = useState(false);

    const handleVerify = async () => {
        setIsVerifying(true);
        const domainList = await getDomainList();
        const domain = domainList[0].siteUrl.replace('sc-domain:', '');
        await verifyServiceAccount(domain);
        setIsVerifying(false);
    };

    return (
        <button onClick={handleVerify}>
            {isVerifying ? 'Verifying...' : 'Verify Service Account'}
        </button>
    );
}

export default VerifyButton;
