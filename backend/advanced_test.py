"""Advanced testing with more edge cases and variations."""
import sys
import os
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from retrieval_augmented_ai import DatasetOnlyChat

print("=" * 80)
print("ADVANCED TESTING: Edge Cases and Variations")
print("=" * 80)
print()

service = DatasetOnlyChat()
print(f"Dataset loaded: {len(service.retriever.df)} entries")
print()

# Test more edge cases
advanced_tests = [
    # Exact phrasings that were failing
    ("london where to eat", "Should return London food"),
    ("things to do paris", "Should return Paris activities"),
    
    # Variations
    ("paris what to do", "Paris activities"),
    ("what to do paris", "Paris activities"),
    ("where to eat london", "London food"),
    
    # Specific landmarks
    ("Tokyo cherry blossoms", "Tokyo sakura"),
    ("Paris Eiffel Tower", "Paris landmark"),
    ("London Tower Bridge", "London landmark"),
    ("Rome Colosseum", "Rome landmark"),
    ("Barcelona Sagrada Familia", "Barcelona landmark"),
    
    # Cost queries
    ("How much does it cost to visit Paris?", "Paris costs"),
    ("How much does it cost to visit Tokyo?", "Tokyo costs"),
    ("How much does it cost to visit London?", "London costs"),
    
    # Visa queries
    ("Paris visa requirements", "Paris visa"),
    ("Tokyo visa requirements", "Tokyo visa"),
    ("London visa requirements", "London visa"),
    
    # More cities
    ("Seoul what to see", "Seoul attractions"),
    ("Mumbai things to do", "Mumbai activities"),
    ("Shanghai things to do", "Shanghai activities"),
]

print("Testing advanced queries...")
print("-" * 80)

passed = 0
failed = 0
issues = []

for query, expected in advanced_tests:
    result = service.chat(query, top_k=6)
    response = result.get('response', '')
    similarity = result.get('avg_similarity', 0)
    
    # Check relevance
    query_words = set(query.lower().split())
    response_lower = response.lower()
    matches = sum(1 for word in query_words if word in response_lower)
    relevance = matches / len(query_words) if query_words else 0
    
    # Check if response is reasonable
    is_good = (
        similarity > 0.15 and
        relevance >= 0.4 and
        len(response) >= 100 and
        not ("could you tell me" in response_lower[:200] and similarity < 0.2)
    )
    
    if is_good:
        passed += 1
        print(f"✓ PASS | '{query:40}' | Sim: {similarity:.3f} | Rel: {relevance:.2%}")
    else:
        failed += 1
        issues.append((query, similarity, relevance, response[:100]))
        print(f"✗ FAIL | '{query:40}' | Sim: {similarity:.3f} | Rel: {relevance:.2%} | {response[:60]}...")

print(f"\n{'='*80}")
print(f"RESULTS: {passed} passed, {failed} failed out of {len(advanced_tests)} tests")
print(f"Success rate: {(passed/len(advanced_tests))*100:.1f}%")
print(f"{'='*80}")

if issues:
    print(f"\nIssues found:")
    for query, sim, rel, resp in issues:
        print(f"  - '{query}' (sim: {sim:.3f}, rel: {rel:.2%})")

