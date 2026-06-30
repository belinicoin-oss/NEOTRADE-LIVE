// Explicit Web App Manifest that DISABLES PWA install on Android Chrome.
//
// `display: "browser"` tells Chrome that even if the user taps
// "Add to home screen" from the menu, the home-screen icon should
// open in a regular browser tab (with the URL bar visible) — NOT as
// a standalone PWA / WebAPK.
export default function manifest() {
  return {
    name: 'NEOTRADE',
    short_name: 'NEOTRADE',
    description: 'AI-powered online trading platform — forex, crypto, gold & OTC markets.',
    start_url: '/',
    scope: '/',
    display: 'browser',
    display_override: ['browser'],
    background_color: '#0c1015',
    theme_color: '#0c1015',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    prefer_related_applications: false,
  };
}
