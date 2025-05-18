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

- Node.js 16.x or higher
- npm or yarn
- Discord Bot Token
- FFmpeg installed on your system

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd discord-music-bot
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

Run the bot in development mode with hot reloading:
```bash
npm run dev
```

## Deployment

The bot is configured for deployment on Railway. To deploy:

1. Push your changes to your repository
2. Railway will automatically detect the Node.js project and deploy it
3. Set up your environment variables in the Railway dashboard

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