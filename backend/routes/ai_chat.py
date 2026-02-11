"""
TripMate AI Chat Route
Uses TF-IDF retrieval to answer questions directly from the dataset.
No LLM/API calls - pure dataset retrieval.
"""

from flask import Blueprint, request, jsonify
import os
import sys
from routes.auth import verify_token

ai_bp = Blueprint("ai_bp", __name__)

# Import the dataset-only chat service
try:
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from retrieval_augmented_ai import get_rai_service
    RAI_SERVICE_AVAILABLE = True
    print("Dataset-only chat service imported successfully")
except Exception as e:
    print(f"Warning: Could not import dataset-only chat service: {e}")
    import traceback
    traceback.print_exc()
    RAI_SERVICE_AVAILABLE = False


@ai_bp.route("/chat/usage", methods=["GET"])
def get_chat_usage():
    """
    Get AI chat usage count for a trip (for free users).
    Query params: trip_id
    """
    # Check authentication
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({"error": "Invalid token"}), 401
    
    # Premium users have unlimited questions
    if payload.get("is_premium"):
        return jsonify({
            "questions_used": 0,
            "limit": None,
            "is_premium": True
        }), 200
    
    trip_id = request.args.get("trip_id")
    if not trip_id:
        return jsonify({"error": "Trip ID is required"}), 400
    
    # Convert trip_id to integer if it's a string
    try:
        trip_id = int(trip_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid trip ID format"}), 400
    
    from db import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """SELECT question_count FROM ai_chat_usage 
               WHERE trip_id = %s AND user_id = %s""",
            (trip_id, payload["user_id"])
        )
        usage = cur.fetchone()
        
        question_count = int(usage[0]) if usage and usage[0] is not None else 0
        
        return jsonify({
            "questions_used": question_count,
            "limit": 5,
            "is_premium": False
        }), 200
    except Exception as e:
        print(f"Error fetching chat usage: {e}")
        return jsonify({"error": "Error fetching usage"}), 500
    finally:
        cur.close()
        conn.close()

@ai_bp.route("/chat", methods=["POST"])
def chat():
    """
    Handle AI chat requests using dataset-only retrieval.
    Uses TF-IDF to retrieve relevant context and answers directly from dataset.
    """
    # Check authentication
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({"error": "Invalid token"}), 401
    
    data = request.get_json()
    trip_id = data.get("trip_id")
    # Convert trip_id to integer if it's a string
    if trip_id is not None:
        try:
            trip_id = int(trip_id)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid trip ID format"}), 400
    message = data.get("message", "")
    conversation_history = data.get("conversation_history", [])  # Last few messages for context
    
    if not message:
        return jsonify({"error": "Message is required"}), 400
    
    # Check AI chat limit for free users (5 questions per trip)
    questions_used = 0
    if not payload.get("is_premium"):
        if not trip_id:
            return jsonify({"error": "Trip ID is required for free plan users"}), 400
        
        from db import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        
        try:
            # Get or create AI chat usage record for this trip
            cur.execute(
                """SELECT question_count FROM ai_chat_usage 
                   WHERE trip_id = %s AND user_id = %s""",
                (trip_id, payload["user_id"])
            )
            usage = cur.fetchone()
            
            if usage:
                question_count = usage[0]
                # CRITICAL: Check BEFORE incrementing - if already at or above limit, block immediately
                if question_count >= 5:
                    cur.close()
                    conn.close()
                    return jsonify({
                        "error": "AI chat limit reached",
                        "message": "Free plan allows 5 AI questions per trip. Upgrade to Premium for unlimited questions.",
                        "questions_used": question_count,
                        "limit": 5
                    }), 403
            else:
                # Create new usage record (handle duplicate key error if race condition occurs)
                try:
                    cur.execute(
                        """INSERT INTO ai_chat_usage (trip_id, user_id, question_count) 
                           VALUES (%s, %s, 0)""",
                        (trip_id, payload["user_id"])
                    )
                    conn.commit()
                    question_count = 0
                except Exception as insert_error:
                    # If INSERT fails (e.g., duplicate key), try SELECT again
                    conn.rollback()
                    cur.execute(
                        """SELECT question_count FROM ai_chat_usage 
                           WHERE trip_id = %s AND user_id = %s""",
                        (trip_id, payload["user_id"])
                    )
                    usage_retry = cur.fetchone()
                    if usage_retry:
                        question_count = usage_retry[0]
                        if question_count >= 5:
                            cur.close()
                            conn.close()
                            return jsonify({
                                "error": "AI chat limit reached",
                                "message": "Free plan allows 5 AI questions per trip. Upgrade to Premium for unlimited questions.",
                                "questions_used": question_count,
                                "limit": 5
                            }), 403
                    else:
                        question_count = 0
            
            # CRITICAL: Double-check limit before incrementing (safety check)
            # This prevents any edge cases where count might have changed
            if question_count >= 5:
                cur.close()
                conn.close()
                return jsonify({
                    "error": "AI chat limit reached",
                    "message": "Free plan allows 5 AI questions per trip. Upgrade to Premium for unlimited questions.",
                    "questions_used": question_count,
                    "limit": 5
                }), 403
            
            # Only increment if we're proceeding with the request (count < 5)
            # Increment question count BEFORE processing to prevent race conditions
            cur.execute(
                """UPDATE ai_chat_usage SET question_count = question_count + 1 
                   WHERE trip_id = %s AND user_id = %s AND question_count < 5""",
                (trip_id, payload["user_id"])
            )
            conn.commit()
            
            # Verify the increment was successful and didn't exceed limit
            cur.execute(
                """SELECT question_count FROM ai_chat_usage 
                   WHERE trip_id = %s AND user_id = %s""",
                (trip_id, payload["user_id"])
            )
            updated_usage = cur.fetchone()
            if updated_usage:
                questions_used = int(updated_usage[0]) if updated_usage[0] is not None else 0
                # Final safety check - if somehow we exceeded 5, block the request
                if questions_used > 5:
                    # Rollback by decrementing (shouldn't happen, but safety measure)
                    cur.execute(
                        """UPDATE ai_chat_usage SET question_count = 5 
                           WHERE trip_id = %s AND user_id = %s""",
                        (trip_id, payload["user_id"])
                    )
                    conn.commit()
                    cur.close()
                    conn.close()
                    return jsonify({
                        "error": "AI chat limit reached",
                        "message": "Free plan allows 5 AI questions per trip. Upgrade to Premium for unlimited questions.",
                        "questions_used": 5,
                        "limit": 5
                    }), 403
                print(f"DEBUG: Updated questions_used = {questions_used} (type: {type(questions_used)})")
            else:
                questions_used = int(question_count) + 1 if question_count is not None else 1  # Fallback to calculated value
                print(f"DEBUG: Fallback questions_used = {questions_used}")
                
        except Exception as e:
            import traceback
            print(f"Error tracking AI chat usage: {e}")
            print(traceback.format_exc())
            # Try to get the current count even if there was an error
            try:
                conn.rollback()
                # Try to fetch current count as fallback
                cur.execute(
                    """SELECT question_count FROM ai_chat_usage 
                       WHERE trip_id = %s AND user_id = %s""",
                    (trip_id, payload["user_id"])
                )
                fallback_usage = cur.fetchone()
                if fallback_usage:
                    questions_used = int(fallback_usage[0]) if fallback_usage[0] is not None else 0
                else:
                    questions_used = 0
            except:
                # If we can't even fetch, default to 0 but log it
                questions_used = 0
                print("WARNING: Could not fetch question count after error")
        finally:
            try:
                if cur:
                    cur.close()
                if conn:
                    conn.close()
            except:
                pass
    
    # Use dataset-only chat service
    if RAI_SERVICE_AVAILABLE:
        try:
            rai_service = get_rai_service()
            
            # Get locations from request for context (optional)
            locations = data.get("locations", [])
            all_location_names = [loc.get("name", "") for loc in locations if loc.get("name")]
            
            # Enhance query with location context if available
            user_query = message.strip()
            
            # IMPORTANT: Only add trip locations if query doesn't explicitly mention a location
            # This prevents overriding user's explicit location choice (e.g., "buenos aires" should not be overridden by "japan")
            if all_location_names:
                # Check if query already mentions a location
                query_lower = user_query.lower()
                has_explicit_location = False
                
                # Common location keywords to check
                location_indicators = [
                    'tokyo', 'kyoto', 'osaka', 'bali', 'bangkok', 'singapore', 'paris', 'london',
                    'barcelona', 'rome', 'sydney', 'melbourne', 'dubai', 'istanbul', 'cairo',
                    'buenos aires', 'rio de janeiro', 'lima', 'bogota', 'santiago', 'mexico city',
                    'new york', 'los angeles', 'chicago', 'san francisco', 'miami', 'seattle',
                    'japan', 'usa', 'australia', 'thailand', 'india', 'china', 'france', 'italy',
                    'spain', 'argentina', 'brazil', 'chile', 'peru', 'colombia', 'mexico'
                ]
                
                for indicator in location_indicators:
                    if indicator in query_lower:
                        has_explicit_location = True
                        break
                
                # Only add trip locations if query doesn't explicitly mention a location
                # This ensures user's explicit location choice takes precedence
                if not has_explicit_location:
                    # Add location context to help retrieval
                    locations_str = ", ".join(all_location_names)
                    user_query = f"{user_query} {locations_str}"
            
            # Enhance query with conversation context if this looks like a follow-up
            enhanced_query = rai_service._enhance_with_context(user_query, conversation_history)
            
            # Get response using dataset-only retrieval
            result = rai_service.chat(enhanced_query, top_k=6)
            
            # questions_used is already set above during the increment step
            # Ensure we always return a number for free users (not None)
            response_data = {
                "response": result.get("response", "I couldn't find a response in my knowledge base. Please try again."),
                "needs_clarification": result.get("needs_clarification", False),
                "metadata": {
                    "retrieved_context_count": result.get("retrieved_context_count", 0),
                    "avg_similarity": result.get("avg_similarity", 0.0)
                }
            }
            if not payload.get("is_premium"):
                # Ensure questions_used is always an integer
                questions_used_value = int(questions_used) if questions_used is not None else 0
                response_data["questions_used"] = questions_used_value
                response_data["limit"] = 5
                print(f"DEBUG: Returning questions_used = {questions_used_value} (type: {type(questions_used_value)})")
                print(f"DEBUG: Full response_data for free user: {response_data}")
            else:
                print(f"DEBUG: Premium user - not including questions_used in response")
            
            return jsonify(response_data), 200
        
        except Exception as e:
            print(f"Dataset-only chat service error: {e}")
            import traceback
            traceback.print_exc()
            
            # Fallback response
            return jsonify({
                "response": "I'm having trouble accessing my knowledge base right now. Please try again in a moment.",
                "error": str(e)
            }), 500
    
    # Fallback if service is not available
    return jsonify({
        "response": "The AI chat service is not available. Please ensure the travel dataset is properly configured.",
        "error": "Service unavailable"
    }), 503
