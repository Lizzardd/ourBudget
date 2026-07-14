// Web app entry point. Native uses `index.native.js`, which additionally forces
// React Native's core to initialise first — see that file for why. The browser
// already provides `fetch` / `Headers` / `Request` / `Response`, so there is
// nothing to polyfill here.
import 'expo-router/entry';
