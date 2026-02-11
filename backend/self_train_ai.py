"""Self-training script to test AI and identify gaps"""
import sys
sys.path.insert(0, 'backend')
from retrieval_augmented_ai import DatasetOnlyChat

def test_queries():
    """Test various queries and identify gaps"""
    chat = DatasetOnlyChat()
    
    # Comprehensive test queries covering various categories
    test_queries = [
        # Food queries
        'where to eat in paris',
        'best restaurants in tokyo',
        'food in bangkok',
        'where to eat in london',
        'best restaurants in dubai',
        
        # Attractions queries
        'attractions in singapore',
        'things to do in new york',
        'what to see in rome',
        'attractions in seoul',
        'things to do in sydney',
        
        # Accommodation queries
        'where to stay in barcelona',
        'hotels in amsterdam',
        'where to stay in hong kong',
        'hotels in vienna',
        
        # Transportation queries
        'how to get around tokyo',
        'public transport in london',
        'how to get around berlin',
        'public transport in singapore',
        
        # Weather queries
        'best time to visit paris',
        'weather in dubai',
        'best time to visit seoul',
        'weather in sydney',
        
        # Shopping queries
        'shopping in tokyo',
        'shopping in london',
        'shopping in dubai',
        
        # Practical info queries
        'paris visa requirements',
        'tokyo currency',
        'singapore visa requirements',
        'london currency',
        
        # Location-specific queries
        'where to eat in hokkaido',
        'attractions in osaka',
        'things to do in kyoto',
        
        # Broad queries (should ask clarifying questions)
        'where to eat in japan',
        'attractions in italy',
        'things to do in france',
        
        # Vague queries (should return sorry)
        'why',
        'what',
        'hello',
        'ok',
    ]
    
    print("=" * 80)
    print("SELF-TRAINING: Testing AI Chat with Comprehensive Queries")
    print("=" * 80)
    
    results = {
        'total': len(test_queries),
        'passed': 0,
        'failed': 0,
        'clarifying': 0,
        'sorry': 0,
        'gaps': []
    }
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n[{i}/{len(test_queries)}] Query: '{query}'")
        print("-" * 80)
        
        try:
            response = chat.chat(query)
            response_text = response.get('response', '')
            
            # Check response quality
            is_clarifying = 'could you' in response_text.lower() or 'which' in response_text.lower() or 'please' in response_text.lower()
            is_sorry = 'sorry' in response_text.lower() or 'couldn\'t find' in response_text.lower()
            is_relevant = len(response_text) > 50 and not is_sorry
            
            # Determine if this is expected behavior
            is_vague = query.lower() in ['why', 'what', 'hello', 'ok']
            is_broad = any(phrase in query.lower() for phrase in ['japan', 'italy', 'france']) and 'city' not in query.lower()
            
            if is_vague:
                if is_sorry:
                    print("[PASS] Correctly returned 'sorry' for vague query")
                    results['sorry'] += 1
                    results['passed'] += 1
                else:
                    print("[FAIL] Should return 'sorry' for vague query")
                    results['failed'] += 1
                    results['gaps'].append(f"Vague query '{query}' didn't return sorry")
            elif is_broad:
                if is_clarifying:
                    print("[PASS] Correctly asked clarifying question for broad query")
                    results['clarifying'] += 1
                    results['passed'] += 1
                else:
                    print("[FAIL] Should ask clarifying question for broad query")
                    results['failed'] += 1
                    results['gaps'].append(f"Broad query '{query}' didn't ask clarifying question")
            else:
                if is_relevant:
                    print("[PASS] Returned relevant response")
                    results['passed'] += 1
                else:
                    print("[FAIL] Response not relevant or too short")
                    results['failed'] += 1
                    results['gaps'].append(f"Query '{query}' returned irrelevant response")
            
            # Show response preview
            preview = response_text[:200] + "..." if len(response_text) > 200 else response_text
            print(f"Response: {preview}")
            
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            results['failed'] += 1
            results['gaps'].append(f"Query '{query}' caused error: {str(e)}")
    
    # Print summary
    print("\n" + "=" * 80)
    print("TRAINING SUMMARY")
    print("=" * 80)
    print(f"Total queries tested: {results['total']}")
    print(f"Passed: {results['passed']} ({results['passed']/results['total']*100:.1f}%)")
    print(f"Failed: {results['failed']} ({results['failed']/results['total']*100:.1f}%)")
    print(f"Clarifying questions: {results['clarifying']}")
    print(f"Sorry messages: {results['sorry']}")
    
    if results['gaps']:
        print(f"\nIdentified Gaps ({len(results['gaps'])}):")
        for gap in results['gaps']:
            print(f"  - {gap}")
    else:
        print("\n[SUCCESS] No gaps identified! AI is performing well.")
    
    return results

if __name__ == "__main__":
    test_queries()

