from flask import Blueprint, request, send_file, jsonify
import os
import tempfile
from PIL import Image, ImageDraw, ImageFont
import io
import requests
from urllib.parse import urlparse

export_bp = Blueprint("export_bp", __name__)

# Try to import moviepy, but make it optional
# MoviePy 2.x changed the import structure
try:
    # Try new import path first (MoviePy 2.x)
    from moviepy import ImageClip, concatenate_videoclips, TextClip, CompositeVideoClip, VideoFileClip
    MOVIEPY_AVAILABLE = True
    print("MoviePy successfully imported (direct import)")
except ImportError:
    try:
        # Fallback to old import path (MoviePy 1.x)
        from moviepy.editor import ImageClip, concatenate_videoclips, TextClip, CompositeVideoClip, VideoFileClip
        MOVIEPY_AVAILABLE = True
        print("MoviePy successfully imported (editor import)")
    except ImportError as e:
        MOVIEPY_AVAILABLE = False
        print(f"MoviePy import failed: {e}")
except Exception as e:
    MOVIEPY_AVAILABLE = False
    print(f"MoviePy import error: {type(e).__name__}: {e}")

@export_bp.route("/video", methods=["POST"])
def export_video():
    # Check if user is premium or admin (check database for current status)
    from routes.auth import verify_token
    from db import get_db_connection
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({"error": "Invalid token"}), 401
    
    # Check database for current premium/admin status (not just from token)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT is_premium, is_admin FROM users WHERE id = %s",
            (payload["user_id"],)
        )
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
    locations = data.get("locations", [])
    photos = data.get("photos", {})
    route_data = data.get("routeData", {})

    if not photos or not any(photos.values()):
        return jsonify({"error": "No photos or videos to export"}), 400

    # Collect all photos in order
    all_photos = []
    for location_name, photo_list in photos.items():
        for photo in photo_list:
            all_photos.append({
                "url": photo.get("url", ""),
                "location": location_name,
                "filename": photo.get("filename", "")
            })

    if not MOVIEPY_AVAILABLE:
        from flask import make_response
        response = make_response(jsonify({"error": "MoviePy is not installed. Please install it to use video export."}), 500)
        response.headers['Content-Type'] = 'application/json'
        return response
    
    try:
        return create_moviepy_video(all_photos, locations, route_data)
    except Exception as e:
        print(f"MoviePy error: {e}")
        import traceback
        traceback.print_exc()
        from flask import make_response
        response = make_response(jsonify({"error": f"Failed to create video: {str(e)}"}), 500)
        response.headers['Content-Type'] = 'application/json'
        return response

def create_simple_video(photos, locations, route_data):
    """Create a simple video using PIL (fallback)"""
    # Create a simple image sequence as a placeholder
    # In production, you'd want to use a proper video library
    
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frames = []
    for photo_info in photos[:10]:  # Limit to 10 photos for demo
        try:
            # Load image from URL
            photo_filename = photo_info["url"].split("/")[-1]
            photo_path = os.path.join(BASE_DIR, "uploads", "photos", photo_filename)
            if os.path.exists(photo_path):
                img = Image.open(photo_path)
                img = img.resize((1920, 1080), Image.Resampling.LANCZOS)
                
                # Add text overlay
                draw = ImageDraw.Draw(img)
                try:
                    font = ImageFont.truetype("arial.ttf", 60)
                except:
                    font = ImageFont.load_default()
                
                text = photo_info.get("location", "Trip Photo")
                draw.text((50, 50), text, fill=(255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
                frames.append(img)
        except Exception as e:
            print(f"Error processing photo: {e}")
            continue

    if not frames:
        return jsonify({"error": "Could not process any photos or videos"}), 500

    # Save as a simple animated GIF (since we can't create MP4 without moviepy)
    output = io.BytesIO()
    frames[0].save(
        output,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=2000,  # 2 seconds per frame
        loop=0
    )
    output.seek(0)
    
    return send_file(
        output,
        mimetype="image/gif",
        as_attachment=True,
        download_name="trip-recap.gif"
    )

def create_moviepy_video(photos, locations, route_data):
    """Create video using MoviePy"""
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads", "photos")
    clips = []
    temp_files = []
    
    try:
        for photo_info in photos[:30]:  # Limit to 30 photos
            try:
                # Extract filename from URL
                photo_url = photo_info.get("url", "")
                if not photo_url:
                    continue
                
                # Extract filename from URL path
                # URL format: /api/photos/uploads/photos/{unique_filename}
                # or: /uploads/photos/{unique_filename}
                if "/uploads/photos/" in photo_url:
                    photo_filename = photo_url.split("/uploads/photos/")[-1]
                elif "/api/photos/uploads/photos/" in photo_url:
                    photo_filename = photo_url.split("/api/photos/uploads/photos/")[-1]
                else:
                    # Fallback: try to get from filename field and search
                    original_filename = photo_info.get("filename", "")
                    if original_filename:
                        # Search for file that contains the original filename
                        for file in os.listdir(UPLOAD_FOLDER):
                            if original_filename in file:
                                photo_filename = file
                                break
                        else:
                            continue
                    else:
                        continue
                
                photo_path = os.path.join(UPLOAD_FOLDER, photo_filename)
                
                if not os.path.exists(photo_path):
                    print(f"File not found: {photo_path}")
                    continue
                
                # Check if file is a video or image
                file_ext = os.path.splitext(photo_filename)[1].lower()
                is_video = file_ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']
                
                if is_video:
                    # Handle video file
                    video_clip = None
                    try:
                        # Load video clip (without audio to avoid concatenation issues with image clips)
                        video_clip = VideoFileClip(photo_path, audio=False)
                        
                        # Resize video to 1920x1080 — handle both MoviePy 1.x and 2.x API
                        try:
                            video_clip = video_clip.resized((1920, 1080))
                        except AttributeError:
                            video_clip = video_clip.resize((1920, 1080))
                        
                        # Limit video duration to 5 seconds max
                        if video_clip.duration > 5:
                            try:
                                video_clip = video_clip.subclipped(0, 5)
                            except AttributeError:
                                video_clip = video_clip.subclip(0, 5)
                        
                        # Add text overlay with location name
                        location_name = photo_info.get("location", "Trip Video")
                        try:
                            txt_clip = TextClip(
                                location_name,
                                fontsize=70,
                                color="white",
                                font="Arial-Bold",
                                stroke_color="black",
                                stroke_width=3,
                                size=(1800, None),
                                method="caption"
                            )
                            try:
                                txt_clip = txt_clip.with_position(("center", 50)).with_duration(video_clip.duration)
                            except AttributeError:
                                txt_clip = txt_clip.set_position(("center", 50)).set_duration(video_clip.duration)
                            
                            video_clip = CompositeVideoClip([video_clip, txt_clip])
                        except:
                            # If TextClip fails, just use the video without text
                            pass
                        
                        clips.append(video_clip)
                        continue
                    except Exception as e:
                        print(f"Error processing video {photo_info.get('filename', 'unknown')}: {e}")
                        import traceback
                        traceback.print_exc()
                        # Try to close the clip if it was opened
                        if video_clip is not None:
                            try:
                                video_clip.close()
                            except:
                                pass
                        continue
                
                # Handle image file
                # Load and resize image
                img = Image.open(photo_path)
                # Resize to 1920x1080 maintaining aspect ratio
                img.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
                
                # Create a 1920x1080 canvas with black background
                canvas = Image.new("RGB", (1920, 1080), (0, 0, 0))
                # Center the image
                x_offset = (1920 - img.width) // 2
                y_offset = (1080 - img.height) // 2
                canvas.paste(img, (x_offset, y_offset))
                
                # Save to temporary file for MoviePy
                temp_img = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
                canvas.save(temp_img.name, "JPEG", quality=95)
                temp_files.append(temp_img.name)
                
                # Create image clip (3 seconds per photo)
                clip = ImageClip(temp_img.name, duration=3)
                
                # Add text overlay with location name
                location_name = photo_info.get("location", "Trip Photo")
                try:
                    txt_clip = TextClip(
                        location_name,
                        fontsize=70,
                        color="white",
                        font="Arial-Bold",
                        stroke_color="black",
                        stroke_width=3,
                        size=(1800, None),
                        method="caption"
                    )
                    try:
                        txt_clip = txt_clip.with_position(("center", 50)).with_duration(3)
                    except AttributeError:
                        txt_clip = txt_clip.set_position(("center", 50)).set_duration(3)
                except:
                    # Fallback if TextClip fails
                    txt_clip = None
                
                # Composite video with text overlay
                if txt_clip:
                    video = CompositeVideoClip([clip, txt_clip])
                else:
                    video = clip
                
                clips.append(video)
            except Exception as e:
                print(f"Error processing photo {photo_info.get('filename', 'unknown')}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        if not clips:
            from flask import make_response
            response = make_response(jsonify({"error": "Could not process any photos or videos"}), 500)
            response.headers['Content-Type'] = 'application/json'
            return response
        
        # Concatenate all clips
        print(f"Creating video with {len(clips)} clips...")
        final_video = concatenate_videoclips(clips, method="compose")
        
        # Export to temporary file
        temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        temp_files.append(temp_video.name)
        
        print("Writing video file...")
        # MoviePy 2.x removed verbose parameter, use logger instead
        try:
            # Try with logger parameter (MoviePy 2.x)
            final_video.write_videofile(
                temp_video.name,
                fps=24,
                codec="libx264",
                audio=False,
                logger=None,
                preset="medium"
            )
        except TypeError:
            # Fallback for older MoviePy versions that might need verbose
            try:
                final_video.write_videofile(
                    temp_video.name,
                    fps=24,
                    codec="libx264",
                    audio=False,
                    verbose=False,
                    logger=None,
                    preset="medium"
                )
            except TypeError:
                # Last resort: minimal parameters
                final_video.write_videofile(
                    temp_video.name,
                    fps=24,
                    codec="libx264",
                    audio=False
                )
        
        # Clean up temporary image files
        for temp_file in temp_files[:-1]:  # Keep the video file
            try:
                os.unlink(temp_file)
            except:
                pass
        
        # Close video to free resources
        final_video.close()
        for clip in clips:
            clip.close()
        
        return send_file(
            temp_video.name,
            mimetype="video/mp4",
            as_attachment=True,
            download_name="trip-recap.mp4"
        )
    except Exception as e:
        # Clean up on error
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass
        raise e

