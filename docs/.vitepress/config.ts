import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'YeboID Docs',
  description: 'Universal Authentication for Africa - Developer Documentation',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#0A0A0F' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'YeboID Developer Documentation' }],
    ['meta', { property: 'og:description', content: 'Universal Authentication for Africa' }],
  ],
  
  // Fail the build on broken internal links. Docs rot silently otherwise —
  // a renamed page leaves dead links that nothing catches until a developer
  // hits a 404 mid-integration.
  ignoreDeadLinks: false,
  
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'YeboID',
    
    nav: [
      { text: 'Guide', link: '/getting-started' },
      {
        text: 'SDKs',
        items: [
          { text: 'Node.js', link: '/node-sdk/' },
          { text: 'Web / React', link: '/web-sdk/' },
          { text: 'Flutter', link: '/flutter-sdk/' }
        ]
      },
      { text: 'API Reference', link: '/api-reference/oauth' },
      { text: 'Register App', link: '/register-app' },
      { text: 'yeboid.com', link: 'https://yeboid.com' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Integrate with an AI Agent', link: '/ai-agents' },
          { text: 'Register Your App', link: '/register-app' },
          { text: 'Verify and Publish an App', link: '/app-verification' },
          { text: 'Permissions', link: '/permissions' },
          { text: 'Troubleshooting', link: '/troubleshooting' }
        ]
      },
      {
        text: 'Authentication',
        items: [
          { text: 'OAuth2 Flow', link: '/authentication/' },
          { text: 'PKCE', link: '/authentication/pkce' },
          { text: 'Tokens', link: '/authentication/tokens' }
        ]
      },
      {
        text: 'SDKs',
        collapsed: false,
        items: [
          { text: 'Node.js SDK', link: '/node-sdk/' },
          { text: 'Web / React SDK', link: '/web-sdk/' }
        ]
      },
      {
        text: 'Flutter SDK',
        collapsed: true,
        items: [
          { text: 'Installation', link: '/flutter-sdk/' },
          { text: 'YeboIDProvider', link: '/flutter-sdk/provider' },
          { text: 'YeboIDLoginButton', link: '/flutter-sdk/login-button' },
          { text: 'YeboIDAvatar', link: '/flutter-sdk/avatar' },
          { text: 'YeboIDProfileCard', link: '/flutter-sdk/profile-card' },
          { text: 'YeboIDVerifyButton', link: '/flutter-sdk/verify-button' },
          { text: 'YeboIDUser Model', link: '/flutter-sdk/user-model' },
          { text: 'Troubleshooting', link: '/flutter-sdk/troubleshooting' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'OAuth & OIDC', link: '/api-reference/oauth' },
          { text: 'REST Endpoints', link: '/api-reference' },
          { text: 'User Management', link: '/api-reference/users' }
        ]
      },
      {
        text: 'Integration',
        items: [
          { text: 'KYC with YeboVerify', link: '/kyc-integration' },
          { text: 'Webhooks', link: '/webhooks' },
          { text: 'Business Accounts', link: '/business-accounts' },
          { text: 'Release Verification', link: '/security/release' }
        ]
      },
      {
        text: 'Resources',
        items: [
          { text: 'Demo App', link: '/demo-app' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/omegathesecond/yeboid-docs' }
    ],

    footer: {
      message: 'Universal Authentication for Africa',
      copyright: 'Copyright © 2026 Omevision'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/omegathesecond/yeboid-docs/edit/master/docs/:path',
      text: 'Edit this page'
    }
  },
  
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'one-dark-pro'
    },
    // Shiki ships no `gradle` grammar, so ```gradle fences silently fell back
    // to plain text. Gradle build files are Groovy (build.gradle) or Kotlin
    // (build.gradle.kts) source, so alias each onto the grammar it really is.
    languageAlias: {
      gradle: 'groovy',
      'gradle.kts': 'kotlin'
    }
  }
})
