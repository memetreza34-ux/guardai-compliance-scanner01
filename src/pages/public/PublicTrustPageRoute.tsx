import { useParams } from 'react-router-dom';
import PublicTrustPageBase from '../../components/PublicTrustPage';

export function PublicTrustPageRoute() {
  const { slug } = useParams<{ slug: string }>();
  return <PublicTrustPageBase publicSlug={slug || ''} />;
}