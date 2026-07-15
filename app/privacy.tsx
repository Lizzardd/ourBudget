import { PRIVACY_POLICY } from '../src/legal/content';
import { LegalScreen } from '../src/legal/LegalScreen';

// Public route (outside the (app) auth group) → https://ob.lizzardd.link/privacy
export default function Privacy() {
	return <LegalScreen doc={PRIVACY_POLICY} />;
}
