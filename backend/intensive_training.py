"""Intensive training script - runs for ~1 hour with comprehensive testing"""
import sys
import io
import time
import random
from datetime import datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, 'backend')
from retrieval_augmented_ai import DatasetOnlyChat

# Load all cities from dataset to generate comprehensive queries
def get_all_cities():
    """Extract cities from dataset"""
    import pandas as pd
    import os
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'travel_QA (1).csv')
    df = pd.read_csv(csv_path)
    cities = set()
    for _, row in df.iterrows():
        response = str(row.get('response', '')).lower()
        # Extract common city patterns
        common_cities = [
            'tokyo', 'paris', 'london', 'new york', 'bangkok', 'singapore', 'dubai',
            'sydney', 'melbourne', 'barcelona', 'rome', 'amsterdam', 'vienna', 'prague',
            'budapest', 'istanbul', 'cairo', 'marrakech', 'cape town', 'nairobi',
            'seoul', 'taipei', 'manila', 'ho chi minh', 'hanoi', 'phnom penh',
            'bogotá', 'lima', 'buenos aires', 'rio de janeiro', 'santiago',
            'mexico city', 'montreal', 'vancouver', 'edinburgh', 'dublin',
            'stockholm', 'copenhagen', 'oslo', 'helsinki', 'reykjavik',
            'lisbon', 'porto', 'athens', 'santorini', 'mykonos',
            'dubrovnik', 'split', 'zagreb', 'bucharest', 'sofia',
            'belgrade', 'ljubljana', 'tallinn', 'riga', 'vilnius',
            'tel aviv', 'jerusalem', 'doha', 'muscat', 'luxor',
            'fes', 'casablanca', 'johannesburg', 'lagos', 'accra',
            'dar es salaam', 'addis ababa', 'ulaanbaatar', 'almaty',
            'tashkent', 'samarkand', 'baku', 'yerevan', 'tbilisi',
            'cancun', 'playa del carmen', 'tulum', 'guadalajara',
            'córdoba', 'mendoza', 'são paulo', 'salvador', 'cusco',
            'arequipa', 'medellín', 'cartagena', 'valparaíso', 'quito',
            'guayaquil', 'la paz', 'sucre', 'montevideo', 'asunción',
            'panama city', 'san josé', 'havana', 'santo domingo'
        ]
        for city in common_cities:
            if city in response:
                cities.add(city)
    return sorted(list(cities))

def generate_comprehensive_queries():
    """Generate extensive test queries"""
    cities = get_all_cities()
    
    # Query templates
    food_templates = [
        "where to eat in {city}",
        "best restaurants in {city}",
        "food in {city}",
        "where can I find authentic local food in {city}",
        "must-try dishes in {city}",
        "dining in {city}",
        "local cuisine in {city}",
        "street food in {city}",
        "food markets in {city}",
        "best food in {city}"
    ]
    
    attraction_templates = [
        "attractions in {city}",
        "things to do in {city}",
        "what to see in {city}",
        "top attractions in {city}",
        "best things to see in {city}",
        "what can I do in {city}",
        "sights in {city}",
        "places to visit in {city}",
        "must-see in {city}",
        "tourist attractions in {city}"
    ]
    
    accommodation_templates = [
        "where to stay in {city}",
        "hotels in {city}",
        "accommodation in {city}",
        "where should I stay in {city}",
        "good hotels in {city}",
        "best area to stay in {city}",
        "hotel recommendations in {city}"
    ]
    
    transport_templates = [
        "how to get around {city}",
        "public transport in {city}",
        "transportation in {city}",
        "best way to travel in {city}",
        "getting around {city}",
        "transport options in {city}"
    ]
    
    weather_templates = [
        "best time to visit {city}",
        "weather in {city}",
        "when to visit {city}",
        "climate in {city}",
        "best season to visit {city}"
    ]
    
    shopping_templates = [
        "shopping in {city}",
        "where to shop in {city}",
        "best shopping in {city}",
        "shopping areas in {city}"
    ]
    
    practical_templates = [
        "visa requirements for {city}",
        "currency in {city}",
        "do I need a visa for {city}",
        "what currency is used in {city}"
    ]
    
    # Generate queries
    queries = []
    
    # Add queries for random selection of cities
    selected_cities = random.sample(cities, min(100, len(cities)))
    
    for city in selected_cities:
        # Food queries (3 per city)
        queries.extend([t.format(city=city) for t in random.sample(food_templates, 3)])
        # Attraction queries (3 per city)
        queries.extend([t.format(city=city) for t in random.sample(attraction_templates, 3)])
        # Accommodation queries (2 per city)
        queries.extend([t.format(city=city) for t in random.sample(accommodation_templates, 2)])
        # Transport queries (2 per city)
        queries.extend([t.format(city=city) for t in random.sample(transport_templates, 2)])
        # Weather queries (2 per city)
        queries.extend([t.format(city=city) for t in random.sample(weather_templates, 2)])
        # Shopping queries (1 per city)
        queries.extend([t.format(city=city) for t in random.sample(shopping_templates, 1)])
        # Practical queries (2 per city)
        queries.extend([t.format(city=city) for t in random.sample(practical_templates, 2)])
    
    # Add edge cases and vague queries
    vague_queries = ['what', 'why', 'hello', 'ok', 'hi', 'thanks', 'yes', 'no', 'maybe', 'help']
    queries.extend(vague_queries)
    
    # Add broad queries
    broad_queries = [
        'where to eat in japan',
        'attractions in italy',
        'things to do in france',
        'where to eat in thailand',
        'attractions in spain',
        'things to do in germany',
        'where to eat in china',
        'attractions in india'
    ]
    queries.extend(broad_queries)
    
    # Add mountain and surfing queries
    special_queries = [
        'what mountain do you recommend for good view in japan',
        'where can i go surfing',
        'best mountains to visit',
        'surfing destinations',
        'mountain hiking recommendations'
    ]
    queries.extend(special_queries)
    
    return queries

def intensive_training(duration_minutes=60):
    """Run intensive training for specified duration"""
    print("=" * 80)
    print("INTENSIVE TRAINING SESSION")
    print(f"Duration: {duration_minutes} minutes")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    chat = DatasetOnlyChat()
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)
    
    results = {
        'total': 0,
        'passed': 0,
        'failed': 0,
        'clarifying': 0,
        'sorry': 0,
        'errors': 0,
        'categories': {
            'food': {'total': 0, 'passed': 0},
            'attractions': {'total': 0, 'passed': 0},
            'accommodation': {'total': 0, 'passed': 0},
            'transport': {'total': 0, 'passed': 0},
            'weather': {'total': 0, 'passed': 0},
            'shopping': {'total': 0, 'passed': 0},
            'practical': {'total': 0, 'passed': 0},
            'vague': {'total': 0, 'passed': 0},
            'broad': {'total': 0, 'passed': 0},
            'special': {'total': 0, 'passed': 0},
        },
        'gaps': []
    }
    
    # Generate comprehensive queries
    print("\nGenerating comprehensive test queries...")
    all_queries = generate_comprehensive_queries()
    print(f"Generated {len(all_queries)} test queries")
    
    iteration = 0
    query_index = 0
    
    while time.time() < end_time:
        iteration += 1
        elapsed_minutes = (time.time() - start_time) / 60
        remaining_minutes = duration_minutes - elapsed_minutes
        
        print(f"\n{'='*80}")
        print(f"ITERATION {iteration} | Elapsed: {elapsed_minutes:.1f} min | Remaining: {remaining_minutes:.1f} min")
        print(f"{'='*80}")
        
        # Shuffle queries for this iteration
        random.shuffle(all_queries)
        
        for query in all_queries:
            if time.time() >= end_time:
                break
                
            query_index += 1
            results['total'] += 1
            
            # Categorize
            category = 'other'
            query_lower = query.lower()
            if any(word in query_lower for word in ['eat', 'restaurant', 'food', 'dining', 'cuisine', 'dish']):
                category = 'food'
            elif any(word in query_lower for word in ['attraction', 'things to do', 'what to see', 'activities', 'sight', 'visit']):
                category = 'attractions'
            elif any(word in query_lower for word in ['stay', 'hotel', 'accommodation']):
                category = 'accommodation'
            elif any(word in query_lower for word in ['transport', 'get around', 'public transport', 'travel']):
                category = 'transport'
            elif any(word in query_lower for word in ['weather', 'best time', 'time to visit', 'climate', 'season']):
                category = 'weather'
            elif 'shopping' in query_lower:
                category = 'shopping'
            elif any(word in query_lower for word in ['visa', 'currency']):
                category = 'practical'
            elif query_lower in ['what', 'why', 'hello', 'ok', 'hi', 'thanks', 'yes', 'no', 'maybe', 'help']:
                category = 'vague'
            elif any(word in query_lower for word in ['japan', 'italy', 'france', 'thailand', 'spain', 'germany', 'china', 'india']) and 'city' not in query_lower:
                category = 'broad'
            elif any(word in query_lower for word in ['mountain', 'surf', 'hiking', 'climb']):
                category = 'special'
            
            if category != 'other':
                results['categories'][category]['total'] += 1
            
            try:
                response = chat.chat(query)
                response_text = response.get('response', '')
                
                # Check response quality
                is_clarifying = any(phrase in response_text.lower() for phrase in ['could you', 'which', 'please', 'tell me', 'more specific'])
                is_sorry = any(phrase in response_text.lower() for phrase in ['sorry', "couldn't find", "couldn't find relevant", "i'm sorry"])
                is_relevant = len(response_text) > 50 and not is_sorry
                
                # Determine expected behavior
                is_vague = category == 'vague'
                is_broad = category == 'broad'
                
                if is_vague:
                    if is_sorry:
                        results['sorry'] += 1
                        results['passed'] += 1
                        if category != 'other':
                            results['categories'][category]['passed'] += 1
                    else:
                        results['failed'] += 1
                        results['gaps'].append(f"Vague query '{query}' didn't return sorry")
                elif is_broad:
                    if is_clarifying:
                        results['clarifying'] += 1
                        results['passed'] += 1
                        if category != 'other':
                            results['categories'][category]['passed'] += 1
                    else:
                        results['failed'] += 1
                        results['gaps'].append(f"Broad query '{query}' didn't ask clarifying question")
                else:
                    if is_relevant:
                        results['passed'] += 1
                        if category != 'other':
                            results['categories'][category]['passed'] += 1
                    else:
                        results['failed'] += 1
                        results['gaps'].append(f"Query '{query}' returned irrelevant response")
                
                # Print every 50th query
                if query_index % 50 == 0:
                    print(f"[{query_index}] Query: '{query[:50]}...' | {'PASS' if is_relevant or (is_vague and is_sorry) or (is_broad and is_clarifying) else 'FAIL'}")
                
            except Exception as e:
                results['errors'] += 1
                results['failed'] += 1
                results['gaps'].append(f"Query '{query}' caused error: {str(e)}")
                if query_index % 50 == 0:
                    print(f"[{query_index}] Query: '{query[:50]}...' | ERROR: {str(e)}")
        
        # Print iteration summary
        print(f"\nIteration {iteration} Summary:")
        print(f"  Total queries: {results['total']}")
        print(f"  Passed: {results['passed']} ({results['passed']/results['total']*100:.1f}%)")
        print(f"  Failed: {results['failed']} ({results['failed']/results['total']*100:.1f}%)")
    
    # Final summary
    print("\n" + "=" * 80)
    print("INTENSIVE TRAINING FINAL SUMMARY")
    print("=" * 80)
    print(f"Total queries tested: {results['total']}")
    print(f"Passed: {results['passed']} ({results['passed']/results['total']*100:.1f}%)")
    print(f"Failed: {results['failed']} ({results['failed']/results['total']*100:.1f}%)")
    print(f"Clarifying questions: {results['clarifying']}")
    print(f"Sorry messages: {results['sorry']}")
    print(f"Errors: {results['errors']}")
    print(f"Total iterations: {iteration}")
    print(f"Duration: {(time.time() - start_time)/60:.1f} minutes")
    
    print("\nCategory Performance:")
    for cat, data in results['categories'].items():
        if data['total'] > 0:
            pass_rate = data['passed'] / data['total'] * 100
            print(f"  {cat}: {data['passed']}/{data['total']} ({pass_rate:.1f}%)")
    
    if results['gaps']:
        print(f"\nIdentified Gaps ({len(results['gaps'])}):")
        for gap in results['gaps'][:20]:  # Show first 20 gaps
            print(f"  - {gap}")
        if len(results['gaps']) > 20:
            print(f"  ... and {len(results['gaps']) - 20} more gaps")
    else:
        print("\n[SUCCESS] No gaps identified! AI is performing excellently.")
    
    print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    return results

if __name__ == "__main__":
    intensive_training(duration_minutes=60)

