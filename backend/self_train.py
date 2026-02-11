"""Self-training script: Test AI with various queries and identify gaps."""
import sys
import os
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from retrieval_augmented_ai import DatasetOnlyChat

print("=" * 80)
print("SELF-TRAINING: Testing AI Chat and Identifying Gaps")
print("=" * 80)
print()

service = DatasetOnlyChat()
print(f"Dataset loaded: {len(service.retriever.df)} entries")
print()

# Test queries covering various scenarios
test_queries = [
    # Food queries - different phrasings
    ("where can i eat in paris", "Food - Paris"),
    ("best food paris", "Food - Paris"),
    ("paris dining", "Food - Paris"),
    ("what to eat in tokyo", "Food - Tokyo"),
    ("tokyo food recommendations", "Food - Tokyo"),
    ("restaurants in london", "Food - London"),
    ("london where to eat", "Food - London"),
    
    # Attraction queries - different phrasings
    ("things to do paris", "Attractions - Paris"),
    ("paris sightseeing", "Attractions - Paris"),
    ("tokyo what to visit", "Attractions - Tokyo"),
    ("london must see", "Attractions - London"),
    ("rome top attractions", "Attractions - Rome"),
    
    # Transportation queries
    ("tokyo metro", "Transport - Tokyo"),
    ("paris subway", "Transport - Paris"),
    ("london tube", "Transport - London"),
    ("bangkok bts", "Transport - Bangkok"),
    
    # Accommodation queries
    ("hotels in paris", "Accommodation - Paris"),
    ("where to stay tokyo", "Accommodation - Tokyo"),
    ("london accommodation", "Accommodation - London"),
    ("rome hotels", "Accommodation - Rome"),
    
    # Timing queries
    ("when to go to paris", "Timing - Paris"),
    ("tokyo season", "Timing - Tokyo"),
    ("best season london", "Timing - London"),
    
    # Budget queries
    ("cheap eats paris", "Budget - Paris"),
    ("affordable tokyo", "Budget - Tokyo"),
    ("london on a budget", "Budget - London"),
    
    # Specific topics
    ("paris museums", "Specific - Museums"),
    ("tokyo temples", "Specific - Temples"),
    ("london markets", "Specific - Markets"),
    ("rome history", "Specific - History"),
    
    # Multi-city queries
    ("japan travel", "Multi-city - Japan"),
    ("europe trip", "Multi-city - Europe"),
    ("asia destinations", "Multi-city - Asia"),
]

print("Testing queries and identifying gaps...")
print("-" * 80)

gaps = []
good_responses = []

for query, category in test_queries:
    result = service.chat(query, top_k=6)
    response = result.get('response', '')
    similarity = result.get('avg_similarity', 0)
    retrieved = result.get('retrieved_context_count', 0)
    
    # Check if response is relevant
    query_words = set(query.lower().split())
    response_lower = response.lower()
    matches = sum(1 for word in query_words if word in response_lower)
    relevance = matches / len(query_words) if query_words else 0
    
    # Check if it's a clarifying question (might indicate gap)
    is_clarifying = "could you tell me" in response_lower or "which" in response_lower[:100] or "?" in response[:200]
    
    # Determine if this is a gap
    is_gap = (
        similarity < 0.15 or 
        relevance < 0.4 or 
        (is_clarifying and similarity < 0.2) or
        len(response) < 100
    )
    
    if is_gap:
        gaps.append({
            'query': query,
            'category': category,
            'similarity': similarity,
            'relevance': relevance,
            'response_preview': response[:150],
            'retrieved': retrieved
        })
        print(f"✗ GAP | {category:20} | '{query:30}' | Sim: {similarity:.3f} | Rel: {relevance:.2%}")
    else:
        good_responses.append(query)
        print(f"✓ GOOD | {category:20} | '{query:30}' | Sim: {similarity:.3f} | Rel: {relevance:.2%}")

print(f"\n{'='*80}")
print(f"SUMMARY")
print(f"{'='*80}")
print(f"Total queries tested: {len(test_queries)}")
print(f"Good responses: {len(good_responses)}")
print(f"Gaps identified: {len(gaps)}")
print(f"\nGaps by category:")
gap_categories = {}
for gap in gaps:
    cat = gap['category']
    gap_categories[cat] = gap_categories.get(cat, 0) + 1
for cat, count in sorted(gap_categories.items()):
    print(f"  {cat}: {count}")

print(f"\n{'='*80}")
print("TOP GAPS TO FIX:")
print(f"{'='*80}")
for i, gap in enumerate(gaps[:10], 1):
    print(f"\n{i}. Query: '{gap['query']}' ({gap['category']})")
    print(f"   Similarity: {gap['similarity']:.3f}, Relevance: {gap['relevance']:.2%}")
    print(f"   Current response: {gap['response_preview']}...")

# Save gaps to file for reference
with open('backend/gaps_identified.txt', 'w', encoding='utf-8') as f:
    f.write("Identified Gaps:\n")
    f.write("="*80 + "\n\n")
    for gap in gaps:
        f.write(f"Query: {gap['query']}\n")
        f.write(f"Category: {gap['category']}\n")
        f.write(f"Similarity: {gap['similarity']:.3f}\n")
        f.write(f"Relevance: {gap['relevance']:.2%}\n")
        f.write(f"Response: {gap['response_preview']}\n")
        f.write("-"*80 + "\n")

print(f"\nGaps saved to backend/gaps_identified.txt")

