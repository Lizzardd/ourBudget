import { TERMS } from '../src/legal/content';
import { LegalScreen } from '../src/legal/LegalScreen';

// Public route (outside the (app) auth group) → https://ob.lizzardd.link/terms
export default function Terms() {
	return <LegalScreen doc={TERMS} />;
}
