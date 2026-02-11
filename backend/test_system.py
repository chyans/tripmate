"""Test the system with various queries to ensure it's working well."""
import sys
import os
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from retrieval_augmented_ai import DatasetOnlyChat

print("=" * 80)
print("Testing AI Chat System")
print("=" * 80)
print()

service = DatasetOnlyChat()
print(f"Dataset loaded: {len(service.retriever.df)} entries")
print()

test_queries = [
    ("where to eat in paris", "Paris food"),
    ("what to see in london", "London attractions"),
    ("tokyo sushi", "Tokyo sushi"),
    ("best time to visit rome", "Rome timing"),
    ("how to get around barcelona", "Barcelona transport"),
    ("is bangkok safe", "Bangkok safety"),
    ("budget tips for tokyo", "Tokyo budget"),
]

print("Testing queries:")
print("-" * 80)

for query, description in test_queries:
    print(f"\nQuery: {query} ({description})")
    result = service.chat(query, top_k=6)
    response = result.get('response', '')
    
    # Check if response is relevant
    query_words = set(query.lower().split())
    response_lower = response.lower()
    matches = sum(1 for word in query_words if word in response_lower)
    
    print(f"  Retrieved: {result['retrieved_context_count']} contexts")
    print(f"  Avg similarity: {result['avg_similarity']:.4f}")
    print(f"  Relevance: {matches}/{len(query_words)} query words found")
    print(f"  Response length: {len(response)} chars")
    print(f"  Preview: {response[:100]}...")

print("\n" + "=" * 80)
print("Testing complete!")

