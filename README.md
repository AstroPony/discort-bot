# Discord Music Bot

A robust Discord music bot built with Node.js, featuring YouTube playback, error handling, and modular command structure.

## Features

- YouTube music playback
- Global error handling
- Environment variable validation
- Modular command and event system
- Rate limiting and retry mechanism
- Permission management
- Health check endpoint for Railway

## Prerequisites

- Node.js 22.12 or higher (required by `@discordjs/voice` 0.19)
- npm
- Discord Bot Token
- [FFmpeg](https://ffmpeg.org/) (with libopus) on your `PATH`
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) on your `PATH` — keep it updated (`yt-dlp -U`), YouTube changes often

Set `FFMPEG_PATH` / `YTDLP_PATH` in `.env` if they're not on your `PATH`.

Discord requires the DAVE end-to-end encryption protocol for voice since March 2026; `@discordjs/voice` 0.19 handles this via `@snazzah/davey`.

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd discort-bot
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file and fill in your values:
```bash
cp .env.example .env
```

4. Update the `.env` file with your Discord bot token and other configuration.

## Development

Register the slash commands (needed once, and whenever a command's options change):
```bash
npm run deploy-commands
```

Run the bot in development mode with hot reloading:
```bash
npm run dev
```

## Deployment

The bot deploys to Railway using the included `Dockerfile` (Node 22 + ffmpeg + yt-dlp). To deploy:

1. Push your changes to your repository
2. Railway builds the Dockerfile and runs `npm start`
3. Set `DISCORD_TOKEN` and `CLIENT_ID` in the Railway dashboard

Each rebuild pulls the latest yt-dlp. If YouTube playback breaks, redeploy first.

## Commands

- `/play <url>` - Play a song from YouTube
- More commands coming soon...

## Error Handling

The bot includes comprehensive error handling for:
- Uncaught exceptions
- Unhandled rejections
- YouTube API errors
- Voice connection issues

## License

MIT 