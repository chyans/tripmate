"""Continuous training: Test and improve the system iteratively."""
import sys
import os
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from retrieval_augmented_ai import DatasetOnlyChat

print("=" * 80)
print("CONTINUOUS TRAINING: Testing and Identifying Gaps")
print("=" * 80)
print()

service = DatasetOnlyChat()
print(f"Dataset loaded: {len(service.retriever.df)} entries")
print()

# Comprehensive test queries covering many scenarios
test_queries = [
    # More food variations
    ("best restaurants in paris", "Food"),
    ("where to eat cheap in tokyo", "Food"),
    ("london best food", "Food"),
    ("rome best restaurants", "Food"),
    ("barcelona food recommendations", "Food"),
    ("seoul food", "Food"),
    ("mumbai street food", "Food"),
    
    # More attraction variations
    ("tokyo must see", "Attractions"),
    ("paris top attractions", "Attractions"),
    ("london best attractions", "Attractions"),
    ("rome must visit", "Attractions"),
    ("barcelona top sights", "Attractions"),
    ("seoul attractions", "Attractions"),
    
    # More activity variations
    ("what to do in tokyo", "Activities"),
    ("paris what to see", "Activities"),
    ("london activities", "Activities"),
    ("rome what to do", "Activities"),
    ("barcelona things to do", "Activities"),
    
    # More transportation variations
    ("tokyo public transport", "Transport"),
    ("paris metro", "Transport"),
    ("london underground", "Transport"),
    ("rome transport", "Transport"),
    ("bangkok public transport", "Transport"),
    
    # More accommodation variations
    ("best hotels in tokyo", "Accommodation"),
    ("paris where to stay", "Accommodation"),
    ("london best hotels", "Accommodation"),
    ("rome accommodation", "Accommodation"),
    ("bangkok hotels", "Accommodation"),
    
    # More timing variations
    ("when to visit paris", "Timing"),
    ("best season tokyo", "Timing"),
    ("london best time", "Timing"),
    ("rome when to go", "Timing"),
    ("bangkok best time", "Timing"),
    
    # More budget variations
    ("tokyo cheap travel", "Budget"),
    ("paris on a budget", "Budget"),
    ("london budget travel", "Budget"),
    ("rome cheap travel", "Budget"),
    ("bangkok budget", "Budget"),
    
    # More specific queries
    ("tokyo temples", "Specific"),
    ("paris museums", "Specific"),
    ("london markets", "Specific"),
    ("rome history", "Specific"),
    ("bangkok nightlife", "Specific"),
    ("tokyo shopping", "Specific"),
    ("paris nightlife", "Specific"),
    
    # More cities
    ("singapore what to see", "Cities"),
    ("dubai attractions", "Cities"),
    ("hong kong food", "Cities"),
    ("sydney attractions", "Cities"),
    ("amsterdam things to do", "Cities"),
    ("istanbul attractions", "Cities"),
    
    # More practical queries
    ("tokyo airport", "Practical"),
    ("paris airport", "Practical"),
    ("london airport", "Practical"),
    ("tokyo wifi", "Practical"),
    ("paris currency", "Practical"),
    ("london currency", "Practical"),
]

print("Testing comprehensive queries...")
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
    is_clarifying = "could you tell me" in response_lower or "which" in response_lower[:100] or ("?" in response[:200] and similarity < 0.2)
    
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
        print(f"✗ GAP | {category:15} | '{query:35}' | Sim: {similarity:.3f} | Rel: {relevance:.2%}")
    else:
        good_responses.append(query)
        print(f"✓ GOOD | {category:15} | '{query:35}' | Sim: {similarity:.3f} | Rel: {relevance:.2%}")

print(f"\n{'='*80}")
print(f"SUMMARY")
print(f"{'='*80}")
print(f"Total queries tested: {len(test_queries)}")
print(f"Good responses: {len(good_responses)}")
print(f"Gaps identified: {len(gaps)}")
print(f"Success rate: {(len(good_responses)/len(test_queries))*100:.1f}%")

if gaps:
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
    for i, gap in enumerate(gaps[:15], 1):
        print(f"\n{i}. Query: '{gap['query']}' ({gap['category']})")
        print(f"   Similarity: {gap['similarity']:.3f}, Relevance: {gap['relevance']:.2%}")
        print(f"   Current response: {gap['response_preview']}...")

# Save gaps
with open('backend/gaps_continuous.txt', 'w', encoding='utf-8') as f:
    f.write("Continuous Training Gaps:\n")
    f.write("="*80 + "\n\n")
    for gap in gaps:
        f.write(f"Query: {gap['query']}\n")
        f.write(f"Category: {gap['category']}\n")
        f.write(f"Similarity: {gap['similarity']:.3f}\n")
        f.write(f"Relevance: {gap['relevance']:.2%}\n")
        f.write(f"Response: {gap['response_preview']}\n")
        f.write("-"*80 + "\n")

print(f"\nGaps saved to backend/gaps_continuous.txt")

