from flask import Blueprint, request, send_file, jsonify, make_response, after_this_request
import os
import gc
import tempfile
from PIL import Image, ImageDraw, ImageFont
import io
import traceback

export_bp = Blueprint("export_bp", __name__)

# ---------- MoviePy imports (optional) ----------
MOVIEPY_V2 = False
MOVIEPY_AVAILABLE = False
try:
    from moviepy import ImageClip, concatenate_videoclips, VideoFileClip
    MOVIEPY_AVAILABLE = True
    MOVIEPY_V2 = True
    print("MoviePy successfully imported (v2 direct import)")
except ImportError:
    try:
        from moviepy.editor import ImageClip, concatenate_videoclips, VideoFileClip
        MOVIEPY_AVAILABLE = True
        print("MoviePy successfully imported (v1 editor import)")
    except ImportError as e:
        print(f"MoviePy import failed: {e}")
except Exception as e:
    print(f"MoviePy import error: {type(e).__name__}: {e}")

# ---------- constants ----------
# Kept conservative so Railway (limited RAM) doesn't OOM-kill the worker.
# MoviePy holds ALL clips as numpy arrays in memory simultaneously.
#   960×540×3 bytes ≈ 1.5 MB per frame (vs 2.7 MB at 1280×720)
VIDEO_W, VIDEO_H = 960, 540
MAX_PHOTOS = 15
PHOTO_DURATION = 3            # seconds per photo
VIDEO_MAX_SECONDS = 8         # cap embedded video clips to 8s to save RAM
VIDEO_FPS = 12                # lower FPS = less frames in memory during encode
FFMPEG_PRESET = "ultrafast"

# Limit PIL to avoid decompression bombs from huge camera photos
Image.MAX_IMAGE_PIXELS = 30_000_000   # ~30 MP (covers most phone cameras)


# ------------------------------------------------------------------
#  Helpers
# ------------------------------------------------------------------

def _find_system_font():
    """Return a PIL ImageFont for text overlay (never fails)."""
    import platform
    candidates = (
        # Windows
        ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]
        if platform.system() == "Windows"
        else [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        ]
    )
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, 36)
            except Exception:
                continue
    # Last resort: try name-based
    for name in ["arial.ttf", "Arial", "DejaVuSans-Bold"]:
        try:
            return ImageFont.truetype(name, 36)
        except Exception:
            continue
    return ImageFont.load_default()


def _draw_label(canvas: Image.Image, text: str, font: ImageFont.ImageFont):
    """Draw a location label near the top-left of *canvas* (in-place)."""
    draw = ImageDraw.Draw(canvas)
    x, y = 30, 20
    # shadow / outline
    for dx, dy in [(-2, -2), (-2, 2), (2, -2), (2, 2), (0, -2), (0, 2), (-2, 0), (2, 0)]:
        draw.text((x + dx, y + dy), text, fill=(0, 0, 0), font=font)
    draw.text((x, y), text, fill=(255, 255, 255), font=font)


def _photo_to_canvas(photo_path: str, location_name: str, font: ImageFont.ImageFont) -> str:
    """Open an image, aggressively downscale, draw label, save as small JPEG temp file.
    
    Large camera photos (e.g. 4000×3000, 12 MP) are reduced via PIL's draft()
    *before* fully decoding, so they never occupy full resolution in RAM.
    """
    img = Image.open(photo_path)

    # Use draft() for JPEG to load at a reduced resolution directly from the decoder.
    # This avoids ever allocating the full-res pixel buffer in memory.
    if img.format == "JPEG" and (img.width > VIDEO_W * 2 or img.height > VIDEO_H * 2):
        img.draft("RGB", (VIDEO_W, VIDEO_H))

    img = img.convert("RGB")
    img.thumbnail((VIDEO_W, VIDEO_H), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (VIDEO_W, VIDEO_H), (0, 0, 0))
    x_off = (VIDEO_W - img.width) // 2
    y_off = (VIDEO_H - img.height) // 2
    canvas.paste(img, (x_off, y_off))
    img.close()
    del img

    _draw_label(canvas, location_name, font)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    canvas.save(tmp.name, "JPEG", quality=75)
    canvas.close()
    del canvas
    tmp.close()
    return tmp.name


def _resolve_photo_path(photo_info: dict, upload_folder: str):
    """Extract a local file path from a photo dict.  Returns (path, is_video)."""
    photo_url = photo_info.get("url", "")
    if not photo_url:
        return None, False

    # Extract filename from known URL patterns
    if "/uploads/photos/" in photo_url:
        fname = photo_url.split("/uploads/photos/")[-1]
    elif "/api/photos/uploads/photos/" in photo_url:
        fname = photo_url.split("/api/photos/uploads/photos/")[-1]
    else:
        # Try matching by original filename
        original = photo_info.get("filename", "")
        if original and os.path.isdir(upload_folder):
            for f in os.listdir(upload_folder):
                if original in f:
                    fname = f
                    break
            else:
                return None, False
        else:
            return None, False

    path = os.path.join(upload_folder, fname)
    if not os.path.exists(path):
        return None, False

    ext = os.path.splitext(fname)[1].lower()
    is_video = ext in {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    return path, is_video


# ------------------------------------------------------------------
#  Main endpoint
# ------------------------------------------------------------------

@export_bp.route("/video", methods=["POST"])
def export_video():
    """Generate an MP4 slideshow from trip photos."""
    from routes.auth import verify_token
    from db import get_db_connection

    # --- auth ---
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"error": "Invalid token"}), 401

    # --- premium check ---
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT is_premium, is_admin FROM users WHERE id = %s", (payload["user_id"],))
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        is_premium = bool(user[0]) if user[0] else False
        is_admin = bool(user[1]) if len(user) > 1 and user[1] else False
        if not is_premium and not is_admin:
            return jsonify({"error": "Video export is only available for premium users or admins"}), 403
    finally:
        cur.close()
        conn.close()

    # --- payload ---
    data = request.get_json()
    photos_dict = data.get("photos", {})

    if not photos_dict or not any(photos_dict.values()):
        return jsonify({"error": "No photos or videos to export"}), 400

    if not MOVIEPY_AVAILABLE:
        return jsonify({"error": "MoviePy is not installed on the server."}), 500

    # Collect photos
    all_photos = []
    for location_name, photo_list in photos_dict.items():
        for photo in photo_list:
            all_photos.append({
                "url": photo.get("url", ""),
                "location": location_name,
                "filename": photo.get("filename", ""),
            })

    # --- build video ---
    try:
        return _build_video(all_photos)
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": f"Failed to create video: {exc}"}), 500


# ------------------------------------------------------------------
#  Video builder  (PIL text → ImageClip → concatenate → write)
# ------------------------------------------------------------------

def _build_video(all_photos: list):
    """Create an MP4 slideshow and return it via send_file."""
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads", "photos")

    font = _find_system_font()
    clips = []
    temp_files = []          # files to clean up when done

    try:
        processed = 0
        for photo_info in all_photos:
            if processed >= MAX_PHOTOS:
                break

            path, is_video = _resolve_photo_path(photo_info, UPLOAD_FOLDER)
            if path is None:
                print(f"[export] skipped (not found): {photo_info.get('url', '?')}")
                continue

            location = photo_info.get("location", "Trip")

            # --- embedded video clip ---
            if is_video:
                vclip = None
                try:
                    vclip = VideoFileClip(path, audio=False)

                    # Cap duration FIRST (before resize) to limit how many frames
                    # MoviePy needs to hold — this is the biggest RAM saver for videos.
                    if vclip.duration and vclip.duration > VIDEO_MAX_SECONDS:
                        try:
                            vclip = vclip.subclipped(0, VIDEO_MAX_SECONDS)
                        except AttributeError:
                            vclip = vclip.subclip(0, VIDEO_MAX_SECONDS)
                        print(f"[export] capped video to {VIDEO_MAX_SECONDS}s")

                    # Resize to target resolution
                    try:
                        vclip = vclip.resized((VIDEO_W, VIDEO_H))
                    except AttributeError:
                        vclip = vclip.resize((VIDEO_W, VIDEO_H))

                    clips.append(vclip)
                    processed += 1
                    dur = round(vclip.duration, 1) if vclip.duration else "?"
                    print(f"[export] video clip: {os.path.basename(path)} ({dur}s)")
                    gc.collect()
                    continue
                except Exception as e:
                    print(f"[export] video clip failed ({os.path.basename(path)}): {e}")
                    if vclip:
                        try:
                            vclip.close()
                        except Exception:
                            pass
                    gc.collect()
                    continue

            # --- image → canvas with text → ImageClip ---
            try:
                tmp_path = _photo_to_canvas(path, location, font)
                temp_files.append(tmp_path)
                clip = ImageClip(tmp_path, duration=PHOTO_DURATION)
                clips.append(clip)
                processed += 1
                print(f"[export] image clip: {os.path.basename(path)}")
                gc.collect()
            except Exception as e:
                print(f"[export] image clip failed ({os.path.basename(path)}): {e}")
                gc.collect()
                continue

        if not clips:
            return jsonify({
                "error": "Could not process any photos. Make sure photos exist on the server."
            }), 500

        # --- concatenate & write ---
        print(f"[export] concatenating {len(clips)} clips …")
        final = concatenate_videoclips(clips, method="compose")

        out_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        out_path = out_file.name
        out_file.close()
        temp_files.append(out_path)

        print(f"[export] writing MP4 (fps={VIDEO_FPS}, preset={FFMPEG_PRESET}) …")
        final.write_videofile(
            out_path,
            fps=VIDEO_FPS,
            codec="libx264",
            audio=False,
            logger=None,
            preset=FFMPEG_PRESET,
            threads=1,              # single thread = lower peak RAM
        )
        print(f"[export] done — {os.path.getsize(out_path)} bytes")

        # Free moviepy resources BEFORE sending file
        try:
            final.close()
        except Exception:
            pass
        for c in clips:
            try:
                c.close()
            except Exception:
                pass
        clips.clear()
        gc.collect()

        # Clean up temp images (but NOT the video file yet)
        for tf in temp_files[:-1]:
            try:
                os.unlink(tf)
            except Exception:
                pass

        # Schedule cleanup of the video file after the response is sent
        video_path_to_clean = out_path

        @after_this_request
        def cleanup(response):
            try:
                os.unlink(video_path_to_clean)
            except Exception:
                pass
            return response

        return send_file(
            out_path,
            mimetype="video/mp4",
            as_attachment=True,
            download_name="trip-recap.mp4",
        )

    except Exception:
        # On error, clean up everything
        for c in clips:
            try:
                c.close()
            except Exception:
                pass
        for tf in temp_files:
            try:
                os.unlink(tf)
            except Exception:
                pass
        gc.collect()
        raise
