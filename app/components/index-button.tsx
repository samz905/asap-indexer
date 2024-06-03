import { useState } from 'react';
import { requestIndexing } from '../../lib/actions';

interface IndexButtonProps {
  pageUrl: string;
}

const IndexButton = ({ pageUrl }: IndexButtonProps) => {
  const [indexingStatus, setIndexingStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestIndexing = async () => {
    setLoading(true);
    try {
      await requestIndexing(pageUrl);
      setIndexingStatus('Indexing requested successfully. It may take a few days for Google to process it.');
    } catch (error) {
      setIndexingStatus('Failed to request indexing. Please try again later.');
      console.error('Indexing error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
        <button onClick={handleRequestIndexing} disabled={loading}>
            {loading ? 'Requesting...' : 'Request Indexing'}
        </button>
        <p>{indexingStatus}</p>
    </div>
  );
};

export default IndexButton;

