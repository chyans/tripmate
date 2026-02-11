"""Enhanced training script with more comprehensive tests"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, 'backend')
from retrieval_augmented_ai import DatasetOnlyChat

def enhanced_training():
    """Comprehensive training with expanded test queries"""
    chat = DatasetOnlyChat()
    
    # Expanded test queries covering more scenarios
    test_queries = [
        # Food queries - various cities
        'where to eat in paris',
        'best restaurants in tokyo',
        'food in bangkok',
        'where to eat in london',
        'best restaurants in dubai',
        'food in singapore',
        'where to eat in seoul',
        'best restaurants in amsterdam',
        'food in vienna',
        'where to eat in madrid',
        
        # Attractions queries
        'attractions in singapore',
        'things to do in new york',
        'what to see in rome',
        'attractions in seoul',
        'things to do in sydney',
        'attractions in barcelona',
        'things to do in berlin',
        'attractions in prague',
        'things to do in istanbul',
        'attractions in cairo',
        
        # Accommodation queries
        'where to stay in barcelona',
        'hotels in amsterdam',
        'where to stay in hong kong',
        'hotels in vienna',
        'where to stay in lisbon',
        'hotels in athens',
        
        # Transportation queries
        'how to get around tokyo',
        'public transport in london',
        'how to get around berlin',
        'public transport in singapore',
        'how to get around paris',
        'public transport in rome',
        
        # Weather queries
        'best time to visit paris',
        'weather in dubai',
        'best time to visit seoul',
        'weather in sydney',
        'best time to visit bangkok',
        'weather in singapore',
        
        # Shopping queries
        'shopping in tokyo',
        'shopping in london',
        'shopping in dubai',
        'shopping in singapore',
        'shopping in paris',
        
        # Practical info queries
        'paris visa requirements',
        'tokyo currency',
        'singapore visa requirements',
        'london currency',
        'dubai visa requirements',
        'seoul currency',
        
        # Location-specific queries
        'where to eat in hokkaido',
        'attractions in osaka',
        'things to do in kyoto',
        'where to eat in chiang mai',
        'attractions in penang',
        
        # Broad queries (should ask clarifying questions)
        'where to eat in japan',
        'attractions in italy',
        'things to do in france',
        'where to eat in thailand',
        'attractions in spain',
        
        # Vague queries (should return sorry)
        'why',
        'what',
        'hello',
        'ok',
        'hi',
        'thanks',
        
        # Edge cases
        'best time to visit',
        'where to stay',
        'things to do',
        'food',
    ]
    
    print("=" * 80)
    print("ENHANCED TRAINING: Comprehensive AI Chat Testing")
    print("=" * 80)
    
    results = {
        'total': len(test_queries),
        'passed': 0,
        'failed': 0,
        'clarifying': 0,
        'sorry': 0,
        'gaps': [],
        'categories': {
            'food': {'total': 0, 'passed': 0},
            'attractions': {'total': 0, 'passed': 0},
            'accommodation': {'total': 0, 'passed': 0},
            'transport': {'total': 0, 'passed': 0},
            'weather': {'total': 0, 'passed': 0},
            'shopping': {'total': 0, 'passed': 0},
            'practical': {'total': 0, 'passed': 0},
            'location_specific': {'total': 0, 'passed': 0},
            'broad': {'total': 0, 'passed': 0},
            'vague': {'total': 0, 'passed': 0},
            'edge_cases': {'total': 0, 'passed': 0},
        }
    }
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n[{i}/{len(test_queries)}] Query: '{query}'")
        print("-" * 80)
        
        # Categorize query
        category = 'other'
        if any(word in query.lower() for word in ['eat', 'restaurant', 'food', 'dining']):
            category = 'food'
        elif any(word in query.lower() for word in ['attraction', 'things to do', 'what to see', 'activities']):
            category = 'attractions'
        elif any(word in query.lower() for word in ['stay', 'hotel', 'accommodation']):
            category = 'accommodation'
        elif any(word in query.lower() for word in ['transport', 'get around', 'public transport']):
            category = 'transport'
        elif any(word in query.lower() for word in ['weather', 'best time', 'time to visit']):
            category = 'weather'
        elif 'shopping' in query.lower():
            category = 'shopping'
        elif any(word in query.lower() for word in ['visa', 'currency']):
            category = 'practical'
        elif any(word in query.lower() for word in ['hokkaido', 'osaka', 'kyoto', 'chiang mai', 'penang']):
            category = 'location_specific'
        elif any(word in query.lower() for word in ['japan', 'italy', 'france', 'thailand', 'spain']) and 'city' not in query.lower():
            category = 'broad'
        elif query.lower() in ['why', 'what', 'hello', 'ok', 'hi', 'thanks']:
            category = 'vague'
        elif len(query.split()) <= 2 and not any(word in query.lower() for word in ['in', 'at', 'to']):
            category = 'edge_cases'
        
        if category != 'other':
            results['categories'][category]['total'] += 1
        
        try:
            response = chat.chat(query)
            response_text = response.get('response', '')
            
            # Check response quality
            is_clarifying = 'could you' in response_text.lower() or 'which' in response_text.lower() or 'please' in response_text.lower() or 'tell me' in response_text.lower()
            is_sorry = 'sorry' in response_text.lower() or 'couldn\'t find' in response_text.lower() or 'couldn\'t find relevant' in response_text.lower()
            is_relevant = len(response_text) > 50 and not is_sorry
            
            # Determine if this is expected behavior
            is_vague = query.lower() in ['why', 'what', 'hello', 'ok', 'hi', 'thanks']
            is_broad = category == 'broad'
            is_edge_case = category == 'edge_cases'
            
            if is_vague:
                if is_sorry:
                    print("[PASS] Correctly returned 'sorry' for vague query")
                    results['sorry'] += 1
                    results['passed'] += 1
                    if category != 'other':
                        results['categories'][category]['passed'] += 1
                else:
                    print("[FAIL] Should return 'sorry' for vague query")
                    results['failed'] += 1
                    results['gaps'].append(f"Vague query '{query}' didn't return sorry")
            elif is_broad:
                if is_clarifying:
                    print("[PASS] Correctly asked clarifying question for broad query")
                    results['clarifying'] += 1
                    results['passed'] += 1
                    if category != 'other':
                        results['categories'][category]['passed'] += 1
                else:
                    print("[FAIL] Should ask clarifying question for broad query")
                    results['failed'] += 1
                    results['gaps'].append(f"Broad query '{query}' didn't ask clarifying question")
                    if category != 'other':
                        results['categories'][category]['passed'] += 1
            elif is_edge_case:
                if is_sorry or is_clarifying:
                    print("[PASS] Correctly handled edge case")
                    results['passed'] += 1
                    if category != 'other':
                        results['categories'][category]['passed'] += 1
                else:
                    print("[FAIL] Edge case not handled properly")
                    results['failed'] += 1
                    results['gaps'].append(f"Edge case '{query}' not handled properly")
            else:
                if is_relevant:
                    print("[PASS] Returned relevant response")
                    results['passed'] += 1
                    if category != 'other':
                        results['categories'][category]['passed'] += 1
                else:
                    print("[FAIL] Response not relevant or too short")
                    results['failed'] += 1
                    results['gaps'].append(f"Query '{query}' returned irrelevant response")
            
            # Show response preview
            preview = response_text[:150] + "..." if len(response_text) > 150 else response_text
            print(f"Response: {preview}")
            
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            results['failed'] += 1
            results['gaps'].append(f"Query '{query}' caused error: {str(e)}")
    
    # Print comprehensive summary
    print("\n" + "=" * 80)
    print("ENHANCED TRAINING SUMMARY")
    print("=" * 80)
    print(f"Total queries tested: {results['total']}")
    print(f"Passed: {results['passed']} ({results['passed']/results['total']*100:.1f}%)")
    print(f"Failed: {results['failed']} ({results['failed']/results['total']*100:.1f}%)")
    print(f"Clarifying questions: {results['clarifying']}")
    print(f"Sorry messages: {results['sorry']}")
    
    print("\nCategory Performance:")
    for cat, data in results['categories'].items():
        if data['total'] > 0:
            pass_rate = data['passed'] / data['total'] * 100
            print(f"  {cat}: {data['passed']}/{data['total']} ({pass_rate:.1f}%)")
    
    if results['gaps']:
        print(f"\nIdentified Gaps ({len(results['gaps'])}):")
        for gap in results['gaps'][:10]:  # Show first 10 gaps
            print(f"  - {gap}")
        if len(results['gaps']) > 10:
            print(f"  ... and {len(results['gaps']) - 10} more gaps")
    else:
        print("\n[SUCCESS] No gaps identified! AI is performing excellently.")
    
    return results

if __name__ == "__main__":
    enhanced_training()


