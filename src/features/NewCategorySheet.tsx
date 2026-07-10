import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
	decLimitMinor,
	defaultLimitMinor,
	editName,
	incLimitMinor,
	NEW_CATEGORY_EMOJIS,
	pickPreset,
	visibleEmojiPresets,
	type NewCategoryPeriod,
} from '../budget/newCategory';
import { glyph } from '../budget/money';
import { Chip } from '../components/Chip';
import { Sheet } from '../components/Sheet';
import { useCategories, useCreateCategory } from '../hooks/useCategories';
import { useHousehold } from '../hooks/useHousehold';
import { useToast } from '../lib/toast';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export interface NewCategorySheetProps {
	open: boolean;
	onClose: () => void;
}

// The prototype's `openNewCat` hardcodes the initial selection to
// Travel/flight regardless of where "Travel" sits in `ncEmojis`.
const INITIAL_EMOJI = NEW_CATEGORY_EMOJIS.find((preset) => preset.emoji === 'flight')!;

/**
 * The "+ New category" flow: emoji/name preset grid, a free-text name
 * field, a monthly/annual toggle, and a limit stepper — fidelity source is
 * `docs/design/BudgetApp-Prototype.dc.html`'s `─── NEW CATEGORY SHEET ───`
 * and its `ncEmojis` / `ncType` / `ncLimit` / `ncCreate` logic. Mounted once
 * by `NewCategoryProvider`; opened via `useNewCategorySheet().open()`.
 */
export function NewCategorySheet({ open, onClose }: NewCategorySheetProps) {
	const { t, accent } = useTheme();
	const { householdId, currency } = useHousehold();
	const createCategory = useCreateCategory();
	const { categories } = useCategories();
	const { toast } = useToast();

	// Hide preset suggestions that duplicate a category the household
	// already has (case-insensitive name match); "Custom" is never hidden.
	const presets = useMemo(
		() => visibleEmojiPresets(categories.map((category) => category.name)),
		[categories]
	);

	const [emoji, setEmoji] = useState(INITIAL_EMOJI.emoji);
	const [name, setName] = useState(INITIAL_EMOJI.label);
	const [autoName, setAutoName] = useState(true);
	const [period, setPeriod] = useState<NewCategoryPeriod>('monthly');
	const [limitMinor, setLimitMinor] = useState(defaultLimitMinor('monthly'));
	const [ncLimitVal, setNcLimitVal] = useState(String(Math.round(defaultLimitMinor('monthly') / 100)));
	const [submitting, setSubmitting] = useState(false);

	// Reset to a fresh entry every time the sheet opens.
	useEffect(() => {
		if (open) {
			setEmoji(INITIAL_EMOJI.emoji);
			setName(INITIAL_EMOJI.label);
			setAutoName(true);
			setPeriod('monthly');
			setLimitMinor(defaultLimitMinor('monthly'));
			setNcLimitVal(String(Math.round(defaultLimitMinor('monthly') / 100)));
		}
	}, [open]);

	// Keep the numeric input's text in sync when the +/- steppers (or the
	// monthly/annual toggle) change `limitMinor` programmatically.
	useEffect(() => {
		setNcLimitVal(String(Math.round(limitMinor / 100)));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [limitMinor]);

	const cur = currency ?? 'AED';
	const curSym = glyph(cur);
	const trimmedName = name.trim();
	const canCreate = trimmedName.length > 0;

	const limitLabel = period === 'annual' ? 'ANNUAL LIMIT' : 'MONTHLY LIMIT';
	const createLabel = canCreate ? `Create ${trimmedName}` : 'Create category';
	const createBg = canCreate ? accent : t.el;
	const createColor = canCreate ? '#2B0E1A' : t.sub;

	const handlePickPreset = (preset: (typeof NEW_CATEGORY_EMOJIS)[number]) => {
		const next = pickPreset({ name, auto: autoName }, preset);
		setEmoji(preset.emoji);
		setName(next.name);
		setAutoName(next.auto);
	};

	const handleNameChange = (text: string) => {
		const next = editName(text);
		setName(next.name);
		setAutoName(next.auto);
	};

	const handlePeriod = (next: NewCategoryPeriod) => {
		setPeriod(next);
		setLimitMinor(defaultLimitMinor(next));
	};

	const handleDec = () => setLimitMinor((prev) => decLimitMinor(prev, period));
	const handleInc = () => setLimitMinor((prev) => incLimitMinor(prev, period));

	const handleLimitTextChange = (text: string) => {
		const digits = text.replace(/[^0-9]/g, '');
		setNcLimitVal(digits);
		setLimitMinor(Math.max(1, Math.round(parseFloat(digits || '0') * 100)));
	};

	const handleCreate = async () => {
		if (!canCreate) {
			toast('Give it a name first 🙂');
			return;
		}
		if (!householdId || submitting) {
			return;
		}
		setSubmitting(true);
		try {
			await createCategory({
				householdId,
				name: trimmedName,
				emoji,
				period,
				limit: limitMinor,
			});
			toast(`${trimmedName} added 🎉`);
			onClose();
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not create category');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Sheet open={open} onClose={onClose}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: t.text, fontFamily: fontFamily(800) }]}>
					New category
				</Text>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel="Close"
					onPress={onClose}
					style={[styles.closeButton, { backgroundColor: t.el }]}
				>
					<Text style={[styles.closeButtonText, { color: t.sub }]}>✕</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				horizontal={false}
				style={styles.chipsScroll}
				contentContainerStyle={styles.chipsRow}
			>
				{presets.map((preset) => (
					<Chip
						key={preset.emoji}
						label={preset.label}
						emoji={preset.emoji}
						selected={preset.emoji === emoji}
						onPress={() => handlePickPreset(preset)}
					/>
				))}
			</ScrollView>

			<TextInput
				value={name}
				onChangeText={handleNameChange}
				placeholder="Category name (e.g. Travel)"
				placeholderTextColor={t.sub}
				style={[styles.nameInput, { backgroundColor: t.el, color: t.text }]}
			/>

			<View style={[styles.periodToggle, { backgroundColor: t.el }]}>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel="Monthly, resets"
					accessibilityState={{ selected: period === 'monthly' }}
					onPress={() => handlePeriod('monthly')}
					style={[
						styles.periodButton,
						{ backgroundColor: period === 'monthly' ? accent : 'transparent' },
					]}
				>
					<Text
						style={[
							styles.periodButtonText,
							{ color: period === 'monthly' ? '#2B0E1A' : t.sub },
						]}
					>
						Monthly · resets
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel="Annual, builds up"
					accessibilityState={{ selected: period === 'annual' }}
					onPress={() => handlePeriod('annual')}
					style={[
						styles.periodButton,
						{ backgroundColor: period === 'annual' ? accent : 'transparent' },
					]}
				>
					<Text
						style={[
							styles.periodButtonText,
							{ color: period === 'annual' ? '#2B0E1A' : t.sub },
						]}
					>
						Annual · builds up
					</Text>
				</TouchableOpacity>
			</View>

			<View style={[styles.limitRow, { backgroundColor: t.el }]}>
				<View style={styles.limitText}>
					<Text style={[styles.limitLabel, { color: t.sub, fontFamily: fontFamily(700) }]}>
						{limitLabel}
					</Text>
					<View style={styles.limitInputRow}>
						<Text style={[styles.limitCurSym, { color: t.text, fontFamily: fontFamily(800) }]}>
							{curSym}
						</Text>
						<TextInput
							value={ncLimitVal}
							onChangeText={handleLimitTextChange}
							keyboardType="numeric"
							inputMode="numeric"
							style={[styles.limitInput, { color: t.text, fontFamily: fontFamily(800) }]}
						/>
					</View>
				</View>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel="Decrease limit"
					onPress={handleDec}
					style={[styles.stepButton, { backgroundColor: t.card }]}
				>
					<Text style={[styles.stepButtonText, { color: t.text }]}>−</Text>
				</TouchableOpacity>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel="Increase limit"
					onPress={handleInc}
					style={[styles.stepButton, { backgroundColor: t.card }]}
				>
					<Text style={[styles.stepButtonText, { color: t.text }]}>+</Text>
				</TouchableOpacity>
			</View>

			<TouchableOpacity
				accessibilityRole="button"
				accessibilityLabel={createLabel}
				accessibilityState={{ disabled: !canCreate || submitting }}
				disabled={!canCreate || submitting}
				onPress={handleCreate}
				style={[styles.createButton, { backgroundColor: createBg }]}
			>
				<Text style={[styles.createButtonText, { color: createColor }]}>{createLabel}</Text>
			</TouchableOpacity>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	title: {
		flex: 1,
		fontSize: 17,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeButtonText: {
		fontSize: 14,
	},
	chipsScroll: {
		maxHeight: 132,
	},
	chipsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 7,
	},
	nameInput: {
		height: 48,
		borderRadius: 15,
		paddingHorizontal: 16,
		fontSize: 15,
		fontFamily: fontFamily(700),
	},
	periodToggle: {
		flexDirection: 'row',
		borderRadius: 15,
		padding: 4,
		gap: 4,
	},
	periodButton: {
		flex: 1,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	periodButtonText: {
		fontSize: 13,
		fontFamily: fontFamily(800),
	},
	limitRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderRadius: 15,
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	limitText: {
		flex: 1,
	},
	limitLabel: {
		fontSize: 11,
	},
	limitAmount: {
		fontSize: 19,
		marginTop: 1,
	},
	limitInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 1,
	},
	limitCurSym: {
		fontSize: 19,
	},
	limitInput: {
		fontSize: 19,
		width: 110,
		padding: 0,
		backgroundColor: 'transparent',
		borderWidth: 0,
	},
	stepButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepButtonText: {
		fontSize: 19,
		fontFamily: fontFamily(800),
	},
	createButton: {
		height: 56,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	createButtonText: {
		fontSize: 16,
		fontFamily: fontFamily(800),
	},
});
