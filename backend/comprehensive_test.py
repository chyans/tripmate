"""Comprehensive test of the AI chat system with various query types."""
import sys
import os
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from retrieval_augmented_ai import DatasetOnlyChat

print("=" * 80)
print("COMPREHENSIVE AI CHAT SYSTEM TEST")
print("=" * 80)
print()

service = DatasetOnlyChat()
print(f"Dataset loaded: {len(service.retriever.df)} entries")
print()

test_categories = {
    "Food Queries": [
        "where to eat in tokyo",
        "paris restaurants",
        "bangkok street food",
        "london food",
        "rome food",
    ],
    "Attraction Queries": [
        "what to see in paris",
        "tokyo attractions",
        "london what to visit",
        "rome what to see",
        "barcelona attractions",
    ],
    "Transportation Queries": [
        "how to get around tokyo",
        "paris transportation",
        "london how to get around",
        "bangkok transportation",
    ],
    "Timing Queries": [
        "best time to visit paris",
        "when to visit tokyo",
        "rome best time",
        "london when to visit",
    ],
    "Safety Queries": [
        "is tokyo safe",
        "paris safety",
        "bangkok safe for tourists",
        "london safe",
    ],
    "Budget Queries": [
        "budget tips for tokyo",
        "paris budget travel",
        "london budget tips",
        "bangkok budget",
    ],
    "Cultural Queries": [
        "cultural tips for japan",
        "france cultural tips",
        "italy cultural tips",
        "thailand cultural tips",
    ],
    "Itinerary Queries": [
        "3 day itinerary paris",
        "tokyo 3 days",
        "london 3 day itinerary",
        "rome 3 days",
    ],
}

total_tests = 0
passed_tests = 0

for category, queries in test_categories.items():
    print(f"\n{'='*80}")
    print(f"CATEGORY: {category}")
    print(f"{'='*80}")
    
    for query in queries:
        total_tests += 1
        result = service.chat(query, top_k=6)
        response = result.get('response', '')
        
        # Check relevance
        query_words = set(query.lower().split())
        response_lower = response.lower()
        matches = sum(1 for word in query_words if word in response_lower)
        relevance_score = matches / len(query_words) if query_words else 0
        
        # Check if response is reasonable length
        reasonable_length = 100 <= len(response) <= 3000
        
        # Check similarity
        good_similarity = result.get('avg_similarity', 0) > 0.1
        
        passed = relevance_score >= 0.5 and reasonable_length and good_similarity
        if passed:
            passed_tests += 1
        
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"\n{status} | Query: '{query}'")
        print(f"  Retrieved: {result['retrieved_context_count']} | Similarity: {result.get('avg_similarity', 0):.4f} | Relevance: {relevance_score:.2%}")
        print(f"  Preview: {response[:120]}...")

print(f"\n{'='*80}")
print(f"TEST SUMMARY")
print(f"{'='*80}")
print(f"Total tests: {total_tests}")
print(f"Passed: {passed_tests}")
print(f"Failed: {total_tests - passed_tests}")
print(f"Success rate: {(passed_tests/total_tests)*100:.1f}%")
print(f"{'='*80}")

