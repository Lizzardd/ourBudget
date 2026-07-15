/**
 * Privacy Policy and Terms of Service content, kept as structured data so a
 * single `LegalScreen` renders both and the copy is easy to review and edit.
 *
 * These are a plain-language starting point tailored to what the app actually
 * does — not legal advice. Keep them accurate to the app: if data practices
 * change, change these, and bump `POLICY_VERSION` (src/lib/policy.ts +
 * convex/consent.ts) so members are re-prompted to agree.
 */

export interface LegalSection {
	heading: string;
	body: string[];
}

export interface LegalDoc {
	title: string;
	effective: string;
	intro: string;
	sections: LegalSection[];
}

const CONTACT = 'info@noltech.co.za';
const EFFECTIVE = '15 July 2026';

export const PRIVACY_POLICY: LegalDoc = {
	title: 'Privacy Policy',
	effective: EFFECTIVE,
	intro:
		'Our Budget is a personal, non-commercial app for tracking a household budget together. This policy explains what it collects, why, and the choices you have. Questions: ' +
		CONTACT +
		'.',
	sections: [
		{
			heading: 'What we collect',
			body: [
				'Account details from Google sign-in: your name, email address, and profile picture.',
				'The budget data you enter: expenses (amount, category, place/payee, note, date, and who paid), your categories and budget limits, your currency and display settings, and your household’s name and invite code.',
				'A record of which version of this policy you agreed to, and when.',
				'The minimal technical data needed to keep you signed in. There is no analytics, tracking, or advertising in the app.',
			],
		},
		{
			heading: 'How we use it',
			body: [
				'Only to run the app: to sign you in, and to store and sync your household’s budget so every member sees the same live figures.',
				'We do not sell your data, show ads, or build any profile of you.',
			],
		},
		{
			heading: 'Where it’s stored',
			body: [
				'Your data is stored and processed by the services that run the app: Google (sign-in), Convex (the app’s backend and database, where your budget data lives), Cloudflare (serves the web app), and AWS Route 53 (domain name). Your data may be held on their infrastructure.',
			],
		},
		{
			heading: 'Who can see it',
			body: [
				'Your budget data is visible to the members of your household — that is the point of a shared budget. It is not shared with anyone else, and it is never sold.',
			],
		},
		{
			heading: 'Keeping and deleting your data',
			body: [
				'Your data is kept while your account and household are active.',
				'You can leave a household, remove a member, or delete a household — deleting a household removes its transactions, categories, and settings from the live database.',
				'To delete your account entirely, contact ' + CONTACT + ' and we will remove it.',
			],
		},
		{
			heading: 'Your rights',
			body: [
				'You can export a copy of your data from within the app, correct it by editing in the app, delete it as described above, and withdraw consent at any time by ceasing to use the app and asking us to delete your account.',
			],
		},
		{
			heading: 'Children',
			body: [
				'Our Budget is not intended for children. Please don’t use it if you are under the age of digital consent where you live.',
			],
		},
		{
			heading: 'Changes',
			body: [
				'We may update this policy. The effective date is shown above; if it changes materially, you’ll be asked to agree again the next time you sign in.',
			],
		},
		{
			heading: 'Contact',
			body: ['Questions about your data or this policy: ' + CONTACT + '.'],
		},
	],
};

export const TERMS: LegalDoc = {
	title: 'Terms of Service',
	effective: EFFECTIVE,
	intro:
		'These terms cover your use of Our Budget, a free personal app for tracking a household budget. By using it you agree to these terms and to the Privacy Policy.',
	sections: [
		{
			heading: 'What Our Budget is',
			body: [
				'A free app for personal, non-commercial use, for recording and viewing a household’s shared spending. It is offered in good faith as a personal project.',
			],
		},
		{
			heading: 'Not financial advice',
			body: [
				'Our Budget is a tool for recording your own numbers. It is not financial, accounting, or tax advice, and the figures it shows may contain errors. Don’t rely on it for financial, tax, or legal decisions.',
			],
		},
		{
			heading: 'Your account',
			body: [
				'You sign in with Google. Keep your Google account secure — you are responsible for activity under your account. Anyone you share a household with can see and edit that household’s budget data.',
			],
		},
		{
			heading: 'Acceptable use',
			body: [
				'Use the app for your own household only. Don’t try to break, overload, reverse-engineer, or gain unauthorised access to it; don’t use it for anything unlawful; and don’t enter other people’s personal data without their permission.',
			],
		},
		{
			heading: 'Your data',
			body: [
				'The budget data you enter is yours. You give the operator permission to store and process it as needed to run the service, as described in the Privacy Policy. You are responsible for what you enter.',
			],
		},
		{
			heading: 'Availability and “as is”',
			body: [
				'The app is provided “as is” and “as available”, with no guarantee of uptime, accuracy, or that it will keep running. It may change or be discontinued at any time. To the extent permitted by law, it comes with no warranties of any kind.',
			],
		},
		{
			heading: 'Liability',
			body: [
				'To the extent permitted by law, the operator is not liable for any loss arising from your use of, or inability to use, the app — including any decisions made using its figures. It is a free personal project.',
			],
		},
		{
			heading: 'Ending use',
			body: [
				'You can stop using the app and delete your data at any time. The operator may suspend or discontinue the service.',
			],
		},
		{
			heading: 'Changes',
			body: [
				'These terms may change. If they change materially you’ll be asked to agree again at sign-in; continuing to use the app means you accept the current terms.',
			],
		},
		{
			heading: 'Contact',
			body: [CONTACT + '.'],
		},
	],
};
