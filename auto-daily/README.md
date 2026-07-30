# auto-daily

The scheduled cloud agent writes one file here each morning — `pending.mjs`, a self-contained
Supabase publish script for that day's article (see `docs/AUTO_ARTICLE_PLAYBOOK.md`).

Pushing `auto-daily/pending.mjs` to `main` triggers the **Auto Daily Article** workflow
(`.github/workflows/auto-article.yml`), which inserts the article into Supabase using the repo
secrets, builds, deploys to Cloudflare Pages, and reports the live link to Telegram.

This folder is intentionally outside `deploy.yml`'s watched paths so the agent's push does not
also trigger a second (article-less) build.
