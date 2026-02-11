import os
import csv
import pandas as pd

"""
Script to add accommodation entries (luxury, mid-range, budget) for all cities in the dataset.
Ensures every city has hotel recommendations for all three price categories.
"""

def get_csv_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "travel_QA (1).csv")


def get_all_cities_from_dataset():
    """Get all unique cities from the dataset by parsing questions."""
    csv_path = get_csv_path()
    df = pd.read_csv(csv_path)
    
    cities = set()
    
    # Extract cities from questions (format: "where to stay in {city}", "where to eat in {city}", etc.)
    first_col = df.columns[0]
    for question in df[first_col].dropna().astype(str):
        question_lower = question.lower()
        
        # Pattern: "where to stay in {city}" or "hotels in {city}"
        import re
        patterns = [
            r'where to stay in (\w+(?:\s+\w+)?)',
            r'hotels? in (\w+(?:\s+\w+)?)',
            r'accommodation in (\w+(?:\s+\w+)?)',
            r'where to eat in (\w+(?:\s+\w+)?)',
            r'what to see in (\w+(?:\s+\w+)?)',
            r'attractions in (\w+(?:\s+\w+)?)',
            r'best time to visit (\w+(?:\s+\w+)?)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, question_lower)
            for match in matches:
                city = match.strip()
                # Filter out common words that aren't cities
                if city and len(city) > 2 and city not in ['the', 'and', 'for', 'with', 'from', 'this', 'that']:
                    cities.add(city)
    
    return sorted(list(cities))


def create_accommodation_entries(city: str, country: str = ""):
    """Create accommodation entries for a city."""
    city_title = city.title()
    
    entries = []
    
    # Luxury hotels entry
    entries.append({
        'question': f'where to stay in {city.lower()}',
        'response': f'{city_title} accommodation: Luxury hotels - 5-star properties, boutique hotels, luxury resorts, premium accommodations. Mid-range hotels - 3-4 star hotels, business hotels, comfortable accommodations. Budget hotels - affordable hotels, hostels, guesthouses, budget-friendly options.'
    })
    
    # Specific luxury entry
    entries.append({
        'question': f'luxury hotels in {city.lower()}',
        'response': f'{city_title} luxury hotels: 5-star properties, boutique hotels, luxury resorts, premium accommodations, high-end hotels, deluxe hotels.'
    })
    
    # Specific mid-range entry
    entries.append({
        'question': f'mid-range hotels in {city.lower()}',
        'response': f'{city_title} mid-range hotels: 3-4 star hotels, business hotels, comfortable accommodations, standard hotels, moderate hotels.'
    })
    
    # Specific budget entry
    entries.append({
        'question': f'budget hotels in {city.lower()}',
        'response': f'{city_title} budget hotels: affordable hotels, hostels, guesthouses, budget-friendly options, economy hotels, cheap accommodations.'
    })
    
    return entries


def main():
    csv_path = get_csv_path()
    
    # Read existing data
    df = pd.read_csv(csv_path)
    print(f"CSV columns: {df.columns.tolist()}")
    print(f"CSV shape: {df.shape}")
    
    # Get all cities from dataset
    cities = get_all_cities_from_dataset()
    print(f"Found {len(cities)} cities in dataset")
    print(f"Sample cities: {cities[:10]}")
    
    # Create accommodation entries for each city
    new_entries = []
    for city in cities:
        entries = create_accommodation_entries(city)
        new_entries.extend(entries)
    
    print(f"Created {len(new_entries)} new accommodation entries")
    
    # Convert to list of tuples matching CSV structure
    # CSV appears to have question as first column, response as second
    new_rows = []
    for entry in new_entries:
        new_rows.append([entry['question'], entry['response']])
    
    # Append using CSV writer (safer for large files)
    import csv
    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for row in new_rows:
            writer.writerow(row)
    
    print(f"Appended {len(new_rows)} rows to {csv_path}")
    
    # Check for duplicates by reading back
    df_new = pd.read_csv(csv_path)
    initial_count = len(df_new)
    df_new = df_new.drop_duplicates()
    final_count = len(df_new)
    
    if initial_count != final_count:
        print(f"Removed {initial_count - final_count} duplicates")
        df_new.to_csv(csv_path, index=False)
        print(f"Saved cleaned CSV with {final_count} total entries")
    else:
        print(f"Total entries: {final_count} (no duplicates found)")


if __name__ == "__main__":
    main()

