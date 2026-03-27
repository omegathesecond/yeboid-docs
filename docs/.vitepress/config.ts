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
  
  ignoreDeadLinks: true,
  
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'YeboID',
    
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Flutter SDK', link: '/flutter-sdk/' },
      { text: 'API Reference', link: '/api-reference' },
      { text: 'yeboid.com', link: 'https://yeboid.com' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting Started', link: '/getting-started' }
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
        text: 'Flutter SDK',
        collapsed: false,
        items: [
          { text: 'Installation', link: '/flutter-sdk/' },
          { text: 'YeboIDProvider', link: '/flutter-sdk/provider' },
          { text: 'YeboIDLoginButton', link: '/flutter-sdk/login-button' },
          { text: 'YeboIDAvatar', link: '/flutter-sdk/avatar' },
          { text: 'YeboIDProfileCard', link: '/flutter-sdk/profile-card' },
          { text: 'YeboIDVerifyButton', link: '/flutter-sdk/verify-button' },
          { text: 'YeboIDUser Model', link: '/flutter-sdk/user-model' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Endpoints', link: '/api-reference' },
          { text: 'User Management', link: '/api-reference/users' }
        ]
      },
      {
        text: 'Integration',
        items: [
          { text: 'KYC with YeboVerify', link: '/kyc-integration' },
          { text: 'Webhooks', link: '/webhooks' }
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
      copyright: 'Copyright © 2024 YeboID'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/omegathesecond/yeboid-docs/edit/main/docs/:path',
      text: 'Edit this page'
    }
  },
  
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'one-dark-pro'
    }
  }
})
