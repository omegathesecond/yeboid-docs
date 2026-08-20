---
layout: home

hero:
  name: YeboID
  text: Identity for Africa
  tagline: Phone-first authentication & KYC verification for African applications
  image:
    src: /logo.svg
    alt: YeboID
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: API Reference
      link: /api-reference/oauth
    - theme: alt
      text: Register Your App
      link: /register-app

features:
  - icon: 📱
    title: Phone-First Auth
    details: Built for Africa — authenticate users with their phone number and a PIN. No passwords, no emails required.
  
  - icon: ✅
    title: KYC Verification
    details: Verify user identity with YeboVerify. Support for ID documents across multiple African countries.
  
  - icon: 🔐
    title: OAuth 2.0 + PKCE
    details: Industry-standard security with PKCE code challenge. Secure mobile and web authentication.
  
  - icon: 🎨
    title: Pre-built Flutter Widgets
    details: Login buttons, avatars, profile cards and verify buttons in the Midnight Gold theme — drop them straight into your app.
    link: /flutter-sdk/
    linkText: Flutter SDK
  
  - icon: 🖥️
    title: Backend SDK
    details: Express middleware, JWKS-cached token verification and the full OAuth flow for Node/TypeScript services.
    link: /node-sdk/
    linkText: Node.js SDK
  
  - icon: 🌐
    title: Browser SDK
    details: PKCE in the browser with React bindings — a provider, a hook, and an authenticated fetch that refreshes for you.
    link: /web-sdk/
    linkText: Web / React SDK
  
  - icon: 🌍
    title: Made for Africa
    details: E.164 phone numbers, regional ID document support, and optimized for African mobile networks.
  
  - icon: 🔔
    title: Webhooks
    details: Subscribe to profile, session and KYC events with HMAC-signed, retried delivery.
    link: /webhooks
    linkText: Webhook guide
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 100%);
  --vp-home-hero-image-background-image: linear-gradient(135deg, #D4AF37 10%, #1A1A2E 100%);
  --vp-home-hero-image-filter: blur(40px);
}

.dark {
  --vp-home-hero-image-background-image: linear-gradient(135deg, #D4AF37 10%, #0A0A0F 100%);
}
</style>

## Quick Start

Add YeboID to your Flutter app in 3 steps:

### 1. Install the Package

```yaml
dependencies:
  yeboid_flutter:
    git:
      url: https://github.com/omegathesecond/yeboid-flutter.git
```

### 2. Wrap Your App

```dart
import 'package:yeboid_flutter/yeboid_flutter.dart';

void main() {
  runApp(
    YeboIDProvider(
      config: YeboIDConfig(
        clientId: 'your-app-id',
        redirectUri: 'yourapp://auth',
      ),
      child: MyApp(),
    ),
  );
}
```

### 3. Add Login Button

```dart
YeboIDLoginButton(
  onSuccess: (user) => Navigator.pushNamed(context, '/home'),
  onError: (error) => showSnackbar(error),
)
```

That's it! Your users can now authenticate with YeboID.

---

<div style="text-align: center; padding: 2rem;">
  <a href="/flutter-sdk" style="display: inline-block; padding: 1rem 2rem; background: linear-gradient(135deg, #D4AF37, #B8962E); color: #0A0A0F; border-radius: 8px; font-weight: 600; text-decoration: none;">
    View Full Documentation →
  </a>
</div>
