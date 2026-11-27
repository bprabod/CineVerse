# CineVerse Auto Shorts (experimental)

This automation is isolated on the `feature/shorts-automation` branch. It does not modify the deployed website or `main`.

## What it does

- Runs daily at 14:00 Sri Lanka time, or manually from GitHub Actions.
- Checks TMDB for recent movie releases and skips IDs already processed.
- Generates a 15-second vertical motion-graphics Short with original animated backgrounds, rings, typography, and movie metadata.
- Uploads the MP4 publicly to YouTube and sends it to Telegram.
- Includes the CineVerse website URL in the video and description.

This version uses original text-led graphics only. It does not download movie scenes, posters, trailers, or soundtracks. It is not an AI video generator and cannot guarantee views or traffic. Review TMDB terms and YouTube policies before publishing.

## Required GitHub Actions secrets

In repository **Settings → Secrets and variables → Actions**, add:

| Secret | Purpose |
|---|---|
| `TMDB_API_KEY` | TMDB API v3 key |
| `YOUTUBE_CLIENT_ID` | Google OAuth client ID |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth client secret |
| `YOUTUBE_REFRESH_TOKEN` | Offline OAuth refresh token authorized for YouTube upload |
| `TELEGRAM_BOT_TOKEN` | Token from Telegram BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat/channel ID |

Never put credentials in source files or commit them.

## One-time YouTube setup

1. Create/select a Google Cloud project and enable YouTube Data API v3.
2. Configure OAuth consent and create an OAuth client.
3. Authorize the Google account that owns the channel with the `youtube.upload` scope and obtain an offline refresh token.
4. Add the three YouTube OAuth values as repository secrets. Keep the refresh token private.

Google may require OAuth verification or restrict uploads while an app is in testing. YouTube quota and channel restrictions also apply.

## One-time Telegram setup

1. Create a bot with BotFather and add its token as `TELEGRAM_BOT_TOKEN`.
2. Start a chat with the bot, or add it to the destination channel and grant posting permission.
3. Add the destination ID as `TELEGRAM_CHAT_ID`.

## Test

1. Add all six secrets.
2. Open **Actions → CineVerse Auto Shorts → Run workflow** on `feature/shorts-automation`.
3. A successful run uploads up to two Shorts and sends Telegram notifications.

GitHub scheduled workflows run only when the workflow exists on the default branch. Until this branch is reviewed and merged, use manual workflow dispatch. Do not merge until secrets are configured and a manual test succeeds.
