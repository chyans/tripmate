from flask import Blueprint, request, send_file, jsonify, after_this_request
import os
import gc
import subprocess
import tempfile
from PIL import Image
import traceback

export_bp = Blueprint("export_bp", __name__)

# ---------- locate ffmpeg binary ----------
def _get_ffmpeg():
    """Return the path to a working ffmpeg executable."""
    # 1. Try imageio_ffmpeg (bundled binary, works on all platforms)
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    # 2. Fallback: hope it's on PATH
    return "ffmpeg"

FFMPEG_BIN = _get_ffmpeg()
print(f"[export] using ffmpeg: {FFMPEG_BIN}")

# ---------- constants ----------
VIDEO_W, VIDEO_H = 960, 540
MAX_PHOTOS = 15
PHOTO_DURATION = 3            # seconds each image shows
VIDEO_MAX_SECONDS = 8         # cap embedded video clips
VIDEO_FPS = 12
FFMPEG_PRESET = "ultrafast"

# Limit PIL to avoid decompression bombs from huge camera photos
Image.MAX_IMAGE_PIXELS = 30_000_000   # ~30 MP


# ------------------------------------------------------------------
#  Helpers
# ------------------------------------------------------------------


def _photo_to_canvas(photo_path: str) -> str:
    """Open an image, downscale to video canvas, save as small JPEG temp file."""
    img = Image.open(photo_path)

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

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    canvas.save(tmp.name, "JPEG", quality=75)
    canvas.close()
    del canvas
    tmp.close()
    return tmp.name


def _image_to_segment(image_path: str, duration: float) -> str:
    """Convert a single JPEG image into a short MP4 segment using ffmpeg.

    This uses almost no RAM — ffmpeg reads one image, loops it for `duration`
    seconds, encodes on the fly, and writes the segment to disk.
    """
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    tmp_path = tmp.name
    tmp.close()

    cmd = [
        FFMPEG_BIN, "-y",
        "-loop", "1",
        "-i", image_path,
        "-t", str(duration),
        "-c:v", "libx264",
        "-preset", FFMPEG_PRESET,
        "-pix_fmt", "yuv420p",
        "-r", str(VIDEO_FPS),
        "-vf", f"scale={VIDEO_W}:{VIDEO_H}",
        "-an",
        tmp_path,
    ]

    result = subprocess.run(cmd, capture_output=True, timeout=30)
    if result.returncode != 0:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        stderr_tail = result.stderr.decode(errors="replace")[-300:]
        raise RuntimeError(f"image→segment failed: {stderr_tail}")

    return tmp_path


def _preprocess_video(input_path: str) -> str:
    """Shrink a video to a small, low-res MP4 segment using ffmpeg.

    Runs before any Python video processing so we never decode the
    original high-res frames in Python memory.
    """
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    tmp_path = tmp.name
    tmp.close()

    scale_filter = (
        f"scale={VIDEO_W}:{VIDEO_H}:"
        f"force_original_aspect_ratio=decrease,"
        f"pad={VIDEO_W}:{VIDEO_H}:(ow-iw)/2:(oh-ih)/2"
    )

    cmd = [
        FFMPEG_BIN, "-y",
        "-i", input_path,
        "-t", str(VIDEO_MAX_SECONDS),
        "-vf", scale_filter,
        "-c:v", "libx264",
        "-preset", FFMPEG_PRESET,
        "-pix_fmt", "yuv420p",
        "-crf", "28",
        "-an",
        "-r", str(VIDEO_FPS),
        tmp_path,
    ]

    result = subprocess.run(cmd, capture_output=True, timeout=60)
    if result.returncode != 0:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        stderr_tail = result.stderr.decode(errors="replace")[-300:]
        raise RuntimeError(f"video pre-process failed: {stderr_tail}")

    print(f"[export] pre-processed video → {os.path.getsize(tmp_path)} bytes")
    return tmp_path


def _video_to_still(video_path: str) -> str:
    """Fallback: extract one frame from a video, return as JPEG."""
    tmp_frame = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    tmp_path = tmp_frame.name
    tmp_frame.close()

    scale_filter = (
        f"scale={VIDEO_W}:{VIDEO_H}:"
        f"force_original_aspect_ratio=decrease,"
        f"pad={VIDEO_W}:{VIDEO_H}:(ow-iw)/2:(oh-ih)/2"
    )

    cmd = [
        FFMPEG_BIN, "-y",
        "-ss", "1",
        "-i", video_path,
        "-frames:v", "1",
        "-vf", scale_filter,
        tmp_path,
    ]

    result = subprocess.run(cmd, capture_output=True, timeout=15)
    if result.returncode != 0:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise RuntimeError("Could not extract frame from video")

    return tmp_path


def _resolve_photo_path(photo_info: dict, upload_folder: str):
    """Extract a local file path from a photo dict.  Returns (path, is_video)."""
    from urllib.parse import unquote

    photo_url = photo_info.get("url", "")
    if not photo_url:
        print(f"[export] resolve: empty url")
        return None, False

    # Decode any URL-encoded characters (e.g. %20 → space)
    photo_url = unquote(photo_url)

    fname = None
    if "/uploads/photos/" in photo_url:
        fname = photo_url.split("/uploads/photos/")[-1]
    elif "/api/photos/uploads/photos/" in photo_url:
        fname = photo_url.split("/api/photos/uploads/photos/")[-1]
    else:
        original = photo_info.get("filename", "")
        if original and os.path.isdir(upload_folder):
            for f in os.listdir(upload_folder):
                if original in f:
                    fname = f
                    break

    if not fname:
        print(f"[export] resolve: could not extract filename from url={photo_url}")
        return None, False

    path = os.path.join(upload_folder, fname)
    if not os.path.exists(path):
        # Log diagnostics so we can see what's happening on the server
        dir_exists = os.path.isdir(upload_folder)
        file_count = len(os.listdir(upload_folder)) if dir_exists else -1
        print(f"[export] resolve: FILE NOT FOUND")
        print(f"  url      = {photo_url}")
        print(f"  fname    = {fname}")
        print(f"  path     = {path}")
        print(f"  dir_exists = {dir_exists}, file_count = {file_count}")
        if dir_exists and file_count > 0 and file_count <= 20:
            print(f"  files    = {os.listdir(upload_folder)}")
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

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    payload = verify_token(token)
    if not payload:
        return jsonify({"error": "Invalid token"}), 401

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

    data = request.get_json()
    photos_dict = data.get("photos", {})

    if not photos_dict or not any(photos_dict.values()):
        return jsonify({"error": "No photos or videos to export"}), 400

    all_photos = []
    for location_name, photo_list in photos_dict.items():
        for photo in photo_list:
            all_photos.append({
                "url": photo.get("url", ""),
                "location": location_name,
                "filename": photo.get("filename", ""),
            })

    try:
        return _build_video(all_photos)
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": f"Failed to create video: {exc}"}), 500


# ------------------------------------------------------------------
#  Video builder  (ffmpeg concat – constant memory regardless of clip count)
# ------------------------------------------------------------------

def _build_video(all_photos: list):
    """Create an MP4 slideshow and return it via send_file.

    Strategy (all heavy lifting done by ffmpeg, not Python):
      1. PIL creates a labelled JPEG canvas for each photo  (~2 MB peak)
      2. ffmpeg converts each JPEG into a short MP4 segment  (~0 Python RAM)
      3. ffmpeg converts each uploaded video into a small MP4 segment
      4. ffmpeg concat demuxer joins all segments with stream-copy (~instant)

    Total Python RAM stays nearly flat no matter how many photos.
    """
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads", "photos")

    # Debug: show what we're working with
    dir_exists = os.path.isdir(UPLOAD_FOLDER)
    file_count = len(os.listdir(UPLOAD_FOLDER)) if dir_exists else -1
    print(f"[export] UPLOAD_FOLDER={UPLOAD_FOLDER}, exists={dir_exists}, files={file_count}")
    print(f"[export] processing {len(all_photos)} photo entries")

    segments = []       # paths to MP4 segments (in order)
    temp_files = []     # ALL temp files to clean up

    try:
        processed = 0
        for photo_info in all_photos:
            if processed >= MAX_PHOTOS:
                break

            path, is_video = _resolve_photo_path(photo_info, UPLOAD_FOLDER)
            if path is None:
                print(f"[export] skipped (not found): {photo_info.get('url', '?')}")
                continue

            # --- video → pre-processed MP4 segment ---
            if is_video:
                try:
                    seg_path = _preprocess_video(path)
                    temp_files.append(seg_path)
                    segments.append(seg_path)
                    processed += 1
                    print(f"[export] video segment: {os.path.basename(path)}")
                    continue
                except Exception as e:
                    print(f"[export] video segment failed ({os.path.basename(path)}): {e}")

                # Fallback: extract a still frame → image segment
                try:
                    still_path = _video_to_still(path)
                    temp_files.append(still_path)
                    seg_path = _image_to_segment(still_path, PHOTO_DURATION)
                    temp_files.append(seg_path)
                    segments.append(seg_path)
                    processed += 1
                    print(f"[export] video→still segment: {os.path.basename(path)}")
                    continue
                except Exception as e2:
                    print(f"[export] video→still also failed: {e2}")
                continue

            # --- image → JPEG canvas → MP4 segment ---
            try:
                canvas_path = _photo_to_canvas(path)
                temp_files.append(canvas_path)

                seg_path = _image_to_segment(canvas_path, PHOTO_DURATION)
                temp_files.append(seg_path)
                segments.append(seg_path)
                processed += 1
                print(f"[export] image segment: {os.path.basename(path)}")

                # Free PIL memory immediately
                gc.collect()
            except Exception as e:
                print(f"[export] image segment failed ({os.path.basename(path)}): {e}")
                gc.collect()
                continue

        if not segments:
            return jsonify({
                "error": "Could not process any photos. Make sure photos exist on the server."
            }), 500

        # --- concatenate all segments with ffmpeg concat demuxer ---
        print(f"[export] concatenating {len(segments)} segments …")

        # Write the concat list file
        concat_file = tempfile.NamedTemporaryFile(
            delete=False, suffix=".txt", mode="w"
        )
        for seg in segments:
            # ffmpeg concat demuxer needs forward-slash paths & escaped quotes
            safe_path = seg.replace("\\", "/").replace("'", "'\\''")
            concat_file.write(f"file '{safe_path}'\n")
        concat_file.close()
        temp_files.append(concat_file.name)

        out_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        out_path = out_file.name
        out_file.close()
        temp_files.append(out_path)

        cmd = [
            FFMPEG_BIN, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file.name,
            "-c", "copy",              # stream copy — no re-encode, instant
            "-movflags", "+faststart",
            out_path,
        ]

        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            stderr_tail = result.stderr.decode(errors="replace")[-400:]
            raise RuntimeError(f"concat failed: {stderr_tail}")

        print(f"[export] done — {os.path.getsize(out_path)} bytes")

        # Clean up everything except the final output
        for tf in temp_files:
            if tf == out_path:
                continue
            try:
                os.unlink(tf)
            except Exception:
                pass
        gc.collect()

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
        for tf in temp_files:
            try:
                os.unlink(tf)
            except Exception:
                pass
        gc.collect()
        raise
