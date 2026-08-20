# HYNBET production image: Node 20 + system FFmpeg.
# Do not ARG/ENV Kick, Redis, or API secrets. Railway injects those at runtime.
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/* \
  && node --version \
  && which ffmpeg \
  && ffmpeg -version \
  && which ffprobe \
  && ffprobe -version

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN npm run build \
  && node --version \
  && which ffmpeg \
  && ffmpeg -version \
  && which ffprobe \
  && ffprobe -version

CMD ["node", "server/src/index.js"]
