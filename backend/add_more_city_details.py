import os
import csv

"""
Append additional, more detailed entries for many cities into `travel_QA (1).csv`.

These entries focus on:
- specific restaurant/food recommendations
- family‑friendly attractions
- nightlife
- shopping

They are meant to *add* richness on top of the existing core entries.
"""


def get_csv_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "travel_QA (1).csv")


# A mix of major cities across regions (some may already exist in the CSV – that's OK;
# this script just adds *more* detail for them).
CITY_DETAILS = [
    # Asia
    ("Tokyo", "Japan"),
    ("Kyoto", "Japan"),
    ("Osaka", "Japan"),
    ("Sapporo", "Japan"),
    ("Seoul", "South Korea"),
    ("Busan", "South Korea"),
    ("Shanghai", "China"),
    ("Pudong, Shanghai", "China"),
    ("Beijing", "China"),
    ("Hong Kong", "China"),
    ("Bangkok", "Thailand"),
    ("Chiang Mai", "Thailand"),
    ("Singapore", "Singapore"),
    ("Ho Chi Minh City", "Vietnam"),
    ("Hanoi", "Vietnam"),
    ("Kuala Lumpur", "Malaysia"),
    ("Penang", "Malaysia"),
    ("Bali", "Indonesia"),
    ("Jakarta", "Indonesia"),
    # Europe
    ("London", "UK"),
    ("Paris", "France"),
    ("Nice", "France"),
    ("Rome", "Italy"),
    ("Florence", "Italy"),
    ("Barcelona", "Spain"),
    ("Madrid", "Spain"),
    ("Lisbon", "Portugal"),
    ("Porto", "Portugal"),
    ("Amsterdam", "Netherlands"),
    ("Berlin", "Germany"),
    ("Munich", "Germany"),
    ("Prague", "Czech Republic"),
    ("Vienna", "Austria"),
    ("Zurich", "Switzerland"),
    # Americas
    ("New York", "USA"),
    ("Los Angeles", "USA"),
    ("San Francisco", "USA"),
    ("Chicago", "USA"),
    ("Miami", "USA"),
    ("Mexico City", "Mexico"),
    ("Cancun", "Mexico"),
    ("Buenos Aires", "Argentina"),
    ("Rio de Janeiro", "Brazil"),
    ("Sao Paulo", "Brazil"),
    ("Lima", "Peru"),
    # Middle East / Africa
    ("Dubai", "UAE"),
    ("Abu Dhabi", "UAE"),
    ("Doha", "Qatar"),
    ("Istanbul", "Turkey"),
    ("Cairo", "Egypt"),
    ("Cape Town", "South Africa"),
    ("Nairobi", "Kenya"),
    # Oceania
    ("Sydney", "Australia"),
    ("Melbourne", "Australia"),
    ("Brisbane", "Australia"),
    ("Auckland", "New Zealand"),
]


def generate_detail_entries(city: str, country: str):
    city_short = city.replace(", ", " ").lower()
    display_city = city
    display_country = country

    entries = []

    # 1) More specific restaurants / food
    q_food_detail = f"best restaurants in {city_short}"
    r_food_detail = (
        f"Best restaurants in {display_city}, {display_country}: Look for a mix of famous must‑try spots and "
        f"smaller local places. Start with one highly rated signature restaurant for the city, then choose a "
        f"casual local place for comfort food, and finally a dessert or coffee spot. Focus on neighborhoods that "
        f"locals recommend for food (for example, areas known for street food, night markets, or cafe streets)."
    )
    entries.append((q_food_detail, r_food_detail))

    # 2) Family‑friendly attractions
    q_family = f"family friendly attractions in {city_short}"
    r_family = (
        f"Family‑friendly attractions in {display_city}: Combine an easy landmark or viewpoint, a relaxed park or "
        f"waterfront walk, and one kid‑friendly museum or interactive space. Look for zoos, aquariums, science "
        f"museums, or themed parks if your family enjoys them. Plan breaks in cafes or playgrounds so the day "
        f"doesn't feel rushed."
    )
    entries.append((q_family, r_family))

    # 3) Nightlife
    q_nightlife = f"nightlife in {city_short}"
    r_nightlife = (
        f"Nightlife in {display_city}: Start your evening with sunset views or a rooftop bar if available, then move "
        f"to a neighborhood known for bars and live music. Many cities have specific streets or districts where "
        f"nightlife is concentrated – ask locals or your hotel which areas are safest and most popular right now. "
        f"Finish with late‑night snacks from a nearby food street or 24‑hour spot."
    )
    entries.append((q_nightlife, r_nightlife))

    # 4) Shopping
    q_shopping_detail = f"shopping in {city_short}"
    r_shopping_detail = (
        f"Shopping in {display_city}: Mix one modern mall or shopping street with at least one local market or "
        f"boutique area. Look for places that specialize in local products (snacks, crafts, fashion, or design "
        f"stores). If you like souvenirs, focus on smaller shops that sell items actually made in {display_country} "
        f"rather than generic imports."
    )
    entries.append((q_shopping_detail, r_shopping_detail))

    return entries


def append_city_details():
    csv_path = get_csv_path()
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV not found at {csv_path}")

    added = 0
    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for city, country in CITY_DETAILS:
            for q, r in generate_detail_entries(city, country):
                writer.writerow([q, r])
                added += 1

    print(f"Appended {added} detailed rows for {len(CITY_DETAILS)} cities to {csv_path}")


if __name__ == "__main__":
    append_city_details()


