# Discord Music Bot

A Discord bot that can play music from YouTube and other free sources.

## Features
- Play music from YouTube
- Queue system for multiple songs
- Basic playback controls (play, pause, resume, stop)
- Skip to next song
- Show current song information

## Setup
1. Install Python 3.8 or higher
2. Install FFmpeg (required for audio processing)
   - Windows: Download from https://ffmpeg.org/download.html
   - Linux: `sudo apt-get install ffmpeg`
   - macOS: `brew install ffmpeg`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the project root and add your Discord bot token:
   ```
   DISCORD_TOKEN=your_bot_token_here
   ```
5. Run the bot:
   ```bash
   python bot.py
   ```

## Commands
- `!play <url or search term>` - Play a song from YouTube
- `!pause` - Pause the current song
- `!resume` - Resume the paused song
- `!stop` - Stop playing and clear the queue
- `!skip` - Skip to the next song
- `!queue` - Show the current queue
- `!nowplaying` - Show information about the current song

## Note
This bot is for educational purposes only. Please respect YouTube's terms of service and copyright laws when using this bot.

## Hosting the Bot for Free

To keep your Discord music bot running 24/7, you can host it on a free platform like Railway. Here's a quick guide:

### Using Railway

1. Create a Railway account and install the Railway CLI.
2. Log in to Railway:
   ```bash
   railway login
   ```
3. Initialize your project:
   ```bash
   railway init
   ```
4. Add a `Procfile` to your project root with the following content:
   ```
   worker: python bot.py
   ```
5. Push your code to Railway:
   ```bash
   railway up
   ```
6. Set your Discord bot token as an environment variable in the Railway dashboard.

These steps will help you host your bot for free and keep it running constantly. Enjoy your Discord music bot! 