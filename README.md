# LearnCode

LearnCode is an adult-friendly daily learning lab for AI literacy and practical web development. It combines concise daily study, trusted source material, hands-on coding, and a progress calendar in a focused, colorful workspace.

## Learning experience

- A rotating 14-day AI lesson series with a short activity and knowledge check.
- Curated summaries that link to primary learning resources from Code.org, Google, MIT, AI4K12, UNESCO, Microsoft Learn, and the University of Helsinki.
- A six-part, roughly 60-minute creator quest covering HTML, CSS, JavaScript, accessibility, responsible AI, testing, and publishing.
- Four mini-game challenges and a monthly practice calendar.
- Beginner, intermediate, and challenge modes.
- Google sign-in and a guided learning journal when OAuth and the database are configured.

Lesson and practice progress is stored in the current browser. Journal submissions use the configured Cloudflare D1 database. The repository starts with no sample learner records.

## Run locally

Use Node.js 22.5 or newer. From this folder, run:

```sh
npm install
npm start
```

Open <http://127.0.0.1:8788>. The local preview can be used while Google sign-in is being configured. For Google sign-in, copy `.dev.vars.example` to `.dev.vars`, set a Google Web OAuth client ID, and authorize the local URL. Do not commit `.dev.vars` or real secrets.

## Deploy to Cloudflare Pages

1. Create a Cloudflare D1 database named `student-survey-db` and add its ID to `wrangler.toml`.
2. Initialize the database with `npm run db:remote`.
3. Add `GOOGLE_CLIENT_ID` and a strong `ADMIN_SECRET` as Cloudflare Pages variables/secrets. Configure Google OAuth and authorize the deployed domain.
4. Run `npx wrangler login`, then deploy with `npm run deploy`.
5. Add a custom domain in Cloudflare Pages if you want a branded address.

The public deployment needs the real Google OAuth client ID and D1 binding before sign-in and journal submissions work. Never publish secrets, `.dev.vars`, `.env` files, or the local `data/` folder.

## AI assistant integration

The referenced Lovable assistant project must be accessible before its model, instructions, or interface can be integrated. Keep provider credentials server-side when connecting an AI API.
