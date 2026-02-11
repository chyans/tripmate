import os
import csv


"""
Utility script to append more city entries into `travel_QA (1).csv`.

It uses simple, generic templates so the TF‑IDF retriever has at least
basic coverage for many additional cities across different regions.

Each city gets a small set of core questions:
- where to eat
- what to see / attractions
- where to stay
- how to get around
- best time to visit
"""


def get_csv_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "travel_QA (1).csv")


NEW_CITIES = [
    # South America
    ("Quito", "Ecuador"),
    ("Cusco", "Peru"),
    ("Medellin", "Colombia"),
    ("Cartagena", "Colombia"),
    ("Valparaiso", "Chile"),
    ("Mendoza", "Argentina"),
    ("Cordoba", "Argentina"),
    ("Rosario", "Argentina"),
    # North America
    ("Philadelphia", "USA"),
    ("Houston", "USA"),
    ("Dallas", "USA"),
    ("New Orleans", "USA"),
    ("Charlotte", "USA"),
    ("Ottawa", "Canada"),
    ("Halifax", "Canada"),
    ("Victoria", "Canada"),
    # Europe
    ("Hamburg", "Germany"),
    ("Munich", "Germany"),
    ("Frankfurt", "Germany"),
    ("Cologne", "Germany"),
    ("Marseille", "France"),
    ("Lyon", "France"),
    ("Nice", "France"),
    ("Bordeaux", "France"),
    ("Valencia", "Spain"),
    ("Seville", "Spain"),
    ("Granada", "Spain"),
    ("Bilbao", "Spain"),
    ("Porto", "Portugal"),
    ("Bruges", "Belgium"),
    ("Zurich", "Switzerland"),
    ("Geneva", "Switzerland"),
    ("Krakow", "Poland"),
    ("Gdansk", "Poland"),
    # Asia
    ("Pudong, Shanghai", "China"),
    ("Chengdu", "China"),
    ("Guangzhou", "China"),
    ("Shenzhen", "China"),
    ("Xi'an", "China"),
    ("Busan", "South Korea"),
    ("Incheon", "South Korea"),
    ("Da Nang", "Vietnam"),
    ("Hoi An", "Vietnam"),
    ("Chiang Mai", "Thailand"),
    ("Phuket", "Thailand"),
    ("Penang", "Malaysia"),
    ("Johor Bahru", "Malaysia"),
    ("Colombo", "Sri Lanka"),
    ("Kandy", "Sri Lanka"),
    # Middle East & Africa
    ("Doha", "Qatar"),
    ("Abu Dhabi", "UAE"),
    ("Muscat", "Oman"),
    ("Amman", "Jordan"),
    ("Casablanca", "Morocco"),
    ("Fez", "Morocco"),
    ("Nairobi", "Kenya"),
    ("Mombasa", "Kenya"),
    # Oceania
    ("Brisbane", "Australia"),
    ("Perth", "Australia"),
    ("Adelaide", "Australia"),
    ("Gold Coast", "Australia"),
    ("Hobart", "Australia"),
    ("Christchurch", "New Zealand"),
]


def generate_entries(city: str, country: str):
    city_short = city.replace(", ", " ").lower()
    display_city = city
    display_country = country

    entries = []

    # 1) Food
    q_food = f"where to eat in {city_short}"
    r_food = (
        f"{display_city}, {display_country} dining: Try local specialties, popular street food, and a mix of "
        f"casual spots and nicer restaurants. Look for areas with many restaurants clustered together, "
        f"visit local markets for cheap eats, and try at least one place that locals recommend. "
        f"{display_city} offers a wide range of cuisines, from traditional dishes to international options."
    )
    entries.append((q_food, r_food))

    # 2) Attractions
    q_attr = f"what are the main attractions in {city_short}"
    r_attr = (
        f"{display_city}, {display_country}: Explore the main squares or old town area, visit a couple of key "
        f"landmarks or viewpoints, walk through interesting neighborhoods, and check out one museum or cultural "
        f"site. If there is a riverfront, waterfront, or hill nearby, try to visit around sunset for great views."
    )
    entries.append((q_attr, r_attr))

    # 3) Accommodation
    q_stay = f"where to stay in {city_short}"
    r_stay = (
        f"Where to stay in {display_city}: Choose a neighborhood that is safe, walkable, and close to public "
        f"transport. Look for mid-range hotels or guesthouses if you want comfort on a budget, or pick a central "
        f"area if you prefer to be close to restaurants and sights. Budget travelers can consider hostels, while "
        f"those seeking more comfort can look for boutique hotels in quieter streets."
    )
    entries.append((q_stay, r_stay))

    # 4) Transport
    q_transport = f"how to get around {city_short}"
    r_transport = (
        f"Getting around {display_city}: Use a mix of public transport (metro, buses, or trams where available) "
        f"and walking for shorter distances. Taxis or ride-hailing apps are useful at night or when carrying "
        f"luggage. In busy areas, traffic can be slow, so plan extra time. Always check the last train/bus times "
        f"if you stay out late."
    )
    entries.append((q_transport, r_transport))

    # 5) Best time to visit
    q_best_time = f"when is the best time to visit {city_short}"
    r_best_time = (
        f"Best time to visit {display_city}: Generally, the most pleasant times are during spring and autumn, "
        f"when temperatures are comfortable and crowds are manageable. Summers can be hot or humid in many cities, "
        f"while winters may be cold or rainy depending on the region. Always check local events or holidays that "
        f"might affect prices and crowds."
    )
    entries.append((q_best_time, r_best_time))

    return entries


def append_cities():
    csv_path = get_csv_path()
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV not found at {csv_path}")

    added = 0
    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for city, country in NEW_CITIES:
            for q, r in generate_entries(city, country):
                writer.writerow([q, r])
                added += 1

    print(f"Appended {added} new rows for {len(NEW_CITIES)} cities to {csv_path}")


if __name__ == "__main__":
    append_cities()


