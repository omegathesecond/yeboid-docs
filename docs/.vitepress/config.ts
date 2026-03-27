import { defineConfig } from 'vitepress'

// Midnight Gold theme colors
const goldPrimary = '#D4AF37'
const goldLight = '#F5E6A3'
const darkBg = '#0A0A0F'
const darkSurface = '#1A1A2E'

export default defineConfig({
  title: 'YeboID',
  description: 'Identity & Authentication Platform for African Applications',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: goldPrimary }],
    ['meta', { property: 'og:title', content: 'YeboID Developer Documentation' }],
    ['meta', { property: 'og:description', content: 'Identity & Authentication Platform for African Applications' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'YeboID',

    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Flutter SDK', link: '/flutter-sdk' },
      { text: 'API', link: '/api-reference' },
      {
        text: 'Widgets',
        items: [
          { text: 'Login Button', link: '/widgets/login-button' },
          { text: 'Avatar', link: '/widgets/avatar' },
          { text: 'Profile Card', link: '/widgets/profile-card' },
          { text: 'Verify Button', link: '/widgets/verify-button' },
        ]
      },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started' },
          { text: 'Authentication', link: '/authentication' },
        ]
      },
      {
        text: 'Flutter SDK',
        items: [
          { text: 'Installation', link: '/flutter-sdk' },
          { text: 'Login Button', link: '/widgets/login-button' },
          { text: 'Avatar', link: '/widgets/avatar' },
          { text: 'Profile Card', link: '/widgets/profile-card' },
          { text: 'Verify Button', link: '/widgets/verify-button' },
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'REST API', link: '/api-reference' },
          { text: 'Webhooks', link: '/webhooks' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/omegathesecond/yeboid-docs' },
    ],

    footer: {
      message: 'Built by OmeVision',
      copyright: '© 2026 YeboID. All rights reserved.'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/omegathesecond/yeboid-docs/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            $gold-primary: ${goldPrimary};
            $gold-light: ${goldLight};
            $dark-bg: ${darkBg};
            $dark-surface: ${darkSurface};
          `
        }
      }
    }
  }
})
