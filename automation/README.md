# CineVerse Auto Shorts (experimental)

This automation is isolated on `feature/shorts-automation`. It does not change the deployed website or `main`.

## What it does

- Runs daily at 14:00 Sri Lanka time, or can be started manually from GitHub Actions.
- Checks TMDB for recent releases.
- Looks for a matching clip file named `automation/clips/TMDB_ID.mp4`.
- Converts the supplied clip into a vertical 9:16 Short (up to 25 seconds), adds the movie title and CineVerse branding, then uploads it publicly to YouTube.
- Uploads to YouTube only. There is no Telegram bot or Telegram notification code.

## Movie footage input

The automation does not fetch or rip movies from streaming sites. Add a clip that you own or are authorized to use at:

`automation/clips/TMDB_ID.mp4`

Replace `TMDB_ID` with the movie's numeric TMDB ID. Example filename: `automation/clips/603.mp4`. The source clip should be an MP4. If no matching clip exists, that movie is skipped; the workflow will not fall back to animated graphics. Use only footage you have permission to use.

## Required GitHub Actions secrets

In repository **Settings → Secrets and variables → Actions**, add:

| Secret | Purpose |
|---|---|
| `TMDB_API_KEY` | TMDB API v3 key |
| `YOUTUBE_CLIENT_ID` | Google OAuth client ID |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth client secret |
| `YOUTUBE_REFRESH_TOKEN` | Offline OAuth refresh token authorized for YouTube upload |

Never put credentials in source files or commit them.

## One-time YouTube setup

1. Enable YouTube Data API v3 in Google Cloud.
2. Configure OAuth and authorize the Google account that owns the channel with the `youtube.upload` scope.
3. Add the three YouTube OAuth values and TMDB API key as repository secrets.
4. Add an authorized movie clip to `automation/clips/` using its TMDB ID as the filename.

Google may require OAuth verification or restrict uploads while an app is in testing. YouTube quota and channel restrictions also apply.

## Test

Run **Actions → CineVerse Auto Shorts → Run workflow** on the feature branch. It uploads up to two matching Shorts per run. Scheduled GitHub workflows run only after the workflow is merged into the default branch.

This is a clip editor/uploader, not a movie-footage source finder. No clip is uploaded when there is no matching input file.
