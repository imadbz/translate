import 'dotenv/config';
import { startServer } from '../../../packages/server/src/index.js';

const server = startServer({}, 3100);

// Configure locales for the simple-app project
setTimeout(async () => {
  await fetch('http://localhost:3100/projects/simple-app/locales', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locales: ['en', 'fr', 'ar'] }),
  });
  console.log('Configured simple-app with locales: en, fr, ar');
}, 500);
