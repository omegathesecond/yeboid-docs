import { readFile, writeFile } from 'node:fs/promises';
const pages=['ai-agents.md','app-verification.md','register-app.md','permissions.md','web-sdk/index.md','node-sdk/index.md','authentication/tokens.md','troubleshooting.md'];
const contents=await Promise.all(pages.map(async page=>'<!-- Source: https://docs.yeboid.com/'+page.replace(/index\.md$/,'').replace(/\.md$/,'')+' -->\n\n'+await readFile(new URL('../docs/'+page,import.meta.url),'utf8')));
await writeFile(new URL('../docs/public/llms-full.txt',import.meta.url),'# YeboID integration reference\n\n'+contents.join('\n\n---\n\n'));
