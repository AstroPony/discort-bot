import os
import discord
from discord.ext import commands
import yt_dlp
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn
import threading

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI()

@app.get("/")
async def root():
    return {"status": "online", "message": "Discord bot is running"}

# Bot configuration
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

# YouTube downloader configuration
ytdl_format_options = {
    'format': 'bestaudio/best',
    'restrictfilenames': True,
    'noplaylist': True,
    'nocheckcertificate': True,
    'ignoreerrors': False,
    'logtostderr': False,
    'quiet': True,
    'no_warnings': True,
    'default_search': 'auto',
    'source_address': '0.0.0.0',
    'extract_flat': True,
    'no_check_certificate': True,
    'prefer_insecure': True
}

ffmpeg_options = {
    'options': '-vn',
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5'
}

ytdl = yt_dlp.YoutubeDL(ytdl_format_options)

class YTDLSource(discord.PCMVolumeTransformer):
    def __init__(self, source, *, data, volume=0.5):
        super().__init__(source, volume)
        self.data = data
        self.title = data.get('title')
        self.url = data.get('url')

    @classmethod
    async def from_url(cls, url, *, loop=None, stream=False):
        loop = loop or asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: ytdl.extract_info(url, download=not stream))

        if 'entries' in data:
            # Take first item from a playlist
            data = data['entries'][0]

        filename = data['url'] if stream else ytdl.prepare_filename(data)
        return cls(discord.FFmpegPCMAudio(filename, **ffmpeg_options), data=data)

class MusicPlayer:
    def __init__(self, ctx):
        self.bot = ctx.bot
        self.guild = ctx.guild
        self.channel = ctx.channel
        self.cog = ctx.cog

        self.queue = asyncio.Queue()
        self.next = asyncio.Event()

        self.current = None
        ctx.bot.loop.create_task(self.player_loop())

    async def player_loop(self):
        await self.bot.wait_until_ready()

        while not self.bot.is_closed():
            self.next.clear()

            try:
                # Wait for the next song. If we timeout, player is disconnected
                async with asyncio.timeout(300):  # 5 minutes
                    source = await self.queue.get()
            except asyncio.TimeoutError:
                return await self.destroy(self.guild)

            if not isinstance(source, YTDLSource):
                try:
                    source = await YTDLSource.from_url(source, loop=self.bot.loop, stream=True)
                except Exception as e:
                    await self.channel.send(f'An error occurred while processing this song: {str(e)}')
                    continue

            source.volume = 0.5
            self.current = source

            self.guild.voice_client.play(source, after=lambda _: self.bot.loop.call_soon_threadsafe(self.next.set))
            await self.channel.send(f'Now playing: {source.title}')

            await self.next.wait()

            # Make sure the FFmpeg process is cleaned up
            source.cleanup()
            self.current = None

    async def destroy(self, guild):
        """Disconnect and cleanup the player."""
        try:
            await guild.voice_client.disconnect()
        except AttributeError:
            pass

class Music(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.players = {}

    def get_player(self, ctx):
        """Retrieve the guild player, or create one if it does not exist."""
        try:
            player = self.players[ctx.guild.id]
        except KeyError:
            player = MusicPlayer(ctx)
            self.players[ctx.guild.id] = player

        return player

    @commands.command()
    async def play(self, ctx, *, url):
        """Play a song from YouTube."""
        async with ctx.typing():
            player = self.get_player(ctx)

            if not ctx.author.voice:
                return await ctx.send("You are not connected to a voice channel.")

            if not ctx.voice_client:
                await ctx.author.voice.channel.connect()

            await player.queue.put(url)
            await ctx.send(f'Added to queue: {url}')

    @commands.command()
    async def pause(self, ctx):
        """Pause the currently playing song."""
        if not ctx.voice_client or not ctx.voice_client.is_playing():
            return await ctx.send("I am not playing anything at the moment.")

        ctx.voice_client.pause()
        await ctx.send("⏸ Paused")

    @commands.command()
    async def resume(self, ctx):
        """Resume the currently paused song."""
        if not ctx.voice_client or not ctx.voice_client.is_paused():
            return await ctx.send("I am not paused at the moment.")

        ctx.voice_client.resume()
        await ctx.send("▶ Resumed")

    @commands.command()
    async def stop(self, ctx):
        """Stop the player and clear the queue."""
        if not ctx.voice_client:
            return await ctx.send("I am not playing anything at the moment.")

        ctx.voice_client.stop()
        await ctx.send("⏹ Stopped")

    @commands.command()
    async def skip(self, ctx):
        """Skip the current song."""
        if not ctx.voice_client or not ctx.voice_client.is_playing():
            return await ctx.send("I am not playing anything at the moment.")

        ctx.voice_client.stop()
        await ctx.send("⏭ Skipped")

    @commands.command()
    async def queue(self, ctx):
        """Show the current queue."""
        player = self.get_player(ctx)
        if player.queue.empty():
            return await ctx.send("The queue is empty.")

        queue_list = []
        for i in range(player.queue.qsize()):
            queue_list.append(await player.queue.get())

        queue_text = "\n".join([f"{i+1}. {item}" for i, item in enumerate(queue_list)])
        await ctx.send(f"**Queue:**\n{queue_text}")

        # Put items back in queue
        for item in queue_list:
            await player.queue.put(item)

    @commands.command()
    async def nowplaying(self, ctx):
        """Show information about the current song."""
        player = self.get_player(ctx)
        if not player.current:
            return await ctx.send("I am not playing anything at the moment.")

        await ctx.send(f"**Now Playing:** {player.current.title}")

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user.name} (ID: {bot.user.id})')
    print('------')
    await setup(bot)

async def setup(bot):
    await bot.add_cog(Music(bot))

# Run the bot
async def run_bot():
    await bot.start(os.getenv('DISCORD_TOKEN'))

def run_server():
    port = int(os.getenv('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

if __name__ == "__main__":
    # Start the FastAPI server in a separate thread
    server_thread = threading.Thread(target=run_server)
    server_thread.start()
    
    # Run the bot
    asyncio.run(run_bot()) 