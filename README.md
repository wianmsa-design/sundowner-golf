# Sundowner Golf

Expo app. Two builds from one codebase:

- **Master app** (phone, editable): build normally with EAS. Scores are saved on the phone and
  automatically published to the `data` branch of this repo (`data.json`) about 10 seconds after each change.
  Set the GitHub token under Management > Setup > Website Publishing.
- **Website** (read-only): built by `.github/workflows/deploy.yml` with `EXPO_PUBLIC_READ_ONLY=true`
  and deployed to GitHub Pages. It reads `data.json` from the `data` branch and refreshes every minute.

Local web test: `EXPO_PUBLIC_READ_ONLY=true npx expo export --platform web && node scripts/postexport-web.js`
