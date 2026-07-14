const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Guarantee React Native's core runs before anything else in the bundle.
 *
 * `getModulesRunBeforeMainModule` lists the modules Metro executes BEFORE the
 * entry file. Expo's default puts `InitializeCore` first and `expo/src/winter`
 * second, which is the order that matters: InitializeCore installs RN's fetch
 * polyfill (and with it `globalThis.Headers` / `Request` / `Response`), and the
 * winter runtime throws on startup if those are missing:
 *
 *     expo/fetch expected `globalThis.Headers` to be installed by React
 *     Native's fetch polyfill.
 *
 * Two things make that ordering unreliable in an OTA bundle specifically:
 *
 *  - Expo's own source calls this metadata "unstable or can be missing".
 *  - @expo/metro-config's `withSerializerPlugins` has cloned the config object
 *    rather than mutating it, which drops serializer settings *for exports
 *    only* — and `expo export` is exactly what `eas update` publishes.
 *
 * The symptom is brutal and silent: an EAS Build bundle is fine, every OTA
 * bundle throws before React renders, expo-updates rolls back to the embedded
 * bundle and blacklists the update. The app looks like it simply refuses to
 * update, with no error anywhere in JS.
 *
 * Note this cannot be fixed from the entry file. These modules run BEFORE the
 * entry, so an `import 'react-native/Libraries/Core/InitializeCore'` at the top
 * of index.native.js is already too late — the winter runtime has thrown by
 * then. It has to be fixed here.
 *
 * So we assert the invariant ourselves: InitializeCore first, always, whatever
 * the default produced.
 */
const INITIALIZE_CORE = require.resolve('react-native/Libraries/Core/InitializeCore');
const defaultModulesRunBeforeMainModule = config.serializer.getModulesRunBeforeMainModule;

config.serializer.getModulesRunBeforeMainModule = (entryFilePath) => {
	const defaults = defaultModulesRunBeforeMainModule?.(entryFilePath) ?? [];
	const withoutCore = defaults.filter((mod) => !String(mod).includes('InitializeCore'));
	return [INITIALIZE_CORE, ...withoutCore];
};

module.exports = config;
