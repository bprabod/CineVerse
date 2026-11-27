#!/usr/bin/env python3
"""Build YouTube Shorts from user-provided, authorized movie clips."""
import json
import os
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "state" / "seen_movies.json"
CLIPS = ROOT / "clips"
OUT = ROOT / "output"
SITE = "https://bprabod.github.io/CineVerse/"
MAX_SECONDS = 25

def env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing GitHub Actions secret: {name}")
    return value

def make_short(movie, clip, target):
    title_file = OUT / f"title_{movie['id']}.txt"
    title_file.write_text((movie.get("title") or "New Movie").replace("\\n", " ")[:80], encoding="utf-8")
    watermark_file = OUT / f"brand_{movie['id']}.txt"
    watermark_file.write_text("CINEVERSE  |  bprabod.github.io/CineVerse", encoding="utf-8")
    title_path = str(title_file.resolve())
    brand_path = str(watermark_file.resolve())
    vf = (
        "scale=720:1280:force_original_aspect_ratio=increase,"
        "crop=720:1280,"
        f"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile='{title_path}':"
        "fontcolor=white:fontsize=48:box=1:boxcolor=black@0.55:boxborderw=18:"
        "x=(w-text_w)/2:y=100,"
        f"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile='{brand_path}':"
        "fontcolor=white:fontsize=22:box=1:boxcolor=black@0.45:boxborderw=10:"
        "x=(w-text_w)/2:y=h-110,"
        "fps=30,format=yuv420p"
    )
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(clip),
        "-t", str(MAX_SECONDS), "-vf", vf, "-map", "0:v:0", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
        "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart",
        str(target)
    ], check=True)
    title_file.unlink(missing_ok=True)
    watermark_file.unlink(missing_ok=True)

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
    name = movie.get("title") or "New Movie"
    body = {
        "snippet": {
            "title": f"{name} 🔥 | CineVerse #Shorts"[:100],
            "description": f"Discover more on CineVerse: {SITE}\n#CineVerse #MovieShorts #Shorts",
            "categoryId": "24",
            "tags": ["CineVerse", "Movie Shorts", "Movies", "Shorts"],
            "defaultLanguage": "en",
        },
        "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False},
    }
    media = MediaFileUpload(str(path), mimetype="video/mp4", resumable=True)
    result = service.videos().insert(part="snippet,status", body=body, media_body=media).execute()
    return "https://www.youtube.com/shorts/" + result["id"]

def main():
    OUT.mkdir(exist_ok=True)
    CLIPS.mkdir(exist_ok=True)
    today = datetime.now(timezone.utc).date()
    params = {
        "api_key": env("TMDB_API_KEY"),
        "sort_by": "primary_release_date.desc",
        "primary_release_date.gte": (today - timedelta(days=2)).isoformat(),
        "primary_release_date.lte": today.isoformat(),
        "include_adult": "false",
        "page": 1,
    }
    response = requests.get("https://api.themoviedb.org/3/discover/movie", params=params, timeout=30)
    response.raise_for_status()
    try:
        seen = set(json.loads(STATE.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        seen = set()
    # Only use clip files explicitly supplied in automation/clips and named by TMDB ID.
    candidates = []
    for movie in response.json().get("results", []):
        movie_id = str(movie["id"])
        clip = CLIPS / f"{movie_id}.mp4"
        if movie_id not in seen and clip.is_file():
            candidates.append((movie, clip))
    candidates = candidates[:int(os.getenv("MAX_UPLOADS_PER_RUN", "2"))]
    if not candidates:
        print("No new releases have a matching authorized clip in automation/clips/. Nothing uploaded.")
        return
    for key in ("YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"):
        env(key)
    for movie, clip in candidates:
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in (movie.get("title") or "movie"))[:45]
        video = OUT / f"{movie['id']}_{safe}.mp4"
        print("Editing supplied clip for:", movie.get("title"))
        make_short(movie, clip, video)
        link = youtube_upload(movie, video)
        seen.add(str(movie["id"]))
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps(sorted(seen)[-1000:], indent=2), encoding="utf-8")
        print("Published:", link)

if __name__ == "__main__":
    main()
