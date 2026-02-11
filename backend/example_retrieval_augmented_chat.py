"""
Example: Dataset-Only Chat Usage
Demonstrates how to use the TF-IDF retrieval system to answer questions directly from the dataset.
No LLM/API calls - pure dataset retrieval.
"""

import os
import sys
import io

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from retrieval_augmented_ai import DatasetOnlyChat, get_rai_service


def example_usage():
    """
    Example usage of the dataset-only chat system.
    """
    print("=" * 80)
    print("TripMate Dataset-Only Chat - Example Usage")
    print("=" * 80)
    print()
    print("This system answers questions directly from the dataset using TF-IDF retrieval.")
    print("No LLM or API calls are used - pure dataset retrieval.")
    print()
    
    # Try to initialize the service
    try:
        # Option 1: Use global service (recommended)
        rai_service = get_rai_service()
        print("[OK] Dataset-only chat service initialized successfully!")
        print()
    except Exception as e:
        print(f"[ERROR] Error initializing service: {e}")
        print()
        print("Trying to initialize with explicit CSV path...")
        try:
            # Option 2: Initialize with explicit CSV path
            csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "travel_QA (1).csv")
            rai_service = DatasetOnlyChat(csv_path=csv_path)
            print("[OK] Service initialized with explicit CSV path!")
            print()
        except Exception as e2:
            print(f"[ERROR] Failed to initialize: {e2}")
            return
    
    # Example queries
    example_queries = [
        "What are the best winter destinations for skiing?",
        "Suggest family-friendly beach destinations in Asia",
        "What activities can I do in Australia?",
        "Recommend hotels in Japan for solo travelers",
        "What is the best time to visit Bali?"
    ]
    
    print("Testing dataset-only chat with example queries:")
    print("-" * 80)
    print()
    
    for i, query in enumerate(example_queries, 1):
        print(f"Query {i}: {query}")
        print("-" * 80)
        
        try:
            result = rai_service.chat(query, top_k=6)
            
            print(f"[OK] Retrieved {result['retrieved_context_count']} relevant contexts")
            print(f"   Average similarity: {result['avg_similarity']:.4f}")
            print(f"   Max similarity: {result.get('max_similarity', 0):.4f}")
            print(f"   Needs clarification: {result['needs_clarification']}")
            print()
            
            if result.get('response'):
                print("Response (from dataset only):")
                print(result['response'][:500] + "..." if len(result['response']) > 500 else result['response'])
            else:
                print("[WARNING] No response found")
            
            print()
            print("=" * 80)
            print()
        
        except Exception as e:
            print(f"[ERROR] Error processing query: {e}")
            import traceback
            traceback.print_exc()
            print()
            print("=" * 80)
            print()


def example_retrieval_only():
    """
    Example showing just the retrieval part.
    Useful for understanding what contexts are retrieved.
    """
    print("=" * 80)
    print("TripMate TF-IDF Retrieval - Example (Retrieval Only)")
    print("=" * 80)
    print()
    
    from travel_retriever import create_retriever
    
    try:
        retriever = create_retriever()
        print("[OK] Retriever initialized successfully!")
        print()
    except Exception as e:
        print(f"[ERROR] Error initializing retriever: {e}")
        return
    
    query = "What are the best winter destinations for skiing?"
    print(f"Query: {query}")
    print("-" * 80)
    print()
    
    # Retrieve relevant contexts
    retrieved_rows = retriever.retrieve(query, top_k=6)
    
    print(f"Retrieved {len(retrieved_rows)} relevant contexts:")
    print()
    
    for i, row in enumerate(retrieved_rows, 1):
        print(f"--- Context {i} (Similarity: {row['similarity_score']:.4f}) ---")
        try:
            question = str(row['question'])[:100]
            response = str(row['response'])[:200]
            print(f"Question: {question}...")
            print(f"Response: {response}...")
        except UnicodeEncodeError:
            question = str(row['question'])[:100].encode('utf-8', errors='replace').decode('utf-8', errors='replace')
            response = str(row['response'])[:200].encode('utf-8', errors='replace').decode('utf-8', errors='replace')
            print(f"Question: {question}...")
            print(f"Response: {response}...")
        if row.get('country') or row.get('city'):
            print(f"Location: {row.get('city', '')}, {row.get('country', '')}")
        print()
    
    # Show how the system would select/combine responses
    print("=" * 80)
    print("How the system selects responses:")
    print("=" * 80)
    print()
    print("1. For recommendation queries: Combines multiple relevant responses")
    print("2. For specific questions: Uses the most relevant single response")
    print("3. For itineraries: Looks for day-by-day content")
    print("4. Checks for conflicts between multiple contexts")
    print()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Example usage of TripMate dataset-only chat")
    parser.add_argument(
        "--retrieval-only",
        action="store_true",
        help="Show only retrieval results without response selection"
    )
    
    args = parser.parse_args()
    
    if args.retrieval_only:
        example_retrieval_only()
    else:
        example_usage()
