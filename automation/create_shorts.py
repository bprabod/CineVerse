#!/usr/bin/env python3
"""Original text-led CineVerse Shorts generator. No movie footage or posters are used."""
import json
import os
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
import math
import requests
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "state" / "seen_movies.json"
OUT = ROOT / "output"
W, H, FPS, SECONDS = 720, 1280, 24, 15
SITE = "https://bprabod.github.io/CineVerse/"

def env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing GitHub Actions secret: {name}")
    return value

def font(size, bold=True):
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(path, size) if Path(path).exists() else ImageFont.load_default()

def wrap(draw, text, fnt, max_width):
    lines, line = [], ""
    for word in str(text or "").split():
        candidate = (line + " " + word).strip()
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= max_width:
            line = candidate
        else:
            if line: lines.append(line)
            line = word
    if line: lines.append(line)
    return lines

def render_frame(movie, index, total, path):
    phase = index / total
    im = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(im, "RGBA")
    for y in range(H):
        glow = max(0, 1 - abs(y / H - (0.32 + 0.04 * math.sin(phase * 6.28))) * 2)
        draw.line((0, y, W, y), fill=(7 + int(27*glow), 8 + int(3*glow), 19 + int(36*glow)))
    shift = int(38 * math.sin(phase * 6.28))
    for radius in (170, 270, 380):
        cx, cy = W//2 + shift, 355
        draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), outline=(229, 9, 20, 60), width=3)
    draw.rounded_rectangle((42, 68, W-42, 145), radius=18, fill=(229, 9, 20, 235))
    draw.text((W//2, 106), "CINEVERSE  •  NEW RELEASE", font=font(24), anchor="mm", fill="white")
    title = (movie.get("title") or "A New Movie").upper()
    y = 425
    for line in wrap(draw, title, font(57), W-100)[:3]:
        draw.text((W//2+3, y+4), line, font=font(57), anchor="mm", fill=(0,0,0,190))
        draw.text((W//2, y), line, font=font(57), anchor="mm", fill="white")
        y += 76
    date = movie.get("release_date") or "NEW MOVIE"
    draw.text((W//2, y+45), f"OUT NOW  •  {date}", font=font(26), anchor="mm", fill=(255,90,105,255))
    sy = 820
    for line in wrap(draw, movie.get("overview") or "A new story is waiting to be discovered.", font(23, False), W-130)[:4]:
        draw.text((W//2, sy), line, font=font(23, False), anchor="mm", fill=(230,230,240,255))
        sy += 42
    draw.rounded_rectangle((95, 1050, W-95, 1130), radius=18, fill=(255,255,255,240))
    draw.text((W//2, 1090), "DISCOVER MORE  •  CINEVERSE", font=font(22), anchor="mm", fill=(12,12,18,255))
    draw.text((W//2, 1190), "bprabod.github.io/CineVerse", font=font(20, False), anchor="mm", fill=(210,210,220,255))
    im.save(path, quality=90)

def create_video(movie, target):
    frames = OUT / f"frames_{movie['id']}"
    frames.mkdir(parents=True, exist_ok=True)
    total = FPS * SECONDS
    for i in range(total):
        render_frame(movie, i, total, frames / f"frame_{i:04d}.jpg")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
        "-i", str(frames / "frame_%04d.jpg"), "-vf", "format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-movflags", "+faststart", "-an", str(target)
    ], check=True)

def youtube_upload(movie, path):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    credentials = Credentials(
        None, refresh_token=env("YOUTUBE_REFRESH_TOKEN"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=env("YOUTUBE_CLIENT_ID"),
        client_secret=env("YOUTUBE_CLIENT_SECRET"),
        scopes=["https://www.googleapis.com/auth/youtube.upload"],
    )
    credentials.refresh(Request())
    service = build("youtube", "v3", credentials=credentials, cache_discovery=False)
    title = f"{movie.get('title', 'New Movie')} 🔥 | CineVerse #Shorts"[:100]
    description = (
        f"New movie discovery: {movie.get('title', 'New Movie')}\n\n"
        f"Discover more on CineVerse: {SITE}\n"
        "#CineVerse #MovieShorts #NewMovies #Shorts"
    )
    body = {
        "snippet": {"title": title, "description": description, "categoryId": "24",
                    "tags": ["CineVerse", "Movie Shorts", "New Movies"], "defaultLanguage": "en"},
        "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False},
    }
    media = MediaFileUpload(str(path), mimetype="video/mp4", resumable=True)
    result = service.videos().insert(part="snippet,status", body=body, media_body=media).execute()
    return "https://www.youtube.com/shorts/" + result["id"]

def telegram_send(movie, path, url):
    caption = f"🔥 CineVerse Short published!\n{movie.get('title')}\nYouTube: {url}\nWebsite: {SITE}"
    with path.open("rb") as video:
        response = requests.post(
            "https://api.telegram.org/bot" + env("TELEGRAM_BOT_TOKEN") + "/sendVideo",
            data={"chat_id": env("TELEGRAM_CHAT_ID"), "caption": caption},
            files={"video": ("cineverse-short.mp4", video, "video/mp4")}, timeout=180
        )
    response.raise_for_status()

def main():
    OUT.mkdir(exist_ok=True)
    today = datetime.now(timezone.utc).date()
    params = {
        "api_key": env("TMDB_API_KEY"),
        "sort_by": "primary_release_date.desc",
        "primary_release_date.gte": (today - timedelta(days=2)).isoformat(),
        "primary_release_date.lte": today.isoformat(),
        "include_adult": "false", "page": 1,
    }
    response = requests.get("https://api.themoviedb.org/3/discover/movie", params=params, timeout=30)
    response.raise_for_status()
    try: seen = set(json.loads(STATE.read_text(encoding="utf-8")))
    except (OSError, ValueError): seen = set()
    fresh = [m for m in response.json().get("results", []) if str(m["id"]) not in seen]
    fresh = fresh[:int(os.getenv("MAX_UPLOADS_PER_RUN", "2"))]
    if not fresh:
        print("No unprocessed recent releases.")
        return
    # Validate all publishing credentials before generating any files.
    for key in ("YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"):
        env(key)
    for movie in fresh:
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in movie.get("title", "movie"))[:45]
        video = OUT / f"{movie['id']}_{safe}.mp4"
        print("Creating original promo:", movie.get("title"))
        create_video(movie, video)
        link = youtube_upload(movie, video)
        telegram_send(movie, video, link)
        seen.add(str(movie["id"]))
        print("Published:", link)
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(sorted(seen)[-1000:], indent=2), encoding="utf-8")

if __name__ == "__main__":
    main()
