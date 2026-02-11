from flask import Blueprint, request, jsonify
from db import get_db_connection
from routes.auth import verify_token
from datetime import datetime

budget_bp = Blueprint("budget_bp", __name__)

def get_user_from_token():
    """Helper to get user from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    payload = verify_token(token)
    return payload

@budget_bp.route("/trip/<int:trip_id>", methods=["GET"])
def get_budget(trip_id):
    """Get budget for a trip"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify trip ownership
        cur.execute("SELECT user_id, budget FROM trips WHERE id = %s", (trip_id,))
        trip = cur.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        if trip[0] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        # Get all budget items
        cur.execute(
            """SELECT id, category, description, amount, created_at
               FROM budget_items WHERE trip_id = %s ORDER BY created_at DESC""",
            (trip_id,)
        )

        items = []
        total_spent = 0
        for row in cur.fetchall():
            items.append({
                "id": row[0],
                "category": row[1],
                "description": row[2],
                "amount": float(row[3]),
                "created_at": row[4].isoformat()
            })
            total_spent += float(row[3])

        initial_budget = float(trip[1]) if trip[1] else 0
        remaining = initial_budget - total_spent

        return jsonify({
            "initial_budget": initial_budget,
            "total_spent": total_spent,
            "remaining": remaining,
            "items": items,
            "exceeded": remaining < 0
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@budget_bp.route("/trip/<int:trip_id>", methods=["POST"])
def add_budget_item(trip_id):
    """Add a budget item"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    category = data.get("category", "").strip()
    description = data.get("description", "").strip()
    amount = data.get("amount")

    if not category or amount is None:
        return jsonify({"error": "Category and amount are required"}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({"error": "Please enter a valid value"}), 400
    except ValueError:
        return jsonify({"error": "Please enter a valid value"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify trip ownership
        cur.execute("SELECT user_id FROM trips WHERE id = %s", (trip_id,))
        trip = cur.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        if trip[0] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        cur.execute(
            """INSERT INTO budget_items (trip_id, category, description, amount)
               VALUES (%s, %s, %s, %s)""",
            (trip_id, category, description, amount)
        )
        item_id = cur.lastrowid
        conn.commit()

        # Check if budget exceeded and create notification
        cur.execute("SELECT budget FROM trips WHERE id = %s", (trip_id,))
        initial_budget = cur.fetchone()[0] or 0
        
        cur.execute("SELECT SUM(amount) FROM budget_items WHERE trip_id = %s", (trip_id,))
        total_spent = cur.fetchone()[0] or 0

        if total_spent > initial_budget:
            cur.execute(
                """INSERT INTO notifications (user_id, message, type)
                   VALUES (%s, %s, %s)""",
                (user["user_id"], f"Budget exceeded for trip! Total spent: ${total_spent:.2f}, Budget: ${initial_budget:.2f}", "budget")
            )
            conn.commit()

        return jsonify({
            "message": "Budget item added successfully",
            "item": {
                "id": item_id,
                "category": category,
                "description": description,
                "amount": amount
            }
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@budget_bp.route("/item/<int:item_id>", methods=["PUT"])
def update_budget_item(item_id):
    """Update a budget item"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify ownership through trip
        cur.execute(
            """SELECT bi.trip_id, t.user_id FROM budget_items bi
               JOIN trips t ON bi.trip_id = t.id WHERE bi.id = %s""",
            (item_id,)
        )
        item = cur.fetchone()
        if not item:
            return jsonify({"error": "Budget item not found"}), 404
        if item[1] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        updates = []
        values = []

        if "category" in data:
            updates.append("category = %s")
            values.append(data["category"])
        if "description" in data:
            updates.append("description = %s")
            values.append(data["description"])
        if "amount" in data:
            try:
                amount = float(data["amount"])
                if amount <= 0:
                    return jsonify({"error": "Please enter a valid value"}), 400
                updates.append("amount = %s")
                values.append(amount)
            except ValueError:
                return jsonify({"error": "Please enter a valid value"}), 400

        if not updates:
            return jsonify({"error": "No fields to update"}), 400

        values.append(item_id)
        cur.execute(f"UPDATE budget_items SET {', '.join(updates)} WHERE id = %s", values)
        conn.commit()

        return jsonify({"message": "Budget item updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@budget_bp.route("/item/<int:item_id>", methods=["DELETE"])
def delete_budget_item(item_id):
    """Delete a budget item"""
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify ownership through trip
        cur.execute(
            """SELECT t.user_id FROM budget_items bi
               JOIN trips t ON bi.trip_id = t.id WHERE bi.id = %s""",
            (item_id,)
        )
        item = cur.fetchone()
        if not item:
            return jsonify({"error": "Budget item not found"}), 404
        if item[0] != user["user_id"]:
            return jsonify({"error": "Unauthorized"}), 403

        cur.execute("DELETE FROM budget_items WHERE id = %s", (item_id,))
        conn.commit()

        return jsonify({"message": "Budget item deleted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

