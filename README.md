# YeboID Documentation

Developer documentation for YeboID - Universal Authentication for Africa.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run docs:dev

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview
```

## Deployment

This site is deployed to Cloudflare Pages automatically on push to `main`.

Manual deployment:
```bash
npm run docs:build
npx wrangler pages deploy docs/.vitepress/dist --project-name=yeboid-docs
```

## License

MIT
