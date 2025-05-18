FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y ca-certificates ffmpeg && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your code
COPY . .

# Expose port for FastAPI (if needed)
EXPOSE 8000

# Start your bot
CMD ["python", "bot.py"] 