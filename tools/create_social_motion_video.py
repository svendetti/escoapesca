import math
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".tools" / "python"))

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "social-launch-kit" / "escoapesca-reel-story-tiktok-1080x1920.png"
OUTPUT = ROOT / "social-launch-kit" / "escoapesca-reel-motion-1080x1920.mp4"
FFMPEG = ROOT / ".tools" / "python" / "imageio_ffmpeg" / "binaries" / "ffmpeg-win-x86_64-v7.1.exe"

FPS = 30
DURATION = 6
FRAMES = FPS * DURATION
WIDTH = 1080
HEIGHT = 1920


def make_sweep(t: float) -> Image.Image:
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    cx, cy = 540, 850
    radius = 470
    angle = (t * 360 * 0.48 - 35) % 360
    for offset in range(0, 34, 2):
        alpha = max(0, 72 - offset * 2)
        draw.pieslice(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            start=angle + offset,
            end=angle + offset + 3,
            fill=(104, 255, 231, alpha),
        )
    return overlay.filter(ImageFilter.GaussianBlur(2.2))


def make_light_rays(t: float) -> Image.Image:
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    wobble = math.sin(t * math.tau * 0.35) * 22
    rays = [
        (110 + wobble, -80, -60 + wobble, 1920, (104, 255, 231, 28)),
        (545 - wobble * 0.7, -120, 315 - wobble * 0.4, 1920, (47, 143, 255, 22)),
    ]
    for x1, y1, x2, y2, color in rays:
        draw.line((x1, y1, x2, y2), fill=color, width=34)
    return overlay.filter(ImageFilter.GaussianBlur(18))


def make_bubbles(t: float) -> Image.Image:
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    bubbles = [
        (120, 12, 0.10, 0.85),
        (290, 8, 0.38, 0.70),
        (660, 15, 0.02, 0.95),
        (905, 10, 0.55, 0.78),
        (1010, 7, 0.22, 0.65),
    ]
    for x, size, phase, speed in bubbles:
        progress = (t * speed + phase) % 1
        y = HEIGHT + 80 - progress * (HEIGHT + 280)
        sway = math.sin((progress + phase) * math.tau * 2) * 28
        alpha = int(110 * math.sin(progress * math.pi))
        if alpha > 0:
            draw.ellipse(
                (x + sway - size, y - size, x + sway + size, y + size),
                outline=(104, 255, 231, alpha),
                width=2,
            )
    return overlay.filter(ImageFilter.GaussianBlur(0.25))


def pulse_overlay(t: float) -> Image.Image:
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    pulse = 0.5 + 0.5 * math.sin(t * math.tau * 0.9)
    draw.ellipse((768, 101, 789, 122), fill=(216, 255, 95, int(80 + pulse * 105)))
    return overlay.filter(ImageFilter.GaussianBlur(1.4))


def main() -> None:
    base = Image.open(SOURCE).convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    command = [
        str(FFMPEG),
        "-y",
        "-f",
        "rawvideo",
        "-vcodec",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(OUTPUT),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for i in range(FRAMES):
            t = i / FRAMES
            frame = base.copy().convert("RGBA")
            frame.alpha_composite(make_light_rays(t))
            frame.alpha_composite(make_sweep(t))
            frame.alpha_composite(make_bubbles(t))
            frame.alpha_composite(pulse_overlay(t))
            process.stdin.write(frame.convert("RGB").tobytes())
    finally:
        if process.stdin:
            process.stdin.close()
        return_code = process.wait()
        if return_code != 0:
            raise SystemExit(return_code)


if __name__ == "__main__":
    main()
