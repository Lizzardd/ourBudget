// Native app entry point (Metro resolves this over `index.js` on iOS/Android).
//
// The ONLY reason this file exists is to force React Native's core to
// initialise before anything else in the bundle.
//
// `InitializeCore` is what installs RN's fetch polyfill — and with it
// `globalThis.Headers`, `Request` and `Response`. Expo's own
// `expo/src/winter/runtime.native.ts` needs those to exist, and it says so:
//
//     WARN: We must ensure that the core react-native globals are initialized
//     before ours. Otherwise we're relying on `getModulesRunBeforeMainModule`
//     which is unstable or can be missing
//
// That metadata is present in an EAS Build bundle (`expo export:embed`) and
// MISSING in an OTA bundle (`expo export`, which is what `eas update`
// publishes). So over the air, RN's core never ran first, the polyfill was
// never installed, and startup died with:
//
//     expo/fetch expected `globalThis.Headers` to be installed by React
//     Native's fetch polyfill.
//
// expo-updates caught the exception, rolled back to the embedded bundle, and
// marked the update failed — which is why the embedded build always worked and
// every single published update was dead on arrival.
//
// Importing InitializeCore explicitly, as the first thing the bundle does,
// removes the dependency on that unstable metadata entirely. It must stay the
// first import in this file.
//
// This lives in `.native.js` rather than `index.js` because the web bundler
// rejects react-native internals outright ("Importing react-native internals is
// not supported on web"), and web has these globals from the browser anyway.
import 'react-native/Libraries/Core/InitializeCore';

import 'expo-router/entry';
