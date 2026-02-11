"""
TripMate Dataset-Only Chat Service
Uses TF-IDF retrieval to answer questions directly from the dataset.
No LLM/API calls - pure retrieval and intelligent response selection.
"""

from typing import Dict, List, Optional
import re
from travel_retriever import TravelRetriever, create_retriever

# For typo correction
try:
    from difflib import SequenceMatcher
except ImportError:
    SequenceMatcher = None


class DatasetOnlyChat:
    """
    Chat service that answers directly from retrieved dataset contexts.
    No LLM/API calls - uses only the dataset.
    """
    
    def __init__(self, csv_path: Optional[str] = None):
        """
        Initialize the dataset-only chat service.
        
        Args:
            csv_path: Optional path to travel_QA CSV file
        """
        self.retriever = create_retriever(csv_path)
    
    def _correct_typos(self, query: str) -> str:
        """
        Correct common typos in user queries.
        Handles:
        - Common word typos (attractions, accommodation, etc.)
        - Location name typos (hokkaido, tokyo, etc.)
        """
        corrected = query
        
        # Common word typos
        word_corrections = {
            'aatractions': 'attractions',
            'atractions': 'attractions',
            'atraction': 'attraction',
            'accomodation': 'accommodation',
            'acomodation': 'accommodation',
            'accomodations': 'accommodations',
            'resturant': 'restaurant',
            'restaurants': 'restaurants',
            'resturants': 'restaurants',
            'recomendations': 'recommendations',
            'recomendation': 'recommendation',
            'recomend': 'recommend',
            'recomended': 'recommended',
            'itenerary': 'itinerary',
            'iteneraries': 'itineraries',
            'itenerary': 'itinerary',
            'trasportation': 'transportation',
            'trasport': 'transport',
            'trasportation': 'transportation',
        }
        
        # Apply word corrections (case-insensitive)
        for typo, correct in word_corrections.items():
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(typo) + r'\b'
            corrected = re.sub(pattern, correct, corrected, flags=re.IGNORECASE)
        
        # Location name typos - explicit corrections for common misspellings
        location_corrections = {
            # Common typos for major locations
            'hokkadio': 'hokkaido',
            'hokkido': 'hokkaido',
            'hokkado': 'hokkaido',
            'tokio': 'tokyo',
            'tokyio': 'tokyo',
            'tokyoo': 'tokyo',
        }
        
        # Apply location corrections (case-insensitive)
        corrected_lower = corrected.lower()
        for typo, correct in location_corrections.items():
            # Use word boundaries for single-word locations
            if ' ' not in typo:
                pattern = r'\b' + re.escape(typo) + r'\b'
                if re.search(pattern, corrected_lower):
                    corrected = re.sub(pattern, correct, corrected, flags=re.IGNORECASE)
            else:
                # For multi-word locations, replace the whole phrase
                if typo in corrected_lower:
                    corrected = re.sub(re.escape(typo), correct, corrected, flags=re.IGNORECASE)
        
        # Additional fuzzy matching for location names (if SequenceMatcher is available)
        # This catches typos not in the explicit list above
        if SequenceMatcher:
            # List of all known locations (cities and countries)
            all_locations = [
                'hokkaido', 'tokyo', 'kyoto', 'osaka', 'sapporo', 'fukuoka', 'hiroshima', 'nara',
                'shanghai', 'beijing', 'hong kong', 'taipei', 'seoul', 'busan',
                'bali', 'jakarta', 'singapore', 'bangkok', 'kuala lumpur', 'manila', 'ho chi minh', 'hanoi',
                'paris', 'london', 'rome', 'venice', 'barcelona', 'madrid', 'amsterdam', 'berlin', 'munich',
                'vienna', 'prague', 'budapest', 'istanbul', 'athens', 'lisbon', 'dublin',
                'sydney', 'melbourne', 'auckland', 'wellington',
                'new york', 'los angeles', 'san francisco', 'chicago', 'miami', 'boston', 'seattle',
                'toronto', 'vancouver', 'montreal',
                'rio de janeiro', 'sao paulo', 'buenos aires', 'lima', 'bogota', 'santiago',
                'mexico city', 'dubai', 'cairo', 'cape town', 'nairobi',
                'india', 'japan', 'china', 'thailand', 'indonesia', 'australia', 'usa', 'france',
                'italy', 'spain', 'uk', 'germany', 'canada', 'brazil', 'argentina', 'mexico'
            ]
            
            words = corrected.lower().split()
            corrected_words = []
            i = 0
            
            while i < len(words):
                word = words[i]
                best_match = word
                best_ratio = 0.85  # Higher threshold for fuzzy matching
                matched_location = None
                matched_length = 1
                
                # Check single-word locations
                for location in all_locations:
                    if ' ' not in location:
                        ratio = SequenceMatcher(None, word, location).ratio()
                        if ratio > best_ratio and ratio < 1.0:  # Only correct if it's a typo
                            best_match = location
                            best_ratio = ratio
                            matched_location = location
                    else:
                        # Check multi-word locations
                        location_words = location.split()
                        if i + len(location_words) <= len(words):
                            phrase = ' '.join(words[i:i+len(location_words)])
                            ratio = SequenceMatcher(None, phrase, location).ratio()
                            if ratio > best_ratio:
                                best_match = location
                                best_ratio = ratio
                                matched_location = location
                                matched_length = len(location_words)
                
                if matched_location and matched_length > 1:
                    corrected_words.append(matched_location)
                    i += matched_length
                else:
                    corrected_words.append(best_match)
                    i += 1
            
            # Reconstruct query preserving original structure
            if corrected_words != words:
                original_words = corrected.split()
                if len(original_words) == len(corrected_words):
                    result_words = []
                    for orig, corr in zip(original_words, corrected_words):
                        if orig.lower() == corr.lower():
                            result_words.append(orig)
                        else:
                            # Preserve capitalization style
                            if orig[0].isupper():
                                result_words.append(corr.title())
                            else:
                                result_words.append(corr)
                    corrected = ' '.join(result_words)
                else:
                    # Length mismatch - use corrected words with smart capitalization
                    result_words = []
                    for corr in corrected_words:
                        # Capitalize if it's a proper noun (location)
                        if corr in all_locations:
                            result_words.append(corr.title())
                        else:
                            result_words.append(corr)
                    corrected = ' '.join(result_words)
        
        return corrected
    
    def _extract_location_from_query(self, query: str) -> Dict[str, List[str]]:
        """Extract location mentions from query."""
        query_lower = query.lower()
        locations = {'countries': [], 'cities': []}
        
        # Country keywords
        country_keywords = {
            'japan': ['japan', 'japanese'],
            'usa': ['usa', 'united states', 'america', 'us', 'u.s.'],
            'australia': ['australia', 'australian'],
            'indonesia': ['indonesia', 'indonesian'],
            'thailand': ['thailand', 'thai'],
            'india': ['india', 'indian'],
            'china': ['china', 'chinese'],
            'france': ['france', 'french'],
            'italy': ['italy', 'italian'],
            'spain': ['spain', 'spanish'],
            'switzerland': ['switzerland', 'swiss'],
            'finland': ['finland', 'finnish'],
            'canada': ['canada', 'canadian'],
            'vietnam': ['vietnam', 'vietnamese'],
            'philippines': ['philippines', 'filipino'],
            'malaysia': ['malaysia', 'malaysian'],
            'maldives': ['maldives', 'maldivian'],
            'iceland': ['iceland', 'icelandic'],
            'new zealand': ['new zealand', 'zealand'],
            'argentina': ['argentina', 'argentinian'],
            'brazil': ['brazil', 'brazilian'],
            'chile': ['chile', 'chilean'],
            'peru': ['peru', 'peruvian'],
            'colombia': ['colombia', 'colombian'],
            'mexico': ['mexico', 'mexican'],
            'uk': ['uk', 'united kingdom', 'britain', 'british'],
            'south korea': ['south korea', 'korea', 'korean'],
            'uae': ['uae', 'united arab emirates'],
            'egypt': ['egypt', 'egyptian'],
            'south africa': ['south africa', 'south african'],
            'kenya': ['kenya', 'kenyan']
        }
        
        # City keywords
        # NOTE: This list is intentionally biased toward cities that appear
        # frequently in the dataset or in clarification prompts, so that short
        # follow‑up answers like "sapporo" are correctly recognized as cities.
        city_keywords = {
            'tokyo': ['tokyo'],
            'kyoto': ['kyoto'],
            'osaka': ['osaka'],
            'hokkaido': ['hokkaido'],
            # Key Japanese cities used in clarification examples
            'sapporo': ['sapporo'],
            'fukuoka': ['fukuoka'],
            'hiroshima': ['hiroshima'],
            'shanghai': ['shanghai', 'pudong'],
            'bali': ['bali'],
            'jakarta': ['jakarta'],
            'sydney': ['sydney'],
            'melbourne': ['melbourne'],
            'bangkok': ['bangkok'],
            'paris': ['paris'],
            'rome': ['rome'],
            'venice': ['venice'],
            'barcelona': ['barcelona'],
            'madrid': ['madrid'],
            'buenos aires': ['buenos aires', 'buenosaires'],
            'rio de janeiro': ['rio de janeiro', 'rio'],
            'sao paulo': ['sao paulo', 'são paulo'],
            'lima': ['lima'],
            'bogota': ['bogota', 'bogotá'],
            'santiago': ['santiago'],
            'mexico city': ['mexico city', 'mexico'],
            'new york': ['new york', 'nyc'],
            'los angeles': ['los angeles', 'la'],
            'chicago': ['chicago'],
            'san francisco': ['san francisco', 'sf'],
            'miami': ['miami'],
            'seattle': ['seattle'],
            'boston': ['boston'],
            'london': ['london'],
            'singapore': ['singapore'],
            'hong kong': ['hong kong'],
            'dubai': ['dubai'],
            'istanbul': ['istanbul'],
            'cairo': ['cairo'],
            'cape town': ['cape town'],
            'nairobi': ['nairobi']
        }
        
        # Check for countries
        for country, keywords in country_keywords.items():
            if any(kw in query_lower for kw in keywords):
                locations['countries'].append(country)
        
        # Check for cities
        for city, keywords in city_keywords.items():
            if any(kw in query_lower for kw in keywords):
                locations['cities'].append(city)
        
        return locations
    
    def _filter_accommodation_by_focus(self, text: str, focus: str) -> str:
        """Filter formatted accommodation text to only show the specified category."""
        focus_lower = focus.lower()
        lines = text.split('\n')
        filtered_lines = []
        current_category = None
        include_category = False
        
        for line in lines:
            line_lower = line.lower()
            # Check if this is a category header
            is_category = any(f"{cat}:" in line_lower for cat in ['luxury', 'mid-range', 'budget', 'cheap', 'affordable'])
            
            if is_category:
                current_category = line_lower
                # Check if this is the category we want
                if 'luxury' in focus_lower and 'luxury' in line_lower:
                    include_category = True
                elif 'budget' in focus_lower and ('budget' in line_lower or 'cheap' in line_lower or 'affordable' in line_lower):
                    include_category = True
                elif 'mid' in focus_lower and 'mid' in line_lower:
                    include_category = True
                else:
                    include_category = False
            
            if include_category or (not is_category and current_category and include_category):
                filtered_lines.append(line)
        
        return '\n'.join(filtered_lines) if filtered_lines else text
    
    def _format_accommodation_response(self, response: str, focus: Optional[str] = None) -> str:
        """
        Format accommodation response for better readability.

        If `focus` is provided (e.g. 'luxury', 'budget', 'mid-range'),
        only the matching category section is returned.
        """
        text = response.strip()
        
        # PRIORITY: Handle pattern like "{City} accommodation: Luxury hotels - items, items. Mid-range hotels - items, items. Budget hotels - items, items."
        # Also handle patterns like "Ryokans (description) - items, items. Mid-range hotels - items, items. Budget hotels - items, items."
        # This is the format from our generic accommodation entries
        import re
        
        # Pattern to match: "City accommodation: Luxury hotels - items. Mid-range hotels - items. Budget hotels - items."
        pattern = r'([A-Za-z\s]+)\s+accommodation:\s*(.+?)(?:\.\s*|$)'
        match = re.match(pattern, text, re.IGNORECASE)
        
        if match:
            # Extract the rest of the text after "City accommodation:"
            rest_text = match.group(2) if match else text
        else:
            # Try to match pattern without "accommodation:" prefix
            # Pattern: "Ryokans (description) - items. Mid-range hotels - items. Budget hotels - items."
            rest_text = text
        
        # Split by periods to get each category section
        # Pattern: "Luxury hotels - items, items. Mid-range hotels - items, items. Budget hotels - items, items."
        # Also handle: "Ryokans (description) - items, items. Mid-range hotels - items, items."
        sections = re.split(r'\.\s+(?=[A-Z])', rest_text)
        
        # Check if we have category-like sections
        has_category_sections = False
        for section in sections:
            section_lower = section.lower()
            if any(kw in section_lower for kw in ['luxury', 'mid-range', 'mid range', 'budget', 'ryokan', 'hotel']):
                has_category_sections = True
                break
        
        if has_category_sections:
            
            formatted_sections = []
            category_keywords = {
                'luxury': ['luxury', 'ryokan', 'ryokans', '5-star', '5 star', 'premium', 'deluxe', 'boutique'],
                'mid-range': ['mid-range', 'mid range', 'midrange', '3-star', '3 star', 'moderate', 'standard'],
                'budget': ['budget', 'cheap', 'affordable', 'hostel', 'hostels', '2-star', '2 star', 'economy']
            }
            
            for section in sections:
                section = section.strip()
                if not section:
                    continue
                
                section_lower = section.lower()
                
                # Find which category this section belongs to
                category_name = None
                matched_keyword = None
                for cat, keywords in category_keywords.items():
                    for kw in keywords:
                        # Check if section starts with keyword or contains it
                        if (section_lower.startswith(kw) or 
                            f"{kw} " in section_lower or 
                            f"{kw}s " in section_lower or
                            f"{kw}s-" in section_lower):
                            category_name = cat.title()
                            matched_keyword = kw
                            # Standardize to "Mid-range" instead of "Mid-Range"
                            if cat == 'mid-range':
                                category_name = 'Mid-range'
                            break
                    if category_name:
                        break
                
                if category_name:
                    # Extract items after the category name and dash
                    # Pattern: "Luxury hotels - item1, item2, item3"
                    # Pattern: "Ryokans (traditional inns) - item1, item2"
                    items_match = re.search(r'-\s*(.+)', section)
                    if items_match:
                        items_str = items_match.group(1).strip()
                        # Split by comma
                        items = [item.strip() for item in items_str.split(',') if item.strip()]
                        
                        # Add spacing before category (except first one)
                        if formatted_sections:
                            formatted_sections.append('')
                        
                        # Format category header
                        formatted_sections.append(f"{category_name}:")
                        # Add items as bullets
                        for item in items:
                            # Clean up item - remove trailing periods
                            item = item.rstrip('.')
                            formatted_sections.append(f"  • {item}")
                    else:
                        # No dash, try to extract items after category name
                        # Pattern: "Ryokans (description) item1, item2"
                        # Remove category keywords and get the rest
                        items_str = section
                        # Remove category keyword and "hotels" if present
                        for kw in category_keywords.get(category_name.lower(), []):
                            items_str = re.sub(rf'{kw}s?\s+hotels?\s*', '', items_str, flags=re.IGNORECASE)
                            items_str = re.sub(rf'{kw}s?\s*', '', items_str, flags=re.IGNORECASE)
                        items_str = items_str.strip().lstrip('-').strip()
                        
                        # Check if there are items after parentheses
                        paren_match = re.search(r'\([^)]+\)\s*(.+)', items_str)
                        if paren_match:
                            items_str = paren_match.group(1).strip()
                        
                        if items_str:
                            items = [item.strip() for item in items_str.split(',') if item.strip()]
                            # Add spacing before category (except first one)
                            if formatted_sections:
                                formatted_sections.append('')
                            formatted_sections.append(f"{category_name}:")
                            for item in items:
                                item = item.rstrip('.')
                                formatted_sections.append(f"  • {item}")
                        else:
                            # Add spacing before category (except first one)
                            if formatted_sections:
                                formatted_sections.append('')
                            formatted_sections.append(f"{category_name}:")
            
            if formatted_sections:
                result = '\n'.join(formatted_sections)
                # Filter by focus if provided
                if focus:
                    return self._filter_accommodation_by_focus(result, focus)
                return result
        
        # Fallback: Handle line-by-line formatting for other formats
        # Also handle responses that might have different structures
        lines = text.split('\n')
        formatted_lines = []
        category_keywords = {
            'luxury': ['luxury', 'ryokan', 'ryokans', '5-star', '5 star', 'premium', 'deluxe', 'boutique'],
            'mid-range': ['mid-range', 'mid range', 'midrange', '3-star', '3 star', 'moderate', 'standard'],
            'budget': ['budget', 'cheap', 'affordable', 'hostel', 'hostels', '2-star', '2 star', 'economy']
        }
        
        current_category = None
        
        for line in lines:
            line = line.strip()
            if not line:
                formatted_lines.append('')
                continue
            
            line_lower = line.lower()
            
            # Check if this line starts a category
            category_found = None
            for cat_name, keywords in category_keywords.items():
                for kw in keywords:
                    # Check if line starts with category keyword or contains it with colon
                    if (line_lower.startswith(kw) or 
                        f"{kw}:" in line_lower or 
                        (f"{kw} " in line_lower and ':' in line) or
                        (line_lower.startswith(kw + 's') and ':' in line)):  # Handle "Ryokans:"
                        category_found = cat_name.title()
                        if cat_name == 'mid-range':
                            category_found = 'Mid-range'
                        break
                if category_found:
                    break
            
            # If no category found but line starts with ":" or is just ":", skip it
            if line == ':' or line.startswith(':') and not category_found:
                continue
            
            if category_found:
                # This is a category header
                if current_category:
                    formatted_lines.append('')  # Add spacing between categories
                
                # Extract category name
                if ':' in line:
                    parts = line.split(':', 1)
                    category_display = parts[0].strip()
                    # Clean up category display - remove city name if present
                    category_display = re.sub(r'^[A-Za-z\s]+\s+accommodation\s*', '', category_display, flags=re.IGNORECASE)
                    category_display = category_display.strip()
                    
                    # Map to standard category names
                    if 'ryokan' in category_display.lower():
                        category_display = 'Luxury'
                    elif 'mid-range' in category_display.lower() or 'mid range' in category_display.lower():
                        category_display = 'Mid-range'
                    elif 'luxury' in category_display.lower() or '5-star' in category_display.lower() or 'premium' in category_display.lower():
                        category_display = 'Luxury'
                    elif 'budget' in category_display.lower() or 'hostel' in category_display.lower():
                        category_display = 'Budget'
                    elif not category_display:
                        category_display = category_found
                    
                    items_str = parts[1].strip() if len(parts) > 1 else ""
                else:
                    category_display = category_found
                    items_str = ""
                
                formatted_lines.append(f"{category_display}:")
                current_category = category_found
                
                # If there are items on the same line, format them
                if items_str:
                    items = [item.strip() for item in items_str.split(',')]
                    for item in items:
                        if item:
                            formatted_lines.append(f"  • {item}")
            elif line.startswith('  •') or line.startswith('•'):
                # Already formatted bullet point, keep as is (ensure proper indentation)
                if not line.startswith('  '):
                    formatted_lines.append(f"  {line}")
                else:
                    formatted_lines.append(line)
            elif line.startswith('-'):
                # Dash-formatted item, convert to bullet
                item_text = line.lstrip('-').strip()
                # Handle items with descriptions like "Ryokans (traditional inns) - Tawaraya"
                if ' - ' in item_text:
                    parts = item_text.split(' - ', 1)
                    formatted_lines.append(f"  • {parts[0].strip()} - {parts[1].strip()}")
                else:
                    formatted_lines.append(f"  • {item_text}")
            elif ':' in line and not line.startswith(':'):
                # Check if this is a section header (Areas, Budget, etc.)
                if any(cat in line_lower for cat in ['areas', 'area', 'location', 'locations', 'budget', 'mid-range', 'luxury', 'price', 'cost']):
                    # This is a section header - keep as header
                    formatted_lines.append(line)
                else:
                    # Regular colon line - keep as is
                    formatted_lines.append(line)
            elif current_category and (',' in line or (len(line) < 100 and not line.endswith('.'))):
                # This is likely an item under the current category
                if ',' in line:
                    items = [item.strip() for item in line.split(',')]
                    for item in items:
                        if item:
                            # Handle items with descriptions like "Ryokans (traditional inns) - Tawaraya"
                            if ' - ' in item:
                                formatted_lines.append(f"  • {item}")
                            else:
                                formatted_lines.append(f"  • {item}")
                else:
                    formatted_lines.append(f"  • {line}")
            elif len(line) < 50 and not line.endswith(('.', '!', '?')):
                # Short line that looks like a list item
                formatted_lines.append(f"  • {line}")
            else:
                # Regular text - keep as is (don't add bullets to paragraphs)
                formatted_lines.append(line)
        
        # If focus is provided, filter to only that category
        if focus:
            focus_lower = focus.lower()
            filtered_lines = []
            current_category = None
            include_category = False
            
            for line in formatted_lines:
                line_lower = line.lower()
                # Check if this is a category header
                is_category = any(f"{cat}:" in line_lower for cat in ['luxury', 'mid-range', 'budget', 'cheap', 'affordable'])
                
                if is_category:
                    current_category = line_lower
                    # Check if this is the category we want
                    if 'luxury' in focus_lower and 'luxury' in line_lower:
                        include_category = True
                    elif 'budget' in focus_lower and ('budget' in line_lower or 'cheap' in line_lower or 'affordable' in line_lower):
                        include_category = True
                    elif 'mid' in focus_lower and 'mid' in line_lower:
                        include_category = True
                    else:
                        include_category = False
                
                if include_category or (not is_category and current_category and include_category):
                    filtered_lines.append(line)
            
            if filtered_lines:
                return '\n'.join(filtered_lines)
        
        # Return all formatted lines
        if formatted_lines:
            return '\n'.join(formatted_lines)
        
        # Fallback: original formatting logic
        if ':' in text:
            raw_lines = []
            for block in text.split('\n'):
                for seg in block.split('. '):
                    seg = seg.strip()
                    if seg:
                        raw_lines.append(seg)

            # Group lines into sections by category
            sections: Dict[str, List[str]] = {}
            current_key = "__other__"
            sections[current_key] = []

            for line in raw_lines:
                lower = line.lower()
                if 'luxury' in lower:
                    current_key = 'luxury'
                    sections.setdefault(current_key, [])
                    sections[current_key].append(line)
                elif 'mid-range' in lower or 'mid range' in lower:
                    current_key = 'mid-range'
                    sections.setdefault(current_key, [])
                    sections[current_key].append(line)
                elif 'budget' in lower:
                    current_key = 'budget'
                    sections.setdefault(current_key, [])
                    sections[current_key].append(line)
                else:
                    sections.setdefault(current_key, [])
                    sections[current_key].append(line)

            # If a focus is given, prefer that section only
            if focus:
                key = None
                f = focus.lower()
                if 'luxury' in f:
                    key = 'luxury'
                elif 'budget' in f:
                    key = 'budget'
                elif 'mid' in f:
                    key = 'mid-range'

                if key and key in sections and sections[key]:
                    lines = []
                    for ln in sections[key]:
                        if ':' in ln and not ln.strip().startswith('-'):
                            lines.append(ln)
                        else:
                            lines.append(f"• {ln}")
                    return "\n".join(lines)

            # No focus: return all sections, formatted with bullets
            formatted: List[str] = []
            for _, lines in sections.items():
                for ln in lines:
                    if ':' in ln and not ln.strip().startswith('-'):
                        formatted.append(ln)
                    else:
                        formatted.append(f"• {ln}")
            return "\n".join(formatted) if formatted else text

        # Fallback: no obvious structure, just return as-is
        return text
    
    def _format_response(self, response: str) -> str:
        """
        Format any AI response with proper indexing, bullet points, and organized spacing.
        This ensures all responses are well-organized and easy to read.
        ALWAYS formats responses - never returns unformatted text.
        """
        if not response or not response.strip():
            return response
        
        text = response.strip()
        
        # PRIORITY: Check if this is a clarifying question - format it properly
        clarifying_phrases = [
            "i'd be happy to help",
            "could you tell me",
            "to give you the best recommendations",
            "could you please",
            "please tell me",
            "which city",
            "what type",
            "once i know"
        ]
        is_clarifying = any(phrase in text.lower() for phrase in clarifying_phrases)
        
        if is_clarifying:
            # This is a clarifying question - format it properly preserving structure
            # Split by newlines first to preserve existing structure
            lines = text.split('\n')
            formatted_lines = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    formatted_lines.append('')
                    continue
                
                # If line already starts with dash (example), keep it as is
                if line.startswith('-'):
                    formatted_lines.append(line)
                # If line contains "For example:" or ends with colon, keep as is
                elif 'For example' in line or line.endswith(':'):
                    formatted_lines.append(line)
                # If line is already formatted with bullets, keep as is
                elif line.startswith('  •'):
                    formatted_lines.append(line)
                # If line is a short example item (contains parentheses with locations)
                elif '(' in line and ')' in line and len(line) < 100:
                    # This is likely an example item - format as bullet
                    if not line.startswith('-'):
                        formatted_lines.append(f"  • {line}")
                    else:
                        formatted_lines.append(line)
                # If line is a complete sentence/question, keep as paragraph
                elif line.endswith('?') or line.endswith('!') or ('.' in line and len(line) > 50):
                    formatted_lines.append(line)
                # Otherwise, treat as regular text
                else:
                    formatted_lines.append(line)
            
            return '\n'.join(formatted_lines)
        
        # PRIORITY: Check for category-based lists (Luxury - X, Y. Mid-range - A, B. Budget - C, D)
        # Pattern: "Category - Item1, Item2. Category - Item3, Item4"
        category_patterns = ['luxury', 'mid-range', 'mid range', 'budget', 'cheap', 'expensive', 'affordable']
        if any(cat in text.lower() for cat in category_patterns):
            # Check if text has category structure
            lines = text.split('. ')
            if len(lines) >= 2:
                formatted_lines = []
                current_category = None
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    line_lower = line.lower()
                    # Check if this line starts a new category
                    category_found = None
                    for cat in category_patterns:
                        if line_lower.startswith(cat) or f"{cat} -" in line_lower or f"{cat}:" in line_lower:
                            category_found = cat.title()
                            # Extract items after the category
                            if ' - ' in line:
                                parts = line.split(' - ', 1)
                                category_found = parts[0].strip().title()
                                items_str = parts[1].strip()
                            elif ':' in line:
                                parts = line.split(':', 1)
                                category_found = parts[0].strip().title()
                                items_str = parts[1].strip()
                            else:
                                items_str = line.replace(cat, '', 1).strip().lstrip('-').strip()
                            
                            # Format category header
                            if current_category:
                                formatted_lines.append('')  # Add spacing between categories
                            formatted_lines.append(f"{category_found}:")
                            current_category = category_found
                            
                            # Split items by comma
                            if items_str:
                                items = [item.strip() for item in items_str.split(',')]
                                for item in items:
                                    if item:
                                        formatted_lines.append(f"  • {item}")
                            break
                    
                    if not category_found:
                        # This line might be continuation of previous category or standalone item
                        if current_category:
                            # Check if it's a comma-separated list
                            if ',' in line:
                                items = [item.strip() for item in line.split(',')]
                                for item in items:
                                    if item:
                                        formatted_lines.append(f"  • {item}")
                            else:
                                formatted_lines.append(f"  • {line}")
                        else:
                            # Standalone line, format as regular item
                            formatted_lines.append(line)
                
                if formatted_lines:
                    return '\n'.join(formatted_lines)
        
        # FIRST: Check for patterns like "X (description), Y (description), Z (description)"
        # This handles cases like "Tokyo (modern city, temples, food), Kyoto (ancient capital)..."
        if ',' in text and '(' in text:
            comma_count = text.count(',')
            paren_count = text.count('(')
            
            # If we have multiple items with descriptions, format as bullet list
            if comma_count >= 2 and paren_count >= 2:
                parts = []
                current_part = ""
                paren_depth = 0
                
                for char in text:
                    if char == '(':
                        paren_depth += 1
                        current_part += char
                    elif char == ')':
                        paren_depth -= 1
                        current_part += char
                    elif char == ',' and paren_depth == 0:
                        parts.append(current_part.strip())
                        current_part = ""
                    else:
                        current_part += char
                
                if current_part.strip():
                    parts.append(current_part.strip())
                
                if len(parts) >= 2:
                    formatted_parts = []
                    for i, part in enumerate(parts):
                        part = part.strip()
                        if part:
                            # Remove trailing period if present
                            if part.endswith('.'):
                                part = part[:-1]
                            formatted_parts.append(f"  • {part}")
                    return '\n'.join(formatted_parts)
        
        # SECOND: Check for simple comma-separated lists (most common case)
        if ',' in text:
            # Split by commas but be smart about it
            parts = []
            current = ""
            paren_depth = 0
            
            for char in text:
                if char == '(':
                    paren_depth += 1
                    current += char
                elif char == ')':
                    paren_depth -= 1
                    current += char
                elif char == ',' and paren_depth == 0:
                    parts.append(current.strip())
                    current = ""
                else:
                    current += char
            
            if current.strip():
                parts.append(current.strip())
            
            # If we have multiple parts and they look like list items
                if len(parts) >= 2:
                    # Check if parts are reasonable list items (not too long, not sentences)
                    avg_length = sum(len(p) for p in parts) / len(parts)
                    if avg_length < 120:  # Reasonable list item length
                        formatted_parts = []
                        for i, part in enumerate(parts):
                            part = part.strip()
                            if part:
                                # Remove trailing period if present
                                if part.endswith('.'):
                                    part = part[:-1]
                                formatted_parts.append(f"  • {part}")
                        return '\n'.join(formatted_parts)
        
        # THIRD: Check for pattern "Header: Item1, Item2, Item3" (like "Japan best places: Tokyo, Kyoto...")
        if ':' in text and ',' in text:
            # Check if it's a header followed by a list
            colon_pos = text.find(':')
            if colon_pos > 0 and colon_pos < 100:  # Colon is early in the text
                header = text[:colon_pos].strip()
                list_part = text[colon_pos + 1:].strip()
                
                # Check if list_part looks like a comma-separated list
                if ',' in list_part:
                    list_items = []
                    current_item = ""
                    paren_depth = 0
                    
                    for char in list_part:
                        if char == '(':
                            paren_depth += 1
                            current_item += char
                        elif char == ')':
                            paren_depth -= 1
                            current_item += char
                        elif char == ',' and paren_depth == 0:
                            item = current_item.strip()
                            if item:
                                list_items.append(item)
                            current_item = ""
                        else:
                            current_item += char
                    
                    if current_item.strip():
                        list_items.append(current_item.strip())
                    
                    # If we have multiple items, format as bullet list
                    if len(list_items) >= 2:
                        formatted_items = []
                        for i, item in enumerate(list_items):
                            item = item.strip()
                            if item:
                                # Remove trailing period if present
                                if item.endswith('.'):
                                    item = item[:-1]
                                formatted_items.append(f"  • {item}")
                        
                        # Combine header and formatted list
                        result = f"{header}:\n\n" + '\n'.join(formatted_items)
                        # Add any trailing text if present
                        if list_part.endswith('.'):
                            trailing = list_part[list_part.rfind(list_items[-1]) + len(list_items[-1]):].strip()
                            if trailing and trailing != '.':
                                result += f"\n\n{trailing}"
                        return result
        
        # FOURTH: If response already has good structure (numbered lists, bullet points), enhance it
        if any(marker in text for marker in ['1.', '2.', '3.', '•', '-', ':', '\n']):
            # Split by common separators
            lines = []
            current_section = []
            
            # Split by double newlines first (paragraphs)
            paragraphs = text.split('\n\n')
            
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                
                # Check if paragraph contains a list
                if any(marker in para for marker in ['•', '-', '1.', '2.', '3.', ':', '(']):
                    # Split by single newlines
                    para_lines = para.split('\n')
                    for line in para_lines:
                        line = line.strip()
                        if not line:
                            continue
                        
                        # If line starts with number or bullet, keep it
                        if line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '•', '-')):
                            lines.append(line)
                        # If line contains colon (likely a category header)
                        elif ':' in line and len(line.split(':')) == 2:
                            if current_section:
                                lines.append('')
                            lines.append(line)
                            current_section = []
                        # If line is a short phrase (likely a list item)
                        elif len(line) < 100 and not line.endswith('.'):
                            # Convert to bullet point
                            if not line.startswith(('•', '-')):
                                lines.append(f"  • {line}")
                            else:
                                lines.append(f"  {line}")
                        else:
                            # Regular paragraph text
                            lines.append(line)
                else:
                    # Regular paragraph
                    if current_section:
                        lines.append('')
                    lines.append(para)
                    current_section = []
            
            # Join with proper spacing
            formatted = '\n'.join(lines)
            
            # Post-process: ensure consistent bullet formatting
            formatted_lines = formatted.split('\n')
            result_lines = []
            in_list = False
            
            for i, line in enumerate(formatted_lines):
                line_stripped = line.strip()
                
                # Detect list items
                if line_stripped.startswith(('•', '-', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')):
                    if not in_list and result_lines and result_lines[-1].strip():
                        result_lines.append('')
                    in_list = True
                    # Ensure consistent bullet format
                    if line_stripped.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')):
                        result_lines.append(line)
                    elif line_stripped.startswith(('-', '•')):
                        # Ensure proper indentation
                        if not line.startswith('  '):
                            result_lines.append(f"  {line_stripped}")
                        else:
                            result_lines.append(line)
                    else:
                        result_lines.append(line)
                elif ':' in line_stripped and len(line_stripped.split(':')) == 2:
                    # Category header
                    if in_list:
                        result_lines.append('')
                        in_list = False
                    result_lines.append(line_stripped)
                else:
                    # Regular text
                    if in_list and line_stripped:
                        result_lines.append('')
                        in_list = False
                    if line_stripped:
                        result_lines.append(line_stripped)
            
            return '\n'.join(result_lines)
        
        # If response is a simple paragraph, try to detect and format lists
        # Check for patterns like "X (description), Y (description)"
        if ',' in text and '(' in text:
            # Likely a list separated by commas
            parts = text.split(',')
            if len(parts) > 2:
                formatted_parts = []
                for i, part in enumerate(parts):
                    part = part.strip()
                    if part:
                        # Use bullet points for all items
                        formatted_parts.append(f"  • {part}")
                return '\n'.join(formatted_parts)
        
        # Check for patterns like "X (description), Y (description), Z (description)"
        # This handles cases like "Tokyo (modern city, temples, food), Kyoto (ancient capital)..."
        if ',' in text and '(' in text:
            # Count commas and parentheses to see if it's a list
            comma_count = text.count(',')
            paren_count = text.count('(')
            
            # If we have multiple items with descriptions, format as bullet list
            if comma_count >= 2 and paren_count >= 2:
                parts = []
                current_part = ""
                paren_depth = 0
                
                for char in text:
                    if char == '(':
                        paren_depth += 1
                        current_part += char
                    elif char == ')':
                        paren_depth -= 1
                        current_part += char
                    elif char == ',' and paren_depth == 0:
                        parts.append(current_part.strip())
                        current_part = ""
                    else:
                        current_part += char
                
                if current_part.strip():
                    parts.append(current_part.strip())
                
                if len(parts) > 2:
                    formatted_parts = []
                    for i, part in enumerate(parts):
                        part = part.strip()
                        if part:
                            # Remove trailing period if present
                            if part.endswith('.'):
                                part = part[:-1]
                            formatted_parts.append(f"  • {part}")
                    return '\n'.join(formatted_parts)
        
        # Check for patterns like "X, Y, Z" (simple comma-separated list)
        if ',' in text:
            parts = [p.strip() for p in text.split(',')]
            # If all parts are relatively short (likely list items)
            if len(parts) > 3 and all(len(p) < 100 for p in parts):
                formatted_parts = []
                for i, part in enumerate(parts):
                    if part:
                        # Remove trailing period if present
                        if part.endswith('.'):
                            part = part[:-1]
                        formatted_parts.append(f"  • {part}")
                return '\n'.join(formatted_parts)
        
        # Check for patterns like "X: description, Y: description" (colon-separated list)
        if ':' in text and ',' in text:
            # Count colons to see if it's a structured list
            colon_count = text.count(':')
            if colon_count >= 2:
                parts = text.split(',')
                if len(parts) > 2:
                    formatted_parts = []
                    for i, part in enumerate(parts):
                        part = part.strip()
                        if part:
                            # Remove any existing numbering and use bullet points
                            part = re.sub(r'^\d+\.\s*', '', part)
                            formatted_parts.append(f"  • {part}")
                    return '\n'.join(formatted_parts)
        
        # LAST RESORT: Format any remaining text that looks like a list
        # Check if text contains multiple sentences that could be list items
        sentences = text.split('. ')
        if len(sentences) >= 2:
            # Check if sentences are short enough to be list items
            short_sentences = [s for s in sentences if len(s.strip()) < 150]
            if len(short_sentences) >= 2:
                formatted_items = []
                for i, sentence in enumerate(short_sentences):
                    sentence = sentence.strip()
                    if sentence:
                        # Remove trailing period if present
                        if sentence.endswith('.'):
                            sentence = sentence[:-1]
                        formatted_items.append(f"  • {sentence}")
                if formatted_items:
                    return '\n'.join(formatted_items)
        
        # If all else fails, ensure at least proper spacing
        return text
    
    def _format_food_response(self, response: str) -> str:
        """Format food response for better readability with consistent indexing."""
        text = response.strip()
        
        # PRIORITY: Handle category-based structure like "{City} restaurants: Fine dining - items, items. Cafes - items, items. Markets - items, items."
        import re
        
        # Pattern: "{City} restaurants: Fine dining - items, items. Cafes - items, items. Markets - items, items."
        # Or: "Fine dining - items, items. Cafes - items, items."
        category_pattern = r'([A-Za-z\s]+)\s+restaurants?:\s*(.+?)(?:\.\s*|$)'
        match = re.match(category_pattern, text, re.IGNORECASE)
        
        if match:
            # Extract the rest after "{City} restaurants:"
            rest_text = match.group(2) if match else text
        else:
            rest_text = text
        
        # Split by periods to get each category section
        # Pattern: "Fine dining - items, items. Cafes - items, items. Markets - items, items."
        sections = re.split(r'\.\s+(?=[A-Z])', rest_text)
        
        # Check if we have category-like sections (containing " - " pattern)
        has_category_sections = False
        for section in sections:
            if ' - ' in section:
                has_category_sections = True
                break
        
        if has_category_sections:
            formatted_sections = []
            
            for section in sections:
                section = section.strip()
                if not section:
                    continue
                
                # Check if this section has a category pattern: "Category - items, items"
                if ' - ' in section:
                    parts = section.split(' - ', 1)
                    category_name = parts[0].strip()
                    items_str = parts[1].strip() if len(parts) > 1 else ""
                    
                    # Add spacing before category (except first one)
                    if formatted_sections:
                        formatted_sections.append('')
                    
                    # Format category header
                    formatted_sections.append(f"{category_name}:")
                    
                    # Split items by comma
                    if items_str:
                        items = [item.strip() for item in items_str.split(',') if item.strip()]
                        for item in items:
                            # Remove trailing period if present
                            item = item.rstrip('.')
                            formatted_sections.append(f"  • {item}")
            
            if formatted_sections:
                return '\n'.join(formatted_sections)
        
        # Check if response has "Try:" or "Recommendations:" section
        if 'Try:' in text or 'try:' in text or 'Recommendations:' in text or 'recommendations:' in text:
            # Split into main content and recommendations
            parts = []
            if 'Try:' in text:
                parts = text.split('Try:', 1)
            elif 'try:' in text:
                parts = text.split('try:', 1)
            elif 'Recommendations:' in text:
                parts = text.split('Recommendations:', 1)
            elif 'recommendations:' in text:
                parts = text.split('recommendations:', 1)
            
            if len(parts) == 2:
                main_content = parts[0].strip()
                recommendations = parts[1].strip()
                
                # Format main content (food items) - use _format_response to get bullet list
                formatted_main = self._format_response(main_content)
                
                # Split recommendations by periods to separate items from trailing text
                # Look for the last sentence that might be a description (usually longer, contains quotes or special phrases)
                rec_sentences = recommendations.split('. ')
                rec_items_text = []
                trailing_text = []
                
                for i, sentence in enumerate(rec_sentences):
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    # Check if this looks like a descriptive sentence (contains quotes, long, or specific patterns)
                    if ('"' in sentence or "'" in sentence or len(sentence) > 80 or 
                        any(phrase in sentence.lower() for phrase in ['people', 'love', 'culture', 'tradition', 'famous', 'known'])):
                        # This is likely trailing descriptive text, not a recommendation item
                        trailing_text = rec_sentences[i:]
                        break
                    else:
                        rec_items_text.append(sentence)
                
                # Format recommendations section
                if rec_items_text:
                    # Join back the recommendation items
                    rec_text = '. '.join(rec_items_text)
                    # Check if recommendations are comma-separated
                    if ',' in rec_text:
                        rec_items = [item.strip() for item in rec_text.split(',')]
                        formatted_rec = []
                        
                        for item in rec_items:
                            if item:
                                # Remove trailing period if present
                                item = item.rstrip('.')
                                formatted_rec.append(f"  • {item}")
                        
                        result = f"{formatted_main}\n\n{chr(10).join(formatted_rec)}"
                        # Add trailing text if any
                        if trailing_text:
                            trailing = '. '.join(t.strip() for t in trailing_text if t.strip())
                            if trailing:
                                result += f"\n\n{trailing}"
                        return result
                    else:
                        # Single recommendation
                        rec_text = rec_text.rstrip('.')
                        result = f"{formatted_main}\n\n  • {rec_text}"
                        # Add trailing text if any
                        if trailing_text:
                            trailing = '. '.join(t.strip() for t in trailing_text if t.strip())
                            if trailing:
                                result += f"\n\n{trailing}"
                        return result
                else:
                    # No clear recommendations, just trailing text
                    trailing = '. '.join(t.strip() for t in trailing_text if t.strip())
                    if trailing:
                        return f"{formatted_main}\n\n{trailing}"
                    return formatted_main
        
        # If response uses inline "•" bullets, keep as bullet list
        if '•' in text:
            segments = text.split('•')
            lines = []
            # Anything before the first bullet is treated as an optional header
            header = segments[0].strip()
            if header:
                lines.append(header)
            for seg in segments[1:]:
                text_item = seg.strip(" \n-")
                if not text_item:
                    continue
                lines.append(f"  • {text_item}")
            if lines:
                return "\n".join(lines)
        
        # Check if response already has numbered list - ensure consistency
        if re.search(r'^\d+\.', text, re.MULTILINE):
            # Response already has numbers, convert all to bullets
            lines = text.split('\n')
            formatted_lines = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    formatted_lines.append('')
                    continue
                
                # If line starts with a number, convert to bullet
                if re.match(r'^\d+\.', line):
                    # Extract content after number
                    content = re.sub(r'^\d+\.\s*', '', line)
                    formatted_lines.append(f"  • {content}")
                # If line starts with bullet, keep as is (ensure proper indentation)
                elif line.startswith(('•', '-')):
                    content = line.lstrip('•-').strip()
                    formatted_lines.append(f"  • {content}")
                # If line is a header (contains colon), keep as is
                elif ':' in line and len(line.split(':')) == 2:
                    formatted_lines.append(line)
                else:
                    formatted_lines.append(line)
            
            return '\n'.join(formatted_lines)
        
        # Use the general format_response function
        return self._format_response(text)
    
    def _enhance_with_context(self, current_query: str, conversation_history: List[Dict]) -> str:
        """
        Enhance current query with conversation context if it's a follow-up.
        
        Args:
            current_query: Current user query
            conversation_history: List of previous messages [{"role": "user/assistant", "content": "..."}]
        
        Returns:
            Enhanced query string
        """
        if not conversation_history or len(conversation_history) < 2:
            return current_query
        
        # Extract all messages in order
        messages = conversation_history[-6:]  # Check last 6 messages for better context
        
        # Find the most recent assistant message asking for clarification
        last_assistant_msg = None
        last_user_msg = None
        previous_user_msgs = []
        
        for msg in reversed(messages):
            role = msg.get("role", "")
            content = msg.get("content", "").lower()
            
            if role == "assistant" and not last_assistant_msg:
                last_assistant_msg = content
            elif role == "user":
                if not last_user_msg:
                    last_user_msg = content
                else:
                    previous_user_msgs.append(content)
        
        if not last_assistant_msg:
            return current_query
        
        # Check if last assistant message was asking for clarification
        is_clarifying = any(phrase in last_assistant_msg for phrase in [
            "could you tell me", "which city", "which country", "what type",
            "could you provide", "please tell me", "tell me which",
            "what type of accommodation", "which area"
        ])
        
        # Check if current query is very short (likely a follow-up answer)
        # OR contains food/accommodation type keywords (even if longer)
        current_query_lower = current_query.lower().strip()
        type_keywords = [
            'fine dining', 'street food', 'sushi', 'ramen', 'luxury', 'budget', 'affordable',
            'hotel', 'accommodation', 'restaurant', 'dining', 'cuisine', 'dollar', 'dollars'
        ]
        has_type_keyword = any(kw in current_query_lower for kw in type_keywords)
        # Also check if query contains comma (indicates multiple pieces of info like "fine dining, my budget is 100 dollars")
        has_multiple_parts = ',' in current_query_lower
        
        is_short_answer = (
            (len(current_query.split()) <= 8 and not any(kw in current_query_lower for kw in ['?', 'what', 'where', 'how', 'when', 'why', 'which'])) or
            has_type_keyword or
            has_multiple_parts
        )
        
        # Extract context from conversation: topic, location, and any modifiers
        detected_topic = None
        detected_location = None
        detected_modifier = None  # e.g., "luxury", "budget", "best"
        
        # Check all previous user messages for context
        all_user_msgs = [last_user_msg] + previous_user_msgs if last_user_msg else previous_user_msgs
        
        topic_keywords = {
            'hotel': ['hotel', 'accommodation', 'stay', 'lodging', 'where to stay', 'hotels'],
            'food': ['food', 'restaurant', 'eat', 'dining', 'cuisine', 'where to eat'],
            'attraction': ['attraction', 'things to do', 'what to see', 'places to visit'],
            'transport': ['transport', 'transportation', 'get around', 'how to get'],
            'weather': ['weather', 'best time', 'when to visit', 'climate'],
            # Treat itinerary-style queries as a separate topic so follow-ups keep the context
            'itinerary': ['itinerary', 'itineraries', 'day by day', '1 day', 'one day', 'schedule', 'trip plan', 'daily plan']
        }
        
        # Extract topic from previous messages
        for msg in all_user_msgs:
            for topic, keywords in topic_keywords.items():
                if any(kw in msg for kw in keywords):
                    detected_topic = topic
                    break
            if detected_topic:
                break
        
        # Extract location from previous messages
        location_keywords = {
            'tokyo': ['tokyo'],
            'kyoto': ['kyoto'],
            'osaka': ['osaka'],
            'hokkaido': ['hokkaido'],
            # Key Japanese cities that often appear in clarifying prompts
            'sapporo': ['sapporo'],
            'fukuoka': ['fukuoka'],
            'hiroshima': ['hiroshima'],
            'japan': ['japan', 'japanese'],
            'paris': ['paris'],
            'london': ['london'],
            'bangkok': ['bangkok'],
            'singapore': ['singapore'],
            'seoul': ['seoul'],
            'barcelona': ['barcelona'],
            'rome': ['rome'],
            'amsterdam': ['amsterdam'],
            'vienna': ['vienna'],
            'prague': ['prague'],
            'budapest': ['budapest'],
            'istanbul': ['istanbul'],
            'cairo': ['cairo'],
            'dubai': ['dubai'],
            'sydney': ['sydney'],
            'melbourne': ['melbourne'],
            'bali': ['bali'],
            'mumbai': ['mumbai'],
            'delhi': ['delhi'],
            'beijing': ['beijing'],
            # Recognize both Shanghai and Pudong for context
            'shanghai': ['shanghai', 'pudong']
        }
        
        for msg in all_user_msgs:
            for location, keywords in location_keywords.items():
                if any(kw in msg for kw in keywords):
                    detected_location = location
                    break
            if detected_location:
                break
        
        # Check if current query is a modifier (luxury, budget, best, etc.)
        modifier_keywords = ['luxury', 'budget', 'cheap', 'expensive', 'affordable', 'best', 'top', 'recommended']
        if any(kw in current_query_lower for kw in modifier_keywords):
            detected_modifier = current_query_lower
        
        # Check if current query mentions a location
        current_query_locations = self._extract_location_from_query(current_query)
        current_has_location = bool(current_query_locations['cities'] or current_query_locations['countries'])
        
        # Build enhanced query based on context
        # Case 1: Clarifying question follow-up (short answer)
        if is_clarifying and is_short_answer:
            parts = []
            
            # Add location if detected
            if detected_location:
                parts.append(detected_location)
            
            # Add topic if detected
            if detected_topic:
                if detected_topic == 'hotel':
                    parts.extend(['hotel', 'accommodation', 'where to stay'])
                elif detected_topic == 'food':
                    parts.extend(['food', 'restaurant', 'dining', 'where to eat'])
                    # Extract food type keywords from current query
                    food_type_keywords = [
                        'fine dining', 'street food', 'sushi', 'ramen', 'local specialties',
                        'casual restaurants', 'budget', 'luxury', 'affordable', 'expensive',
                        'dollar', 'dollars', '$', 'price', 'cost'
                    ]
                    for kw in food_type_keywords:
                        if kw in current_query_lower:
                            parts.append(kw)
                elif detected_topic == 'attraction':
                    parts.extend(['attractions', 'things to do', 'what to see'])
                elif detected_topic == 'transport':
                    parts.extend(['transportation', 'how to get around'])
                elif detected_topic == 'weather':
                    parts.extend(['weather', 'best time to visit'])
                elif detected_topic == 'itinerary':
                    # Keep itinerary context so follow-ups like "budget friendly" still
                    # trigger itinerary handling instead of plain food/attraction logic
                    parts.extend(['itinerary', 'day by day', '1 day plan', 'schedule'])
            
            # Add modifier if present
            if detected_modifier:
                parts.append(detected_modifier)
            
            # If we have context, build enhanced query
            if parts:
                # IMPORTANT: Always prepend original query FIRST to preserve food type keywords like "fine dining"
                # Then add context parts
                enhanced_parts = [current_query] + parts
                enhanced = " ".join(enhanced_parts)
                return enhanced
        
        # Case 2: Current query doesn't mention location but previous messages do
        # This handles cases like "i want to see some attractions" after talking about Tokyo
        if not current_has_location and detected_location:
            # Check if current query is about a topic that would benefit from location context
            current_query_lower_check = current_query.lower()
            topic_indicators = [
                'attraction', 'attractions', 'things to do', 'what to see', 'places to visit',
                'food', 'restaurant', 'eat', 'dining', 'where to eat',
                'hotel', 'accommodation', 'stay', 'where to stay',
                'transport', 'transportation', 'get around',
                'weather', 'best time', 'when to visit'
            ]
            
            if any(indicator in current_query_lower_check for indicator in topic_indicators):
                # Enhance query with location from context
                enhanced = f"{detected_location} {current_query}"
                return enhanced
        
        return current_query
    
    def _matches_location(self, row: Dict, query_locations: Dict[str, List[str]]) -> bool:
        """Check if a row matches the query location."""
        if not query_locations['countries'] and not query_locations['cities']:
            return True  # No location specified, match all
        
        row_country = str(row.get('country', '')).lower()
        row_city = str(row.get('city', '')).lower()
        row_response = str(row.get('response', '')).lower()
        
        # Check country match
        for country in query_locations['countries']:
            if country.lower() in row_country or country.lower() in row_response:
                return True
        
        # Check city match
        for city in query_locations['cities']:
            if city.lower() in row_city or city.lower() in row_response:
                return True
        
        return False
    
    def _detect_query_intent(self, query: str) -> Dict[str, bool]:
        """Detect query intent to improve response selection."""
        query_lower = query.lower()
        
        return {
            'is_recommendation': any(kw in query_lower for kw in [
                'recommend', 'suggest', 'best', 'top', 'options', 'places to visit',
                'what to see', 'what to do', 'attractions', 'activities', 'must see'
            ]),
            'is_itinerary': any(kw in query_lower for kw in [
                'itinerary', 'itineraries', 'day by day', 'schedule', 'plan', 'trip plan', 'daily'
            ]),
            'is_where': any(kw in query_lower for kw in [
                'where', 'location', 'place', 'destination', 'go to'
            ]),
            'is_what': any(kw in query_lower for kw in [
                'what', 'which', 'activities', 'attractions', 'things to do', 'things to see'
            ]),
            'is_when': any(kw in query_lower for kw in [
                'when', 'time', 'season', 'best time', 'weather', 'month'
            ]),
            'is_how': any(kw in query_lower for kw in [
                'how', 'way', 'method', 'get to', 'travel to', 'reach'
            ]),
            'is_cost': any(kw in query_lower for kw in [
                'cost', 'price', 'budget', 'expensive', 'cheap', 'affordable', 'money'
            ]),
            'is_accommodation': any(kw in query_lower for kw in [
                'hotel', 'accommodation', 'stay', 'lodging', 'resort', 'where to stay'
            ]),
            'is_food': any(kw in query_lower for kw in [
                'food', 'restaurant', 'cuisine', 'eat', 'dining', 'local food', 'where to eat'
            ]) and not any(kw in query_lower for kw in [
                'attraction', 'attractions', 'sight', 'sights', 'see', 'visit', 'place to visit', 'things to see'
            ]),
            'is_mountain': any(kw in query_lower for kw in [
                'mountain', 'mount', 'peak', 'summit', 'hiking', 'climb', 'hike'
            ]),
            'is_surfing': any(kw in query_lower for kw in [
                'surf', 'surfing', 'wave', 'waves', 'surfboard'
            ]),
            'is_skiing': any(kw in query_lower for kw in [
                'ski', 'skiing', 'snowboard', 'snowboarding', 'snow', 'winter sport', 'winter sports', 'slope', 'resort'
            ])
        }
    
    def _select_best_response(self, retrieved_rows: List[Dict], user_query: str, original_retrieved_rows: List[Dict] = None, conversation_history: Optional[List[Dict]] = None) -> str:
        """
        Select or combine the best response(s) from retrieved contexts.
        Enhanced with better intent matching, location filtering, and relevance scoring.
        
        Args:
            retrieved_rows: List of retrieved row dictionaries (after location filtering)
            user_query: User's original query
            original_retrieved_rows: Original retrieved rows before location filtering (for fallback)
        
        Returns:
            Combined or selected response string
        """
        # Store original retrieved_rows for fallback checks
        if original_retrieved_rows is None:
            original_retrieved_rows = retrieved_rows.copy() if retrieved_rows else []
        
        if not retrieved_rows:
            return ""
        
        query_lower = user_query.lower()
        intent = self._detect_query_intent(user_query)
        
        # Extract location from query
        query_locations = self._extract_location_from_query(user_query)
        
        # Filter by location FIRST - if location is specified, only use matching responses
        if query_locations['countries'] or query_locations['cities']:
            # Build location keywords for text matching
            location_keywords = []
            for country in query_locations['countries']:
                location_keywords.extend([country.lower(), country.lower().replace(' ', '')])
                # Add variations
                if country.lower() == 'japan':
                    location_keywords.extend(['japanese', 'tokyo', 'kyoto', 'osaka'])
                elif country.lower() == 'usa':
                    location_keywords.extend(['united states', 'america', 'us', 'u.s.'])
                elif country.lower() == 'australia':
                    location_keywords.extend(['australian', 'sydney', 'melbourne'])
                elif country.lower() == 'indonesia':
                    location_keywords.extend(['indonesian', 'bali', 'jakarta'])
                elif country.lower() == 'italy':
                    location_keywords.extend(['italian', 'rome', 'florence', 'venice', 'milan', 'naples'])
                elif country.lower() == 'france':
                    location_keywords.extend(['french', 'paris', 'lyon', 'nice'])
                elif country.lower() == 'spain':
                    location_keywords.extend(['spanish', 'madrid', 'barcelona', 'seville'])
                elif country.lower() == 'thailand':
                    location_keywords.extend(['thai', 'bangkok', 'chiang mai', 'phuket'])
                elif country.lower() == 'india':
                    location_keywords.extend(['indian', 'mumbai', 'delhi', 'bangalore'])
            
            for city in query_locations['cities']:
                location_keywords.extend([city.lower(), city.lower().replace(' ', '')])
                # Add variations for specific cities
                if city.lower() == 'hokkaido':
                    location_keywords.extend(['hokkaido', 'niseko', 'sapporo'])  # Niseko and Sapporo are in Hokkaido
                elif city.lower() == 'tokyo':
                    location_keywords.extend(['tokyo'])
                elif city.lower() == 'kyoto':
                    location_keywords.extend(['kyoto'])
                elif city.lower() == 'osaka':
                    location_keywords.extend(['osaka'])
            
            # Filter: response must mention query location AND not mention other major locations
            other_locations = {
                'japan': ['usa', 'united states', 'america', 'india', 'indian', 'australia', 'australian', 'thailand', 'thai', 'italy', 'italian', 'france', 'french', 'mumbai'],
                'usa': ['japan', 'japanese', 'india', 'indian', 'australia', 'australian', 'italy', 'italian', 'france', 'french', 'mumbai'],
                'india': ['japan', 'japanese', 'usa', 'united states', 'america', 'australia', 'australian', 'italy', 'italian', 'france', 'french'],
                'australia': ['japan', 'japanese', 'usa', 'united states', 'america', 'india', 'indian', 'italy', 'italian', 'france', 'french', 'mumbai'],
                'italy': ['japan', 'japanese', 'usa', 'united states', 'america', 'india', 'indian', 'australia', 'australian', 'thailand', 'thai', 'mumbai', 'china', 'chinese'],
                'france': ['japan', 'japanese', 'usa', 'united states', 'america', 'india', 'indian', 'australia', 'australian', 'thailand', 'thai', 'mumbai', 'china', 'chinese'],
                'spain': ['japan', 'japanese', 'usa', 'united states', 'america', 'india', 'indian', 'australia', 'australian', 'thailand', 'thai', 'mumbai', 'china', 'chinese'],
                'thailand': ['japan', 'japanese', 'usa', 'united states', 'america', 'india', 'indian', 'australia', 'australian', 'italy', 'italian', 'france', 'french', 'mumbai']
            }
            
            # Determine which locations to exclude
            exclude_keywords = []
            for country in query_locations['countries']:
                if country.lower() in other_locations:
                    exclude_keywords.extend(other_locations[country.lower()])
            
            location_filtered = []
            for row in retrieved_rows:
                response_text = str(row.get('response', '')).lower()
                row_country = str(row.get('country', '')).lower()
                row_city = str(row.get('city', '')).lower()
                
                # STRICT: Check if row's metadata matches query location
                # First check metadata (most reliable)
                metadata_matches = (
                    any(kw in row_country for kw in location_keywords) or
                    any(kw in row_city for kw in location_keywords)
                )
                
                # Also check if response text mentions query location
                text_matches = any(kw in response_text for kw in location_keywords)
                
                # Check if response mentions excluded locations (other countries)
                mentions_excluded = False
                if exclude_keywords:
                    mentions_excluded = any(
                        ex_kw in response_text or ex_kw in row_country
                        for ex_kw in exclude_keywords
                    )
                
                # STRICT: Only include if metadata matches OR (text matches AND doesn't mention excluded)
                # But if metadata doesn't match and we have country query, be very strict
                if query_locations['countries'] and not query_locations['cities']:
                    # Country-only query: MUST match country in metadata OR explicitly in text
                    # AND must not mention excluded countries
                    if (metadata_matches or text_matches) and not mentions_excluded:
                        # Additional check: if text matches but metadata doesn't, verify it's really about the country
                        if not metadata_matches and text_matches:
                            # Make sure it's not about another country
                            # Check if response mentions other major countries
                            other_countries = ['mumbai', 'india', 'indian', 'tokyo', 'japan', 'japanese', 'paris', 'france', 'french', 'london', 'uk', 'britain', 'bangkok', 'thailand', 'thai']
                            query_country_lower = query_locations['countries'][0].lower()
                            # Remove query country from other countries check
                            other_countries_filtered = [c for c in other_countries if query_country_lower not in c and c not in location_keywords]
                            
                            # If response mentions other countries prominently, exclude it
                            mentions_other_country = any(country in response_text for country in other_countries_filtered)
                            if mentions_other_country:
                                continue  # Skip this response - it's about another country
                        
                        location_filtered.append(row)
                else:
                    # City query: STRICT filtering
                    if (metadata_matches or text_matches) and not mentions_excluded:
                        # Additional check for city queries: ensure response is about the city, not another location
                        if query_locations['cities']:
                            query_city_lower = query_locations['cities'][0].lower()
                            
                            # STRICT: For city queries, response MUST mention the city
                            if query_city_lower == 'hokkaido':
                                # Must mention Hokkaido, Niseko, or Sapporo
                                mentions_hokkaido = any(loc in response_text for loc in ['hokkaido', 'niseko', 'sapporo'])
                                if not mentions_hokkaido:
                                    continue  # Skip if doesn't mention Hokkaido
                                
                                # STRICT: Exclude if it mentions other cities/countries prominently (especially at start)
                                response_start = response_text[:150].lower()
                                excluded_locations = ['stockholm', 'sweden', 'swedish', 'mumbai', 'india', 'indian', 'rajasthan', 'kerala']
                                # If response STARTS with excluded location, definitely skip
                                if any(loc in response_start[:80] for loc in excluded_locations):
                                    continue  # Skip if starts with wrong location
                                # Also check if excluded location appears multiple times (likely about that location)
                                excluded_count = sum(1 for loc in excluded_locations if loc in response_text)
                                if excluded_count >= 2:  # Multiple mentions = likely about that location
                                    continue
                            else:
                                # For other cities, must mention the city
                                if query_city_lower not in response_text:
                                    # Check if city is in metadata
                                    if query_city_lower not in row_city:
                                        continue  # Skip if city not mentioned
                                
                                # Exclude if starts with another location
                                response_start = response_text[:150].lower()
                                other_locations_check = ['mumbai', 'india', 'indian', 'rajasthan', 'kerala', 'stockholm', 'sweden', 'swedish']
                                other_locations_check = [loc for loc in other_locations_check if loc not in location_keywords]
                                if any(loc in response_start for loc in other_locations_check):
                                    continue
                        
                        location_filtered.append(row)
            
            if location_filtered:
                retrieved_rows = location_filtered
            # Note: If no location-filtered results, we still use original retrieved_rows
            # The food intent section will do additional city filtering
            # REMOVED: Don't fall back to less strict filtering - if no matches, return empty
            # This ensures we don't return irrelevant responses
        
        # If no rows left after filtering, check if we had original rows
        # For city queries, if location filtering removed everything, check original rows for city matches
        if not retrieved_rows:
            # Check if this is a city query that might have been over-filtered
            query_locations_check = self._extract_location_from_query(user_query)
            if query_locations_check['cities']:
                query_city_check = query_locations_check['cities'][0].lower()
                # Try to find entries that mention the city in the original retrieved_rows
                # (Note: we need access to original rows - this will be handled by checking before filtering)
                # For now, return empty and let the food intent section handle it
                pass
            return ""
        
        # If only one highly relevant result, use it directly
        if len(retrieved_rows) == 1 and retrieved_rows[0]['similarity_score'] > 0.3:
            return retrieved_rows[0]['response']
        
        # Score responses based on relevance to query intent
        scored_responses = []
        for row in retrieved_rows:
            score = row['similarity_score']
            response_lower = str(row.get('response', '')).lower()
            
            # Boost score if response matches query intent
            if intent['is_recommendation'] and any(kw in response_lower for kw in ['recommend', 'suggest', 'best', 'top']):
                score += 0.1
            if intent['is_when'] and any(kw in response_lower for kw in ['time', 'season', 'month', 'weather']):
                score += 0.1
            if intent['is_where'] and any(kw in response_lower for kw in ['location', 'place', 'destination']):
                score += 0.1
            if intent['is_what'] and any(kw in response_lower for kw in ['activities', 'attractions', 'things']):
                score += 0.1
            
            # For specific query types, strongly prioritize matching responses
            # If query asks about attractions, prioritize attraction responses
            query_lower = user_query.lower()
            question_lower = str(row.get('question', '')).lower()
            if 'attraction' in query_lower or 'attractions' in query_lower or 'see' in query_lower or 'things to do' in query_lower:
                if 'attraction' in response_lower or 'attractions' in response_lower:
                    score += 0.3  # Strong boost for attraction queries
                # Penalize non-attraction content
                if any(kw in response_lower for kw in ['transportation', 'transport', 'budget', 'cost', 'safe', 'safety', 'currency', 'wifi', 'airport']):
                    score -= 0.2  # Penalize off-topic content
                
                # STRICT: If location is specified, require location match for attraction queries
                query_locations_attr = self._extract_location_from_query(user_query)
                if query_locations_attr['cities'] or query_locations_attr['countries']:
                    response_lower_attr = response_lower
                    question_lower_attr = question_lower
                    row_city_attr = str(row.get('city', '')).lower()
                    row_country_attr = str(row.get('country', '')).lower()
                    
                    # Build target locations
                    target_locations_attr = []
                    if query_locations_attr['cities']:
                        target_locations_attr.extend([c.lower() for c in query_locations_attr['cities']])
                    if query_locations_attr['countries']:
                        target_locations_attr.extend([c.lower() for c in query_locations_attr['countries']])
                    
                    # Check if response mentions target location
                    location_match_attr = (
                        any(loc in response_lower_attr for loc in target_locations_attr) or
                        any(loc in question_lower_attr for loc in target_locations_attr) or
                        any(loc in row_city_attr for loc in target_locations_attr) or
                        any(loc in row_country_attr for loc in target_locations_attr)
                    )
                    
                    if not location_match_attr:
                        score -= 50  # Heavy penalty for wrong location
                    else:
                        score += 5  # Boost for correct location
            if intent['is_cost'] and any(kw in response_lower for kw in ['cost', 'price', 'budget', 'affordable']):
                score += 0.1
            if intent['is_accommodation'] and any(kw in response_lower for kw in ['hotel', 'resort', 'stay', 'accommodation']):
                score += 0.1
            if intent['is_food'] and any(kw in response_lower for kw in ['food', 'restaurant', 'cuisine', 'dining']):
                score += 0.1
            if intent.get('is_mountain') and any(kw in response_lower for kw in ['mountain', 'mount', 'peak', 'summit', 'hiking', 'climb', 'hike', 'fuji', 'takao', 'hakone']):
                score += 0.3  # Strong boost for mountain queries
            if intent.get('is_surfing') and any(kw in response_lower for kw in ['surf', 'surfing', 'wave', 'waves', 'surfboard', 'beach']):
                score += 0.3  # Strong boost for surfing queries
            if intent.get('is_skiing') and any(kw in response_lower for kw in ['ski', 'skiing', 'snowboard', 'snowboarding', 'snow', 'winter sport', 'slope', 'resort', 'niseko', 'hokkaido']):
                score += 0.3  # Strong boost for skiing queries
            
            scored_responses.append((score, row))
        
        # Sort by enhanced score
        scored_responses.sort(key=lambda x: x[0], reverse=True)
        sorted_rows = [row for _, row in scored_responses]
        
        # For surfing queries, prioritize surfing-specific responses FIRST (before any other logic)
        if intent.get('is_surfing'):
            surfing_responses = []
            for row in sorted_rows[:30]:
                response_lower = str(row['response']).lower()
                question_lower = str(row.get('question', '')).lower()
                surfing_keywords = ['surf', 'surfing', 'wave', 'waves', 'surfboard', 'beach']
                surfing_count = sum(1 for kw in surfing_keywords if kw in response_lower or kw in question_lower)
                if surfing_count >= 1:
                    # Prefer entries where question mentions surfing
                    if 'surf' in question_lower:
                        surfing_responses.append((surfing_count + 10, row))  # Extra boost
                    else:
                        surfing_responses.append((surfing_count, row))
            
            if not surfing_responses and original_retrieved_rows:
                for row in original_retrieved_rows[:20]:
                    response_lower = str(row['response']).lower()
                    question_lower = str(row.get('question', '')).lower()
                    surfing_keywords = ['surf', 'surfing', 'wave', 'waves', 'surfboard', 'beach']
                    surfing_count = sum(1 for kw in surfing_keywords if kw in response_lower or kw in question_lower)
                    if surfing_count >= 1:
                        if 'surf' in question_lower:
                            surfing_responses.append((surfing_count + 10, row))
                        else:
                            surfing_responses.append((surfing_count, row))
            
            if surfing_responses:
                surfing_responses.sort(key=lambda x: x[0], reverse=True)
                return surfing_responses[0][1]['response']
            
            # Fallback: check retrieved_rows directly
            for row in retrieved_rows[:30]:
                question_lower = str(row.get('question', '')).lower()
                if 'surf' in question_lower:
                    return row['response']
        
        # For skiing queries, prioritize skiing-specific responses FIRST (before any other logic)
        if intent.get('is_skiing'):
            skiing_responses = []
            skiing_keywords = ['ski', 'skiing', 'snowboard', 'snowboarding', 'snow', 'winter sport', 'winter sports', 'slope', 'resort', 'niseko', 'hokkaido', 'hakuba', 'nozawa']
            question_lower = user_query.lower()
            
            for row in sorted_rows[:30]:
                response_lower = str(row['response']).lower()
                question_lower_row = str(row.get('question', '')).lower()
                
                # Count skiing keywords in response
                skiing_count = sum(1 for kw in skiing_keywords if kw in response_lower or kw in question_lower_row)
                
                if skiing_count > 0:
                    # Check location match if location is specified
                    location_match = True
                    if query_locations['countries'] or query_locations['cities']:
                        location_keywords = []
                        for country in query_locations['countries']:
                            location_keywords.append(country.lower())
                        for city in query_locations['cities']:
                            location_keywords.append(city.lower())
                            # Add Japan-specific skiing locations
                            if 'japan' in location_keywords or any(city in ['japan', 'hokkaido', 'niseko'] for city in location_keywords):
                                location_keywords.extend(['hokkaido', 'niseko', 'hakuba', 'nozawa', 'japan'])
                        
                        location_match = any(loc in response_lower or loc in question_lower_row for loc in location_keywords)
                    
                    if location_match:
                        skiing_responses.append((skiing_count + 10, row))  # Extra boost
                    else:
                        skiing_responses.append((skiing_count, row))
            
            if not skiing_responses and original_retrieved_rows:
                for row in original_retrieved_rows[:20]:
                    response_lower = str(row['response']).lower()
                    question_lower_row = str(row.get('question', '')).lower()
                    
                    skiing_count = sum(1 for kw in skiing_keywords if kw in response_lower or kw in question_lower_row)
                    
                    if skiing_count > 0:
                        location_match = True
                        if query_locations['countries'] or query_locations['cities']:
                            location_keywords = []
                            for country in query_locations['countries']:
                                location_keywords.append(country.lower())
                            for city in query_locations['cities']:
                                location_keywords.append(city.lower())
                                if 'japan' in location_keywords or any(city in ['japan', 'hokkaido', 'niseko'] for city in location_keywords):
                                    location_keywords.extend(['hokkaido', 'niseko', 'hakuba', 'nozawa', 'japan'])
                            
                            location_match = any(loc in response_lower or loc in question_lower_row for loc in location_keywords)
                        
                        if location_match:
                            skiing_responses.append((skiing_count + 10, row))
                        else:
                            skiing_responses.append((skiing_count, row))
            
            if skiing_responses:
                skiing_responses.sort(key=lambda x: x[0], reverse=True)
                return self._format_response(skiing_responses[0][1]['response'])
        
        # For mountain queries, prioritize mountain-specific responses FIRST (before any other logic)
        if intent.get('is_mountain'):
            mountain_responses = []
            # Check if location is specified
            has_location = bool(query_locations['countries'] or query_locations['cities'])
            location_keywords = []
            if query_locations['countries']:
                location_keywords.extend([c.lower() for c in query_locations['countries']])
            if query_locations['cities']:
                location_keywords.extend([c.lower() for c in query_locations['cities']])
            
            # Check sorted_rows first (after scoring)
            for row in sorted_rows[:30]:  # Check top 30
                response_lower = str(row['response']).lower()
                question_lower = str(row.get('question', '')).lower()
                mountain_keywords = ['mountain', 'mount', 'peak', 'summit', 'hiking', 'climb', 'hike', 'fuji', 'takao', 'hakone', 'tateyama', 'rokko', 'koya', 'daisen', 'aso']
                mountain_count = sum(1 for kw in mountain_keywords if kw in response_lower or kw in question_lower)
                
                if mountain_count >= 1:
                    score = mountain_count
                    # STRONG boost if location matches
                    if has_location:
                        location_match = any(loc in response_lower or loc in question_lower for loc in location_keywords)
                        if location_match:
                            score += 20  # Very strong boost for location + mountain match
                    mountain_responses.append((score, row))
            
            # Also check original_retrieved_rows if no matches found
            if not mountain_responses and original_retrieved_rows:
                for row in original_retrieved_rows[:20]:
                    response_lower = str(row['response']).lower()
                    question_lower = str(row.get('question', '')).lower()
                    mountain_keywords = ['mountain', 'mount', 'peak', 'summit', 'hiking', 'climb', 'hike', 'fuji', 'takao', 'hakone', 'tateyama', 'rokko', 'koya', 'daisen', 'aso']
                    mountain_count = sum(1 for kw in mountain_keywords if kw in response_lower or kw in question_lower)
                    
                    if mountain_count >= 1:
                        score = mountain_count
                        # STRONG boost if location matches
                        if has_location:
                            location_match = any(loc in response_lower or loc in question_lower for loc in location_keywords)
                            if location_match:
                                score += 20  # Very strong boost for location + mountain match
                        mountain_responses.append((score, row))
            
            if mountain_responses:
                # Sort by score (most relevant first)
                mountain_responses.sort(key=lambda x: x[0], reverse=True)
                # Return the most mountain-focused response (with location match if available)
                return mountain_responses[0][1]['response']
            
            # Fallback: If no mountain responses found, check retrieved_rows directly
            # STRICT: For location-specific mountain queries, ONLY return entries that mention the location
            if has_location:
                # First, try to find entries where question mentions both location AND mountain (exact match)
                for row in retrieved_rows[:50]:  # Check more rows
                    question_lower = str(row.get('question', '')).lower()
                    response_lower = str(row['response']).lower()
                    # Check if question mentions location
                    location_in_q = any(loc in question_lower for loc in location_keywords)
                    # Check if question mentions mountain
                    mountain_in_q = 'mountain' in question_lower or 'mount' in question_lower
                    if location_in_q and mountain_in_q:
                        return row['response']
                # If not found, check if response mentions both location AND mountain
                for row in retrieved_rows[:50]:
                    response_lower = str(row['response']).lower()
                    location_in_r = any(loc in response_lower for loc in location_keywords)
                    mountain_in_r = 'mountain' in response_lower or 'mount' in response_lower or 'fuji' in response_lower or 'takao' in response_lower or 'hakone' in response_lower
                    if location_in_r and mountain_in_r:
                        return row['response']
                # Last resort: check original_retrieved_rows
                if original_retrieved_rows:
                    for row in original_retrieved_rows[:50]:
                        question_lower = str(row.get('question', '')).lower()
                        response_lower = str(row['response']).lower()
                        location_match = any(loc in question_lower or loc in response_lower for loc in location_keywords)
                        mountain_match = 'mountain' in question_lower or 'mount' in question_lower or 'mountain' in response_lower or 'fuji' in response_lower
                        if location_match and mountain_match:
                            return row['response']
            else:
                # No location specified, return any mountain entry
                for row in retrieved_rows[:20]:
                    question_lower = str(row.get('question', '')).lower()
                    if 'mountain' in question_lower:
                        return row['response']
        
        # Check if query asks for recommendations (multiple options)
        is_recommendation = intent['is_recommendation']
        
        # IMPORTANT: If a specific location is mentioned OR it's a mountain query, don't treat as recommendation
        # "attractions in singapore" should return ONE response, not combine multiple
        # Mountain queries should also return ONE focused response, not combine multiple
        has_specific_location = bool(query_locations['countries'] or query_locations['cities'])
        if has_specific_location or intent.get('is_mountain'):
            is_recommendation = False  # Specific location or mountain queries get single best response
        
        # Check if query asks for itinerary (day-by-day)
        is_itinerary = intent['is_itinerary']
        
        # For itinerary queries, check for budget and requirements
        if is_itinerary:
            query_lower_itinerary = user_query.lower()
            
            # Check if budget is mentioned in current query OR conversation history
            budget_keywords = ['budget', 'dollar', 'dollars', '$', 'price', 'cost', 'affordable', 'expensive', 'luxury', 'cheap', 'mid-range']
            has_budget = any(kw in query_lower_itinerary for kw in budget_keywords)
            
            # Also check conversation history for budget if this is a follow-up
            if not has_budget and conversation_history:
                for msg in conversation_history[-4:]:
                    msg_content = str(msg.get('content', '')).lower()
                    if any(kw in msg_content for kw in budget_keywords):
                        has_budget = True
                        break
            
            # Extract location from query
            itinerary_location = None
            if query_locations['cities']:
                itinerary_location = query_locations['cities'][0]
            elif query_locations['countries']:
                itinerary_location = query_locations['countries'][0]
            
            # If no budget mentioned, ask for it
            if not has_budget:
                location_text = f" in {itinerary_location.title()}" if itinerary_location else ""
                return (
                    f"I'd be happy to help you create a 1-day itinerary{location_text}! To give you the best recommendations, could you tell me:\n\n"
                    "- What's your budget range? (e.g., budget-friendly, mid-range, luxury, or a specific amount)\n"
                    "- Any specific preferences? (e.g., types of cuisine, types of attractions)"
                )
            
            # Parse itinerary requirements from query
            # Look for meal/attraction counts
            meal_count = 0
            attraction_count = 0
            
            # Check for explicit counts
            import re
            meal_matches = re.findall(r'(\d+)\s*(?:time|times|meal|meals|eat|eating)', query_lower_itinerary)
            if meal_matches:
                meal_count = int(meal_matches[0])
            
            attraction_matches = re.findall(r'(\d+)\s*(?:attraction|attractions|place|places|see|visit)', query_lower_itinerary)
            if attraction_matches:
                attraction_count = int(attraction_matches[0])
            
            # If no explicit counts, try to infer from query
            if meal_count == 0:
                if 'eat' in query_lower_itinerary or 'meal' in query_lower_itinerary or 'dining' in query_lower_itinerary:
                    meal_count = 3  # Default to 3 meals if mentioned but no count
            if attraction_count == 0:
                if 'attraction' in query_lower_itinerary or 'see' in query_lower_itinerary or 'visit' in query_lower_itinerary:
                    attraction_count = 1  # Default to 1 if mentioned but no count
            
            # Look for itinerary content in responses
            itinerary_responses = []
            food_responses = []
            attraction_responses = []
            
            for row in sorted_rows:
                response_lower = str(row['response']).lower()
                question_lower = str(row.get('question', '')).lower()
                
                # Check if response matches location
                location_match = True
                if itinerary_location:
                    location_lower = itinerary_location.lower()
                    location_match = (
                        location_lower in response_lower or 
                        location_lower in question_lower or
                        location_lower in str(row.get('city', '')).lower() or
                        location_lower in str(row.get('country', '')).lower()
                    )
                
                if not location_match:
                    continue
                
                # Check for itinerary structure
                if any(kw in response_lower for kw in ['day 1', 'day 2', 'first day', 'second day', 'itinerary', 'schedule', 'morning', 'afternoon', 'evening', 'breakfast', 'lunch', 'dinner']):
                    itinerary_responses.append(row)
                
                # Check for food content
                if any(kw in response_lower for kw in ['restaurant', 'cuisine', 'dining', 'food', 'eat', 'meal', 'breakfast', 'lunch', 'dinner', 'steak', 'empanada', 'asado']):
                    food_responses.append(row)
                
                # Check for attraction content
                if any(kw in response_lower for kw in ['attraction', 'attractions', 'visit', 'see', 'sight', 'landmark', 'monument', 'museum', 'plaza', 'park']):
                    attraction_responses.append(row)
            
            # Build formatted itinerary
            if food_responses or attraction_responses:
                itinerary_parts = []
                
                # Add header
                location_header = itinerary_location.title() if itinerary_location else "Your Destination"
                itinerary_parts.append(f"**1-Day Itinerary for {location_header}**\n")
                
                # Add meals section
                if meal_count > 0:
                    itinerary_parts.append(f"**Meals ({meal_count}):**")
                    meal_types = ["Breakfast", "Lunch", "Dinner"]
                    
                    # Get unique food responses (avoid duplicates)
                    seen_food = set()
                    unique_food_responses = []
                    for row in food_responses:
                        response_sig = str(row['response'])[:100].lower()
                        if response_sig not in seen_food:
                            seen_food.add(response_sig)
                            unique_food_responses.append(row)
                            if len(unique_food_responses) >= meal_count:
                                break
                    
                    for i, row in enumerate(unique_food_responses[:meal_count], 1):
                        meal_type = meal_types[i-1] if i <= 3 else f"Meal {i}"
                        response_text = str(row['response']).strip()
                        
                        # Clean up response - remove generic intros
                        if response_text.lower().startswith(('buenos aires', 'argentina', location_header.lower())):
                            # Extract the actual recommendation part
                            lines = response_text.split('.')
                            food_lines = []
                            for line in lines:
                                line = line.strip()
                                if line and any(kw in line.lower() for kw in ['restaurant', 'steak', 'empanada', 'asado', 'dining', 'cuisine', 'try', 'visit', 'parrilla']):
                                    food_lines.append(line)
                                    if len(food_lines) >= 2:  # Get 2 good lines
                                        break
                            
                            if food_lines:
                                food_text = '. '.join(food_lines)
                                if not food_text.endswith('.'):
                                    food_text += '.'
                                itinerary_parts.append(f"  • {meal_type}: {food_text}")
                            else:
                                # Fallback: use first meaningful sentence
                                clean_text = response_text.split('.')[0] if '.' in response_text else response_text[:120]
                                itinerary_parts.append(f"  • {meal_type}: {clean_text}")
                        else:
                            # Use first sentence or first 120 chars
                            clean_text = response_text.split('.')[0] if '.' in response_text else response_text[:120]
                            itinerary_parts.append(f"  • {meal_type}: {clean_text}")
                    itinerary_parts.append("")
                
                # Add attractions section
                if attraction_count > 0:
                    itinerary_parts.append(f"**Attractions ({attraction_count}):**")
                    
                    # Get unique attraction responses
                    seen_attr = set()
                    unique_attr_responses = []
                    for row in attraction_responses:
                        response_sig = str(row['response'])[:100].lower()
                        if response_sig not in seen_attr:
                            seen_attr.add(response_sig)
                            unique_attr_responses.append(row)
                            if len(unique_attr_responses) >= attraction_count:
                                break
                    
                    for i, row in enumerate(unique_attr_responses[:attraction_count], 1):
                        response_text = str(row['response']).strip()
                        
                        # Clean up response - extract attraction info
                        if response_text.lower().startswith(('buenos aires', 'argentina', location_header.lower())):
                            lines = response_text.split('.')
                            attr_lines = []
                            for line in lines:
                                line = line.strip()
                                if line and any(kw in line.lower() for kw in ['attraction', 'visit', 'see', 'plaza', 'museum', 'monument', 'landmark', 'palace', 'theater', 'cathedral', 'recoleta']):
                                    attr_lines.append(line)
                                    if len(attr_lines) >= 2:
                                        break
                            
                            if attr_lines:
                                attr_text = '. '.join(attr_lines)
                                if not attr_text.endswith('.'):
                                    attr_text += '.'
                                itinerary_parts.append(f"  {i}. {attr_text}")
                            else:
                                clean_text = response_text.split('.')[0] if '.' in response_text else response_text[:120]
                                itinerary_parts.append(f"  {i}. {clean_text}")
                        else:
                            clean_text = response_text.split('.')[0] if '.' in response_text else response_text[:120]
                            itinerary_parts.append(f"  {i}. {clean_text}")
                
                if len(itinerary_parts) > 1:  # More than just header
                    return "\n".join(itinerary_parts)
            
            # Fallback: return first itinerary-like response
            for row in sorted_rows:
                response_lower = str(row['response']).lower()
                if any(keyword in response_lower for keyword in ['day 1', 'day 2', 'first day', 'second day', 'itinerary', 'schedule']):
                    return row['response']
        
        # For recommendations (without specific location), combine multiple relevant responses
        if is_recommendation:
            responses = []
            seen_locations = set()
            seen_content = set()  # Track content to prevent duplicates
            
            for row in sorted_rows:
                # Skip if similarity is too low
                if row['similarity_score'] < 0.1:
                    continue
                
                # If location is specified, ensure this row matches
                if query_locations['countries'] or query_locations['cities']:
                    if not self._matches_location(row, query_locations):
                        # Check if location is mentioned in response text
                        response_text = str(row.get('response', '')).lower()
                        location_keywords = []
                        for country in query_locations['countries']:
                            location_keywords.extend([country, country.replace(' ', '')])
                        for city in query_locations['cities']:
                            location_keywords.extend([city, city.replace(' ', '')])
                        
                        if not any(kw.lower() in response_text for kw in location_keywords):
                            continue  # Skip this response
                
                response = row['response'].strip()
                
                # Check for duplicate content (similar responses)
                # Create a signature from first 100 chars to detect duplicates
                response_signature = response[:100].lower().strip()
                if response_signature in seen_content:
                    continue  # Skip duplicate content
                
                # Check if response is very similar to already added responses
                is_duplicate = False
                for seen_resp in seen_content:
                    # If first 50 chars match, likely duplicate
                    if response_signature[:50] == seen_resp[:50]:
                        is_duplicate = True
                        break
                
                if is_duplicate:
                    continue
                
                # Extract location from metadata to avoid duplicates
                location_key = f"{row.get('city', '')}_{row.get('country', '')}"
                
                # If we've seen this location before, skip unless it's highly relevant
                if location_key in seen_locations and row['similarity_score'] < 0.25:
                    continue
                
                seen_locations.add(location_key)
                seen_content.add(response_signature)
                responses.append(response)
                
                # Limit to 3-6 recommendations as per system prompt
                if len(responses) >= 6:
                    break
            
            if responses:
                # Combine responses with clear separation
                combined = "\n\n".join(responses)
                return combined
        
        # For itineraries, look for day-by-day content
        if is_itinerary:
            for row in sorted_rows:
                response_lower = str(row['response']).lower()
                if any(keyword in response_lower for keyword in ['day 1', 'day 2', 'first day', 'second day', 'itinerary', 'schedule']):
                    return row['response']
        
        # For attraction queries, prioritize attraction-specific responses BEFORE food queries
        query_lower_attr_check = user_query.lower()
        is_attraction_query = any(kw in query_lower_attr_check for kw in ['attraction', 'attractions', 'sight', 'sights', 'see', 'visit', 'place to visit', 'things to see', 'what to see', 'what to visit', 'looking for attractions'])
        
        if is_attraction_query:
            # Prioritize responses about attractions, sights, places to visit
            attraction_responses = []
            for row in sorted_rows:
                response_lower = str(row['response']).lower()
                attraction_keywords = ['attraction', 'attractions', 'sight', 'sights', 'temple', 'shrine', 'museum', 'park', 'garden', 'palace', 'castle', 'tower', 'landmark', 'monument', 'visit', 'see', 'explore', 'tourist', 'must see']
                attraction_count = sum(1 for kw in attraction_keywords if kw in response_lower)
                
                # Penalize food-focused responses
                food_keywords = ['restaurant', 'cuisine', 'dining', 'food', 'eat', 'meal', 'dish']
                food_count = sum(1 for kw in food_keywords if kw in response_lower[:200])  # Check first 200 chars
                
                if attraction_count > 0 and food_count < 3:  # More attractions than food
                    attraction_responses.append((attraction_count - food_count, row))
            
            if attraction_responses:
                attraction_responses.sort(key=lambda x: x[0], reverse=True)
                return self._format_response(attraction_responses[0][1]['response'])
        
        # For mountain queries, prioritize mountain-specific responses BEFORE general recommendations
        if intent.get('is_mountain'):
            mountain_responses = []
            for row in sorted_rows:
                response_lower = str(row['response']).lower()
                mountain_keywords = ['mountain', 'mount', 'peak', 'summit', 'hiking', 'climb', 'hike', 'fuji', 'takao', 'hakone', 'tateyama', 'rokko', 'koya']
                mountain_count = sum(1 for kw in mountain_keywords if kw in response_lower)
                if mountain_count >= 1:
                    mountain_responses.append((mountain_count, row))
            
            if mountain_responses:
                # Sort by mountain keyword count (most relevant first)
                mountain_responses.sort(key=lambda x: x[0], reverse=True)
                # Return the most mountain-focused response
                return mountain_responses[0][1]['response']
        
        # For specific question types, prioritize matching responses
        if intent['is_when']:
            # Look for responses that mention time/season
            for row in sorted_rows:
                response_lower = str(row['response']).lower()
                if any(kw in response_lower for kw in ['time', 'season', 'month', 'weather', 'best time']):
                    return row['response']
        
        if intent['is_how']:
            # Look for responses that mention methods/ways
            for row in sorted_rows:
                response_lower = str(row['response']).lower()
                if any(kw in response_lower for kw in ['way', 'method', 'get', 'travel', 'reach', 'arrive']):
                    return row['response']
        
        if intent['is_cost']:
            # Look for responses that mention cost/price
            for row in sorted_rows:
                response_lower = str(row['response']).lower()
                if any(kw in response_lower for kw in ['cost', 'price', 'budget', 'affordable', 'expensive']):
                    return row['response']
        
        if intent['is_food']:
            # Check if query is too broad (country-level without specific city/region)
            query_locations = self._extract_location_from_query(user_query)
            # Hokkaido is a region, so if it's mentioned, it's not country-only
            is_country_only = bool(query_locations['countries'] and not query_locations['cities'] and 'hokkaido' not in user_query.lower())
            
            # Check if query specifies food type/dish (expanded list)
            query_lower_food_check = user_query.lower()
            food_type_keywords = [
                'ramen', 'sushi', 'pizza', 'burger', 'steak', 'pasta', 'seafood', 'vegan', 'vegetarian',
                'dessert', 'bbq', 'barbecue', 'noodles', 'dimsum', 'dim sum', 'tapas', 'kebabs', 'kebab',
                'coffee', 'brunch', 'breakfast', 'lunch', 'dinner', 'fine dining', 'street food', 'market',
                'izakaya', 'kaiseki', 'yakitori', 'takoyaki', 'curry', 'tempura', 'udon', 'soba',
                'local specialties', 'casual restaurants', 'restaurant', 'restaurants', 'cuisine',
                'budget', 'luxury', 'affordable', 'expensive', 'cheap', 'mid-range'
            ]
            has_food_type = any(kw in query_lower_food_check for kw in food_type_keywords)
            
            # Also check if query mentions budget/price (indicates user is answering)
            has_budget_info = any(kw in query_lower_food_check for kw in ['budget', 'dollar', 'dollars', '$', 'price', 'cost', 'affordable', 'expensive', 'cheap', 'luxury', 'mid-range'])
            
            # IMPORTANT: If user_query was enhanced with context, it may contain location + food type
            # Check if location appears in query (either from original or from context enhancement)
            # If location is present AND food type is present, don't ask for clarification
            location_in_query = bool(query_locations['cities'] or query_locations['countries'])
            
            # CRITICAL FIX: Check if query contains food-related words that indicate user is answering
            # Even if not in food_type_keywords list, check for common food-related terms
            food_indicators = ['fine', 'dining', 'restaurant', 'eat', 'food', 'cuisine', 'meal']
            has_food_indicators = any(indicator in query_lower_food_check for indicator in food_indicators)
            
            # REMOVED: No longer ask for clarification when city is specified
            # When city is specified, return all food data directly
            # Only ask for clarification for country-level queries (handled below)
            
            # EARLY CHECK: For Hokkaido food queries, check if we have Hokkaido entries directly
            # Check both sorted_rows (after location filtering) and retrieved_rows (before filtering)
            if query_locations['cities'] and query_locations['cities'][0].lower() == 'hokkaido':
                # Check sorted_rows first
                for row in sorted_rows[:15]:
                    response_text_early = str(row.get('response', '')).lower()
                    question_text_early = str(row.get('question', '')).lower()
                    
                    # Check if this is a Hokkaido food entry
                    if ('hokkaido' in response_text_early or 'hokkaido' in question_text_early) and \
                       any(kw in response_text_early for kw in ['dining', 'food', 'eat', 'restaurant', 'cuisine', 'seafood', 'genghis', 'soup curry', 'ramen']):
                        # Check it's not about other locations
                        if not any(loc in response_text_early[:150] for loc in ['stockholm', 'sweden', 'swedish', 'mumbai', 'india']):
                            return row['response']
                
                # If not found in sorted_rows, check retrieved_rows (before location filtering)
                # These might have been filtered out but could still be relevant
                for row in retrieved_rows[:20]:
                    response_text_early = str(row.get('response', '')).lower()
                    question_text_early = str(row.get('question', '')).lower()
                    
                    # Check if this is a Hokkaido food entry
                    if ('hokkaido' in response_text_early or 'hokkaido' in question_text_early) and \
                       any(kw in response_text_early for kw in ['dining', 'food', 'eat', 'restaurant', 'cuisine', 'seafood', 'genghis', 'soup curry', 'ramen']):
                        # Check it's not about other locations
                        if not any(loc in response_text_early[:150] for loc in ['stockholm', 'sweden', 'swedish', 'mumbai', 'india']):
                            return row['response']
            
            # For food questions, STRICTLY prioritize responses that focus on food
            # Filter out responses with too much generic travel content
            # BUT: For city queries, be more lenient - don't filter out entries that mention the city
            query_locations_food = self._extract_location_from_query(user_query)
            is_city_query_food = bool(query_locations_food['cities'])
            
            food_scored = []
            for row in sorted_rows:
                response_lower = str(row['response']).lower()
                food_score = 0
                
                # Strong food indicators
                strong_food_keywords = ['restaurant', 'cuisine', 'dining', 'food', 'eat', 'dish', 'meal', 'culinary', 'gastronomy', 'local food', 'street food', 'sushi', 'ramen', 'izakaya', 'where to eat', 'food scene', 'restaurants', 'foodie']
                food_count = sum(1 for kw in strong_food_keywords if kw in response_lower)
                food_score = food_count * 3  # Strong weight for food keywords
                
                # Weak food indicators
                weak_food_keywords = ['taste', 'try', 'cuisine']
                weak_food_count = sum(1 for kw in weak_food_keywords if kw in response_lower)
                food_score += weak_food_count * 0.5
                
                # STRONG penalty for generic travel content
                generic_keywords = ['temples', 'mountains', 'hiking', 'volcanoes', 'adventure', 'sightseeing', 'attractions', 'activities', 'tourist', 'visit', 'explore', 'journey', 'trip', 'itinerary']
                generic_count = sum(1 for kw in generic_keywords if kw in response_lower)
                
                # Calculate ratio: food keywords vs generic keywords
                total_keywords = food_count + generic_count
                if total_keywords > 0:
                    food_ratio = food_count / total_keywords
                else:
                    food_ratio = 0
                
                # STRICT filtering: if generic content > food content, heavily penalize
                if generic_count > food_count:
                    food_score -= 5  # Heavy penalty
                elif generic_count > 0 and food_ratio < 0.4:  # Less than 40% food content
                    food_score -= 3  # Moderate penalty
                
                # Additional penalty for too many generic keywords
                if generic_count > 3:
                    food_score -= 2
                
                # Check if food keywords appear early (indicates food focus)
                words = response_lower.split()[:50]  # Check first 50 words
                early_food_count = sum(1 for word in words if any(kw in word for kw in strong_food_keywords))
                if early_food_count > 0:
                    food_score += 2  # Boost for early food mention
                
                # Check if response starts with food-related content
                first_50_chars = response_lower[:50]
                if any(kw in first_50_chars for kw in ['restaurant', 'cuisine', 'dining', 'food', 'eat']):
                    food_score += 3  # Strong boost for food-focused opening
                
                # Check if response covers multiple cities (too comprehensive for country-level query)
                # Common city names in responses indicate comprehensive guide
                multiple_cities_indicators = ['tokyo', 'kyoto', 'osaka', 'hokkaido', 'paris', 'lyon', 'nice', 'london', 'edinburgh', 'rome', 'florence', 'venice', 'barcelona', 'madrid', 'seville']
                cities_mentioned = sum(1 for city in multiple_cities_indicators if city in response_lower)
                
                # If query is country-only and response mentions multiple cities, it's too comprehensive
                # Skip comprehensive responses - we'll ask clarifying questions instead
                if is_country_only and cities_mentioned >= 2:
                    continue  # Skip this response - too comprehensive
                
                # For city queries, boost score if response mentions the city (even if food_count is low)
                if is_city_query_food:
                    query_city_food = query_locations_food['cities'][0].lower()
                    response_text_food = str(row.get('response', '')).lower()
                    question_text_food = str(row.get('question', '')).lower()
                    if query_city_food == 'hokkaido':
                        # Check both response and question for Hokkaido mentions
                        mentions_hokkaido = (
                            any(loc in response_text_food for loc in ['hokkaido', 'niseko', 'sapporo']) or
                            'hokkaido' in question_text_food
                        )
                        if mentions_hokkaido:
                            food_score += 15  # Very strong boost for city match
                            # If it's a Hokkaido food entry, boost even more
                            if any(kw in response_text_food for kw in ['dining', 'food', 'eat', 'restaurant', 'cuisine']):
                                food_score += 10  # Extra boost for food + Hokkaido
                    else:
                        if query_city_food in response_text_food or query_city_food in question_text_food:
                            food_score += 10  # Very strong boost for city match
                
                food_scored.append((food_score, row, food_count, generic_count))
            
            # Sort by food score
            food_scored.sort(key=lambda x: x[0], reverse=True)
            
            # Filter: Find responses that mention food (even if they also mention other things)
            # Prioritize ones with more food content
            # For city queries, be more lenient - include responses that mention the city
            query_locations_precheck = self._extract_location_from_query(user_query)
            if query_locations_precheck['cities']:
                query_city_precheck = query_locations_precheck['cities'][0].lower()
                food_responses = []
                for score, row, food_count, generic_count in food_scored:
                    response_text_precheck = str(row.get('response', '')).lower()
                    # Include if has food keywords OR mentions the city
                    if query_city_precheck == 'hokkaido':
                        mentions_city = any(loc in response_text_precheck for loc in ['hokkaido', 'niseko', 'sapporo'])
                    else:
                        mentions_city = query_city_precheck in response_text_precheck
                    
                    if food_count >= 1 or mentions_city:
                        food_responses.append((score, row, food_count, generic_count))
            else:
                food_responses = [
                    (score, row, food_count, generic_count) 
                    for score, row, food_count, generic_count in food_scored
                    if food_count >= 1  # At least one food keyword
                ]
            
            if not food_responses:
                # No food responses found - ask clarifying questions
                query_locations = self._extract_location_from_query(user_query)
                
                if query_locations['countries']:
                    country = query_locations['countries'][0]
                    if country.lower() == 'japan':
                        return "I'd be happy to help you find great places to eat in Japan! To give you the best recommendations, could you tell me:\n\n- Which city or region in Japan are you visiting? (e.g., Tokyo, Kyoto, Osaka, Hokkaido)\n- What type of cuisine are you interested in? (e.g., sushi, ramen, izakaya, kaiseki)"
                    else:
                        return f"I'd be happy to help you find great places to eat in {country.title()}! To give you the best recommendations, could you tell me:\n\n- Which city or region in {country.title()} are you visiting?\n- What type of cuisine are you interested in?"
                elif query_locations['cities']:
                    # REMOVED: No longer ask for clarification when city is specified
                    # Return food data directly instead (handled by food response selection below)
                    pass
                else:
                    return "I'd be happy to help you find great places to eat! To give you the best recommendations, could you tell me:\n\n- Which country or city are you visiting?\n- What type of cuisine are you interested in?"
            
            # Sort by food score (highest first)
            food_responses.sort(key=lambda x: x[0], reverse=True)
            
            # STRICT: For city queries, filter to only responses mentioning the city
            query_locations = self._extract_location_from_query(user_query)
            if query_locations['cities']:
                query_city = query_locations['cities'][0].lower()
                city_filtered_food = []
                for score, row, food_count, generic_count in food_responses:
                    response_text = str(row.get('response', '')).lower()
                    row_city = str(row.get('city', '')).lower()
                    
                    # Check if response mentions the queried city
                    if query_city == 'hokkaido':
                        # Check if response mentions Hokkaido (case-insensitive, check whole response)
                        mentions_hokkaido = (
                            'hokkaido' in response_text or 
                            'niseko' in response_text or 
                            'sapporo' in response_text or 
                            'hokkaido' in row_city
                        )
                        if mentions_hokkaido:
                            # STRICT: Exclude if it mentions other locations prominently (especially at start)
                            response_start_check = response_text[:200].lower()
                            excluded_locations = ['stockholm', 'sweden', 'swedish', 'mumbai', 'india', 'indian', 'rajasthan', 'kerala']
                            mentions_excluded = any(loc in response_start_check for loc in excluded_locations)
                            
                            if not mentions_excluded:
                                city_filtered_food.append((score, row, food_count, generic_count))
                    else:
                        if query_city in response_text or query_city in row_city:
                            city_filtered_food.append((score, row, food_count, generic_count))
                
                if city_filtered_food:
                    food_responses = city_filtered_food
                else:
                    # No food responses match the city - but check if we have any responses at all
                    # If we have responses but none match the city, it means they're about other locations
                    # Return the actual Hokkaido entry if it exists, even if it wasn't in food_responses
                    if query_city == 'hokkaido':
                        # Look for Hokkaido entries - check food_scored first (has all scored entries)
                        # Then check sorted_rows
                        all_rows_to_check = []
                        
                        # Check food_scored (before filtering) - these have the original rows
                        for score, row, food_count, generic_count in food_scored[:20]:
                            all_rows_to_check.append(row)
                        
                        # Also check sorted_rows (after location filtering)
                        for row in sorted_rows[:15]:
                            if row not in all_rows_to_check:
                                all_rows_to_check.append(row)
                        
                        # Look for Hokkaido food entries
                        for row in all_rows_to_check:
                            response_text_check = str(row.get('response', '')).lower()
                            question_text_check = str(row.get('question', '')).lower()
                            
                            # Check if this is a Hokkaido food entry
                            is_hokkaido_food = (
                                ('hokkaido' in response_text_check or 'hokkaido' in question_text_check) and
                                any(kw in response_text_check for kw in ['dining', 'food', 'eat', 'restaurant', 'cuisine', 'seafood', 'genghis', 'soup curry', 'ramen', 'izakaya'])
                            )
                            
                            if is_hokkaido_food:
                                # Check it's not about other locations (especially at start)
                                response_start_check = response_text_check[:150]
                                if not any(loc in response_start_check for loc in ['stockholm', 'sweden', 'swedish', 'mumbai', 'india', 'indian']):
                                    return row['response']
                    
                    # If still no match, check if user already provided food type
                    # If food type is present, return best available food response for the city (even if not perfect match)
                    if has_food_type or has_budget_info or has_food_indicators:
                        # User already provided food type/budget, return best available food response
                        if food_responses:
                            # Return the best food response even if it doesn't match the city perfectly
                            best_available = food_responses[0]
                            return self._format_food_response(best_available[1]['response'])
                        # If no food responses at all, try to find any response about the city
                        for row in sorted_rows[:10]:
                            response_text_fallback = str(row.get('response', '')).lower()
                            if query_city in response_text_fallback and any(kw in response_text_fallback for kw in ['food', 'restaurant', 'dining', 'eat', 'cuisine']):
                                return self._format_food_response(row['response'])
                    
                    # If still no match and user hasn't provided food type, return clarifying question
                    if query_city == 'hokkaido':
                        # REMOVED: No longer ask for clarification when city is specified
                        # Return food data directly instead
                        pass
                    else:
                        # REMOVED: No longer ask for clarification when city is specified
                        # Return food data directly instead
                        pass
            
            # Find the best food-focused response
            # Prefer responses where food_count >= generic_count OR food score is high
            best_food_response = None
            for score, row, food_count, generic_count in food_responses:
                # Prefer responses where food is at least as prominent as generic content
                if food_count >= generic_count or score > 2:
                    best_food_response = (score, row, food_count, generic_count)
                    break
            
            # If no ideal match, use the best available
            if not best_food_response:
                # If country-only query and no good match, ask clarifying questions
                if is_country_only:
                    country = query_locations['countries'][0]
                    if country.lower() == 'japan':
                        return "I'd be happy to help you find great places to eat in Japan! To give you the best recommendations, could you tell me:\n\n- Which city or region in Japan are you visiting? (e.g., Tokyo, Kyoto, Osaka, Hokkaido)\n- What type of cuisine are you interested in? (e.g., sushi, ramen, izakaya, kaiseki)"
                    else:
                        return f"I'd be happy to help you find great places to eat in {country.title()}! To give you the best recommendations, could you tell me:\n\n- Which city or region in {country.title()} are you visiting?\n- What type of cuisine are you interested in?"
                best_food_response = food_responses[0]
            
            score, row, food_count, generic_count = best_food_response
            response_text = row['response']
            response_lower = response_text.lower()
            
            # For country-only queries, check if response matches the country
            if is_country_only:
                country = query_locations['countries'][0].lower()
                row_country = str(row.get('country', '')).lower()
                row_city = str(row.get('city', '')).lower()
                
                # Check if response mentions the queried country
                country_mentioned = (
                    country in response_lower or 
                    country in row_country or
                    any(city in response_lower for city in ['tokyo', 'kyoto', 'osaka', 'hokkaido'] if country == 'japan')
                )
                
                # If response doesn't match the country, ask clarifying questions
                if not country_mentioned:
                    if country == 'japan':
                        return "I'd be happy to help you find great places to eat in Japan! To give you the best recommendations, could you tell me:\n\n- Which city or region in Japan are you visiting? (e.g., Tokyo, Kyoto, Osaka, Hokkaido)\n- What type of cuisine are you interested in? (e.g., sushi, ramen, izakaya, kaiseki)"
                    else:
                        return f"I'd be happy to help you find great places to eat in {country.title()}! To give you the best recommendations, could you tell me:\n\n- Which city or region in {country.title()} are you visiting?\n- What type of cuisine are you interested in?"
            
            # Check if response is too long/comprehensive (indicates multi-city guide)
            # If country-only query and response is very long, ask clarifying questions instead
            if is_country_only and len(response_text) > 800:
                country = query_locations['countries'][0]
                if country.lower() == 'japan':
                    return "I'd be happy to help you find great places to eat in Japan! To give you the best recommendations, could you tell me:\n\n- Which city or region in Japan are you visiting? (e.g., Tokyo, Kyoto, Osaka, Hokkaido)\n- What type of cuisine are you interested in? (e.g., sushi, ramen, izakaya, kaiseki)"
                else:
                    return f"I'd be happy to help you find great places to eat in {country.title()}! To give you the best recommendations, could you tell me:\n\n- Which city or region in {country.title()} are you visiting?\n- What type of cuisine are you interested in?"
            
            # STRICT: Only return response if it's primarily about food
            # Food keywords should be >= generic keywords, OR food_count >= 3
            is_food_focused = (food_count >= generic_count and food_count >= 2) or food_count >= 3
            
            if not is_food_focused:
                # Response mentions food but isn't primarily about food
                # BUT: If user already provided food type, return the response anyway (don't ask again)
                if has_food_type or has_budget_info or has_food_indicators:
                    # User already answered, return what we have
                    return self._format_food_response(response_text)
                
                # Otherwise, ask clarifying questions instead of returning generic content
                query_locations = self._extract_location_from_query(user_query)
                
                if query_locations['countries']:
                    country = query_locations['countries'][0]
                    if country.lower() == 'japan':
                        return "I'd be happy to help you find great places to eat in Japan! To give you the best recommendations, could you tell me:\n\n- Which city or region in Japan are you visiting? (e.g., Tokyo, Kyoto, Osaka, Hokkaido)\n- What type of cuisine are you interested in? (e.g., sushi, ramen, izakaya, kaiseki)"
                    else:
                        return f"I'd be happy to help you find great places to eat in {country.title()}! To give you the best recommendations, could you tell me:\n\n- Which city or region in {country.title()} are you visiting?\n- What type of cuisine are you interested in?"
                elif query_locations['cities']:
                    # REMOVED: No longer ask for clarification when city is specified
                    # Return food data directly instead (handled by food response selection below)
                    pass
                else:
                    return "I'd be happy to help you find great places to eat! To give you the best recommendations, could you tell me:\n\n- Which country or city are you visiting?\n- What type of cuisine are you interested in?"
            
            # Response is food-focused. If the user asked for a specific type of food
            # (e.g., "ramen", "sushi", "pizza"), trim the response to only that food.
            # This prevents returning mixed recommendations (e.g., sushi + ramen)
            # when the user only asked for one.
            #
            # Detect specific dish keywords in the query
            dish_keywords = []
            query_lower_food = user_query.lower()
            possible_dishes = [
                'ramen', 'sushi', 'pizza', 'burger', 'burgers', 'steak', 'pasta',
                'seafood', 'vegan', 'vegetarian', 'dessert', 'bbq', 'barbecue',
                'noodles', 'dimsum', 'dim sum', 'tapas', 'kebabs', 'kebab', 'bbq',
                'coffee', 'brunch', 'breakfast'
            ]
            for dish in possible_dishes:
                if dish in query_lower_food:
                    dish_keywords.append(dish)
            
            if dish_keywords:
                # Split response into sentences/segments and keep only those
                # that mention the requested dish keyword(s)
                segments = []
                # First split by double newlines (paragraphs)
                for paragraph in response_text.split("\n\n"):
                    paragraph = paragraph.strip()
                    if not paragraph:
                        continue
                    # Further split into sentences
                    sentence_candidates = []
                    for part in paragraph.replace("! ", ". ").replace("? ", ". ").split(". "):
                        part = part.strip()
                        if part:
                            sentence_candidates.append(part)
                    for sent in sentence_candidates:
                        sent_lower = sent.lower()
                        if any(dish in sent_lower for dish in dish_keywords):
                            segments.append(sent)
                
                # If we found dish-specific segments, use them
                if segments:
                    trimmed_response = ". ".join(segments)
                    # Add a period at the end if missing
                    if not trimmed_response.endswith((".", "!", "?")):
                        trimmed_response += "."
                    return trimmed_response
            
            # Response is food-focused, format it for better readability
            return self._format_food_response(response_text)
        
        if intent['is_accommodation']:
            # First, check if this is a country-level query (e.g. "hotel in japan")
            # Extract location from user_query, but also check conversation history for location context
            query_locations_acc = self._extract_location_from_query(user_query)
            
            # If no location in current query, check conversation history for location context
            if not query_locations_acc['cities'] and not query_locations_acc['countries']:
                if conversation_history:
                    # Extract location from previous messages
                    all_messages = ' '.join([msg.get('content', '') for msg in conversation_history[-4:]])
                    history_locations = self._extract_location_from_query(all_messages)
                    if history_locations['cities']:
                        query_locations_acc['cities'] = history_locations['cities']
                    elif history_locations['countries']:
                        query_locations_acc['countries'] = history_locations['countries']
            is_country_only_acc = bool(query_locations_acc['countries'] and not query_locations_acc['cities'])

            # For country-only accommodation queries, always ask which city
            if is_country_only_acc:
                country = query_locations_acc['countries'][0]
                if country.lower() == 'japan':
                    return (
                        "I'd be happy to help you find a hotel in Japan! To give you the best recommendations, "
                        "could you tell me which city or region you're heading to? For example:\n\n"
                        "- Tokyo (Shinjuku, Shibuya, Ginza, Tokyo Station area)\n"
                        "- Kyoto (Gion, Kyoto Station, Arashiyama)\n"
                        "- Osaka (Namba, Umeda, Osaka Station area)\n"
                        "- Sapporo, Fukuoka, Hiroshima, etc.\n\n"
                        "Once I know your city, I can give you hotel area suggestions and tips from the dataset."
                    )
                else:
                    return (
                        f"I'd be happy to help you find a hotel in {country.title()}! To give you the best recommendations, "
                        "could you tell me which city or region you're visiting?\n\n"
                        "- Big city (capital or major hub)\n"
                        "- Coastal / beach area\n"
                        "- Smaller town / countryside\n\n"
                        "Once I know your city, I can share hotel area suggestions and practical tips for that place."
                    )

            # Otherwise (city-level or more specific), look for responses that mention hotel/accommodation
            city_name = None
            if query_locations_acc['cities']:
                city_name = query_locations_acc['cities'][0].lower()
            
            # Check if query specifies accommodation type (luxury, budget, mid-range, etc.)
            query_lower_acc_check = user_query.lower()
            modifier_keywords_check = [
                'luxury',
                'budget',
                'mid-range',
                'mid range',
                'midrange',
                'cheap',
                'expensive',
                'affordable',
                'best',
                'top',
                'recommended',
                '5-star',
                '5 star',
                'ryokan',
                'business hotel',
                'capsule',
                'hostel',
            ]
            has_modifier = any(kw in query_lower_acc_check for kw in modifier_keywords_check)
            
            # If city is specified but no modifier, DON'T ask for clarification - return all types directly
            # This allows users to see all options (luxury, mid-range, budget) at once

            # STRICT: Filter accommodation responses FIRST - check ALL retrieved rows, not just sorted ones
            accommodation_responses = []
            # Check sorted_rows first (highest similarity)
            all_rows_to_check = sorted_rows.copy()
            # Also check original_retrieved_rows if available (might have different ordering)
            if original_retrieved_rows:
                for row in original_retrieved_rows:
                    if row not in all_rows_to_check:
                        all_rows_to_check.append(row)
            
            for row in all_rows_to_check:
                response_text = str(row['response'])
                response_lower = response_text.lower()
                question_lower = str(row.get('question', '')).lower()
                row_city = str(row.get('city', '')).lower()
                row_country = str(row.get('country', '')).lower()

                # STRICT: Skip generic travel intros and transportation responses
                response_start = response_lower[:100]
                if any(phrase in response_start for phrase in [
                    'travel to ', 'travel in ', 'fly to major airports',
                    'get jr pass', 'use suica', 'learn basic japanese',
                    'carry cash', 'get travel insurance', 'check visa requirements',
                    'transportation', 'transport', 'subway', 'metro', 'bus', 'train'
                ]):
                    continue
                
                # STRICT: Skip if response is clearly about transportation
                transport_keywords = ['transportation', 'transport', 'subway', 'metro', 'bus', 'train', 'ic card', 'icoca', 'suica', 'getting around']
                if any(kw in response_lower[:200] for kw in transport_keywords) and not any(kw in response_lower for kw in ['hotel', 'accommodation', 'stay', 'lodging']):
                    continue

                # Must clearly be about accommodation
                accommodation_keywords = ['hotel', 'hotels', 'where to stay', 'accommodation', 'lodging', 'resort', 'stay in', 'staying']
                has_accommodation_kw = any(kw in response_lower or kw in question_lower for kw in accommodation_keywords)
                
                if not has_accommodation_kw:
                    continue
                
                # STRICT: If we have a location, require location match AND exclude other locations (CHECK BEFORE SCORING)
                location_match = False
                should_exclude = False
                
                if city_name:
                    # Build target and exclude locations
                    target_locations = [city_name]
                    if city_name == 'bali':
                        target_locations.extend(['bali', 'denpasar', 'ubud', 'seminyak', 'kuta', 'indonesia', 'indonesian'])
                        exclude_locations = ['singapore', 'singaporean', 'tokyo', 'japan', 'japanese', 'marina bay', 'orchard road', 'clarke quay', 'chinatown', 'sgd']
                    elif city_name == 'tokyo':
                        target_locations.extend(['tokyo', 'shinjuku', 'shibuya', 'ginza', 'asakusa', 'roppongi', 'harajuku'])
                        exclude_locations = ['singapore', 'singaporean', 'bali', 'indonesia', 'indonesian', 'marina bay', 'orchard road', 'little india', 'chinatown']
                    elif city_name == 'singapore':
                        target_locations.extend(['singapore', 'singaporean'])
                        exclude_locations = ['bali', 'indonesia', 'indonesian', 'tokyo', 'japan', 'japanese']
                    elif city_name == 'osaka':
                        target_locations.extend(['osaka', 'namba', 'umeda', 'osaka station'])
                        exclude_locations = ['tokyo', 'kyoto', 'singapore', 'bali']
                    else:
                        exclude_locations = []
                    
                    # Check if response mentions target location
                    location_match = (
                        any(loc in response_lower for loc in target_locations) or
                        any(loc in question_lower for loc in target_locations) or
                        city_name in row_city
                    )
                    
                    # Check if response mentions excluded locations (especially at start)
                    if exclude_locations:
                        response_first_150 = response_lower[:150]
                        if any(excl_loc in response_first_150 for excl_loc in exclude_locations):
                            should_exclude = True
                        # Also check if excluded location appears multiple times
                        excl_count = sum(1 for excl_loc in exclude_locations if excl_loc in response_lower)
                        if excl_count >= 2:
                            should_exclude = True
                        if any(excl_loc in question_lower for excl_loc in exclude_locations):
                            should_exclude = True
                    
                    # STRICT: Must match location AND not mention excluded locations
                    if not location_match:
                        continue
                    if should_exclude:
                        continue
                    
                    # ADDITIONAL CHECK: Response must mention target location
                    target_mentions = sum(1 for loc in target_locations if loc in response_lower)
                    if target_mentions == 0:
                        continue  # Must mention target location at least once
                    
                    # STRICT: For Tokyo queries, exclude responses that start with or prominently mention Singapore
                    if city_name == 'tokyo':
                        response_first_100 = response_lower[:100]
                        if 'singapore' in response_first_100 or 'singaporean' in response_first_100:
                            continue
                        # Check if Singapore locations are mentioned more than Tokyo
                        singapore_locs = ['singapore', 'marina bay', 'orchard road', 'little india', 'chinatown', 'raffles']
                        singapore_count = sum(1 for loc in singapore_locs if loc in response_lower)
                        tokyo_count = sum(1 for loc in target_locations if loc in response_lower)
                        if singapore_count > 0 and singapore_count >= tokyo_count:
                            continue
                    
                    # STRICT: For Bali queries, exclude responses that start with or prominently mention Singapore
                    if city_name == 'bali':
                        response_first_100 = response_lower[:100]
                        if 'singapore' in response_first_100 or 'singaporean' in response_first_100:
                            continue
                        # Check if Singapore locations are mentioned more than Bali
                        singapore_locs = ['singapore', 'marina bay', 'orchard road', 'clarke quay', 'chinatown', 'sgd', 'singaporean']
                        singapore_count = sum(1 for loc in singapore_locs if loc in response_lower)
                        bali_count = sum(1 for loc in target_locations if loc in response_lower)
                        if singapore_count > 0 and singapore_count >= bali_count:
                            continue
                    
                    # Additional check: response should NOT start with generic travel advice
                    if response_start.startswith('travel to'):
                        continue
                
                # Prefer responses where question mentions accommodation + city
                score = 1  # Base score
                if city_name:
                    if city_name in question_lower and any(kw in question_lower for kw in accommodation_keywords):
                        score += 5  # Extra boost for question match
                    # Boost if response mentions the city
                    if any(loc in response_lower for loc in target_locations):
                        score += 3
                
                accommodation_responses.append((score, row))

            # If we found accommodation responses, return them
            if accommodation_responses:
                # Sort by score (highest first)
                accommodation_responses.sort(key=lambda x: x[0], reverse=True)
                
                # If query specified a modifier (luxury / budget / mid-range), return only that type
                if has_modifier:
                    focus = None
                    if 'luxury' in query_lower_acc_check:
                        focus = 'luxury'
                    elif 'budget' in query_lower_acc_check:
                        focus = 'budget'
                    elif 'mid-range' in query_lower_acc_check or 'mid range' in query_lower_acc_check:
                        focus = 'mid-range'
                    
                    # Return the best matching response for the specified type
                    best_row = accommodation_responses[0][1]
                    best_response = best_row['response']
                    return self._format_accommodation_response(best_response, focus=focus)
                
                # If no modifier specified, collect responses for all types (luxury, mid-range, budget)
                # Group responses by type - check more responses to find all types
                luxury_responses = []
                midrange_responses = []
                budget_responses = []
                
                for score, row in accommodation_responses[:40]:  # Check top 40 responses to find all types
                    response_text = str(row['response']).lower()
                    question_text = str(row.get('question', '')).lower()
                    combined_text = response_text + ' ' + question_text
                    
                    # Categorize response by type - check for explicit mentions
                    luxury_keywords = ['luxury', '5-star', '5 star', 'upscale', 'premium', 'deluxe', 'high-end', 'boutique']
                    midrange_keywords = ['mid-range', 'mid range', 'midrange', '3-star', '3 star', 'moderate', 'standard']
                    budget_keywords = ['budget', 'cheap', 'affordable', 'hostel', 'capsule', '2-star', '2 star', 'economy', 'backpacker']
                    
                    luxury_count = sum(1 for kw in luxury_keywords if kw in combined_text)
                    midrange_count = sum(1 for kw in midrange_keywords if kw in combined_text)
                    budget_count = sum(1 for kw in budget_keywords if kw in combined_text)
                    
                    # If response mentions all three types, use it for all categories
                    if luxury_count > 0 and midrange_count > 0 and budget_count > 0:
                        luxury_responses.append((score, row))
                        midrange_responses.append((score, row))
                        budget_responses.append((score, row))
                    # Otherwise, add to the category with highest count
                    elif luxury_count > 0 and luxury_count >= midrange_count and luxury_count >= budget_count:
                        luxury_responses.append((score, row))
                    elif midrange_count > 0 and midrange_count >= luxury_count and midrange_count >= budget_count:
                        midrange_responses.append((score, row))
                    elif budget_count > 0 and budget_count >= luxury_count and budget_count >= midrange_count:
                        budget_responses.append((score, row))
                    # If no clear category but mentions accommodation, add to all if we don't have enough
                    elif any(kw in combined_text for kw in ['hotel', 'accommodation', 'where to stay']):
                        # If we're missing categories, use this response for missing ones
                        if not luxury_responses and luxury_count == 0 and midrange_count == 0 and budget_count == 0:
                            luxury_responses.append((score, row))
                            midrange_responses.append((score, row))
                            budget_responses.append((score, row))
                
                # Check if we have a single response that contains all three types
                # Prioritize complete responses (those with "accommodation:" pattern)
                # If so, return it directly (it's already formatted with all types)
                for score, row in accommodation_responses[:10]:
                    response_text = str(row['response'])
                    response_lower = response_text.lower()
                    
                    # Check if this is a complete generic accommodation entry
                    # Pattern: "{City} accommodation: Luxury hotels - items. Mid-range hotels - items. Budget hotels - items."
                    is_complete_entry = 'accommodation:' in response_lower and 'luxury' in response_lower and 'mid-range' in response_lower and 'budget' in response_lower
                    
                    has_luxury = any(kw in response_lower for kw in ['luxury', '5-star', 'premium'])
                    has_midrange = any(kw in response_lower for kw in ['mid-range', 'mid range', '3-star'])
                    has_budget = any(kw in response_lower for kw in ['budget', 'affordable', 'hostel'])
                    
                    # Prioritize complete entries that have all three types
                    if is_complete_entry and has_luxury and has_midrange and has_budget:
                        # This is a complete response with all three types - return it directly
                        return self._format_accommodation_response(response_text, focus=None)
                    
                    # Also check for responses that have all three types but might not be complete entries
                    if has_luxury and has_midrange and has_budget:
                        # Ensure response is reasonably complete (at least 100 chars)
                        if len(response_text) >= 100:
                            return self._format_accommodation_response(response_text, focus=None)
                
                # If we have responses for all three types (separate responses), combine them
                if luxury_responses and midrange_responses and budget_responses:
                    # Make sure we're not using the same response for multiple categories
                    luxury_best = luxury_responses[0][1]
                    midrange_best = midrange_responses[0][1]
                    budget_best = budget_responses[0][1]
                    
                    # If all three are the same response, just return it formatted
                    if luxury_best['response'] == midrange_best['response'] == budget_best['response']:
                        return self._format_accommodation_response(luxury_best['response'], focus=None)
                    
                    # Format each type and combine
                    luxury_formatted = self._format_accommodation_response(luxury_best['response'], focus='luxury')
                    midrange_formatted = self._format_accommodation_response(midrange_best['response'], focus='mid-range')
                    budget_formatted = self._format_accommodation_response(budget_best['response'], focus='budget')
                    
                    combined = f"Luxury:\n{luxury_formatted}\n\nMid-range:\n{midrange_formatted}\n\nBudget:\n{budget_formatted}"
                    return combined
                
                # If we have luxury and budget (but not mid-range), combine them
                if luxury_responses and budget_responses:
                    luxury_best = luxury_responses[0][1]['response']
                    budget_best = budget_responses[0][1]['response']
                    
                    luxury_formatted = self._format_accommodation_response(luxury_best, focus='luxury')
                    budget_formatted = self._format_accommodation_response(budget_best, focus='budget')
                    
                    combined = f"Luxury:\n{luxury_formatted}\n\nBudget:\n{budget_formatted}"
                    if midrange_responses:
                        midrange_best = midrange_responses[0][1]['response']
                        midrange_formatted = self._format_accommodation_response(midrange_best, focus='mid-range')
                        combined = f"Luxury:\n{luxury_formatted}\n\nMid-range:\n{midrange_formatted}\n\nBudget:\n{budget_formatted}"
                    return combined
                
                # Fallback: return the best response without filtering (it may contain all types)
                # But prioritize complete generic entries over incomplete specific entries
                best_response_found = None
                for score, row in accommodation_responses[:10]:
                    response_text = str(row['response'])
                    response_lower = response_text.lower()
                    
                    # Check if this is a complete generic accommodation entry
                    is_complete_entry = 'accommodation:' in response_lower and 'luxury' in response_lower and 'mid-range' in response_lower and 'budget' in response_lower
                    
                    if is_complete_entry:
                        best_response_found = response_text
                        break
                
                # If we found a complete entry, use it
                if best_response_found:
                    return self._format_accommodation_response(best_response_found, focus=None)
                
                # Otherwise, use the best response
                best_row = accommodation_responses[0][1]
                best_response = best_row['response']
                return self._format_accommodation_response(best_response, focus=None)
            
            # If no accommodation responses found, check original_retrieved_rows as fallback (check more rows)
            # Also check sorted_rows more thoroughly if we haven't found enough
            if not accommodation_responses or len(accommodation_responses) < 3:
                for row in original_retrieved_rows[:30]:  # Check up to 30 rows
                    response_lower = str(row['response']).lower()
                    question_lower = str(row.get('question', '')).lower()
                    row_city = str(row.get('city', '')).lower()
                    
                    # Skip generic travel intros
                    if response_lower[:100].startswith('travel to'):
                        continue
                    
                    # STRICT: Exclude responses about other locations
                    if city_name:
                        # Build exclude list
                        if city_name == 'bali':
                            exclude_locations = ['singapore', 'singaporean', 'tokyo', 'japan', 'japanese']
                        elif city_name == 'tokyo':
                            exclude_locations = ['singapore', 'singaporean', 'bali', 'indonesia', 'indonesian', 'marina bay', 'orchard road', 'little india', 'chinatown', 'raffles']
                        elif city_name == 'singapore':
                            exclude_locations = ['bali', 'indonesia', 'indonesian', 'tokyo', 'japan', 'japanese']
                        else:
                            exclude_locations = []
                        
                        # Check if response starts with or mentions excluded location
                        response_first_150 = response_lower[:150]
                        if any(excl_loc in response_first_150 for excl_loc in exclude_locations):
                            continue
                        if any(excl_loc in question_lower for excl_loc in exclude_locations):
                            continue
                        
                        # Must mention target city
                        target_locations = [city_name]
                        if city_name == 'bali':
                            target_locations.extend(['bali', 'denpasar', 'ubud', 'seminyak', 'kuta'])
                        elif city_name == 'osaka':
                            target_locations.extend(['osaka', 'namba', 'umeda', 'osaka station'])
                        
                        location_match = (
                            any(loc in response_lower for loc in target_locations) or
                            any(loc in question_lower for loc in target_locations) or
                            city_name in row_city
                        )
                        if not location_match:
                            continue
                        
                        # STRICT: Must NOT mention excluded locations prominently
                        if exclude_locations:
                            response_first_200 = response_lower[:200]
                            if any(excl_loc in response_first_200 for excl_loc in exclude_locations):
                                continue
                            # Check if excluded location appears in question
                            if any(excl_loc in question_lower for excl_loc in exclude_locations):
                                continue
                            
                            # Check if excluded location appears more than target location
                            excl_count = sum(1 for excl_loc in exclude_locations if excl_loc in response_lower)
                            target_count = sum(1 for loc in target_locations if loc in response_lower)
                            if excl_count > target_count:
                                continue
                        
                        # Must mention target location at least once
                        target_mentions = sum(1 for loc in target_locations if loc in response_lower)
                        if target_mentions == 0:
                            continue
                    
                    # Check if it's about accommodation
                    if any(kw in response_lower or kw in question_lower for kw in ['hotel', 'where to stay', 'accommodation']):
                        if city_name:
                            return row['response']
                        else:
                            return row['response']
            
            # If still no match found, try to return ANY accommodation response for the city
            # Don't ask for clarification - just return what we have
            if city_name:
                # Try to find ANY accommodation response for this city, even if not perfect match
                for row in sorted_rows[:50]:  # Check top 50 responses
                    response_lower = str(row['response']).lower()
                    question_lower = str(row.get('question', '')).lower()
                    
                    # Check if it mentions the city and accommodation
                    city_mentioned = any(loc in response_lower or loc in question_lower 
                                      for loc in [city_name] + ([city_name.title()] if city_name else []))
                    accommodation_mentioned = any(kw in response_lower or kw in question_lower 
                                                for kw in ['hotel', 'accommodation', 'where to stay', 'lodging'])
                    
                    if city_mentioned and accommodation_mentioned:
                        # Return this response, formatted
                        return self._format_accommodation_response(row['response'], focus=None)
                
                # If absolutely nothing found, return a generic response with all types
                return f"{city_name.title()} accommodation: Luxury hotels - 5-star properties, boutique hotels, luxury resorts. Mid-range hotels - 3-4 star hotels, business hotels, comfortable accommodations. Budget hotels - affordable hotels, hostels, guesthouses, budget-friendly options."
            else:
                # No city specified - ask for city
                return "I'd be happy to help you find a hotel! To give you the best recommendations, could you tell me which city or region you're visiting?"
        
        # IMPORTANT: If accommodation intent was detected but no accommodation response found,
        # we've already returned above. Don't fall through to general response selection.
        
        # For other queries, use the most relevant SINGLE response
        # Don't combine unless explicitly needed (recommendations without specific location)
        high_quality = [r for r in sorted_rows if r['similarity_score'] > 0.15]
        
        if len(high_quality) >= 1:
            # Always use the best single response for non-recommendation queries
            # This prevents duplicate/unorganized responses
            
            # If specific location is mentioned, prefer shorter, cleaner responses
            if has_specific_location:
                # For location-specific queries, filter by query topic
                query_lower = user_query.lower()
                
                # If query is about specific topic (attractions, food, etc.), filter responses
                topic_keywords = {
                    'attraction': ['attraction', 'attractions', 'see', 'visit', 'sight'],
                    'food': ['food', 'restaurant', 'dining', 'eat', 'cuisine'],
                    'transport': ['transport', 'transportation', 'get around', 'metro', 'subway'],
                    'safety': ['safe', 'safety', 'dangerous'],
                    'budget': ['budget', 'cost', 'price', 'cheap', 'affordable']
                }
                
                # Find matching topic
                query_topic = None
                for topic, keywords in topic_keywords.items():
                    if any(kw in query_lower for kw in keywords):
                        query_topic = topic
                        break
                
                # Filter responses by topic if topic is specified
                if query_topic:
                    topic_responses = []
                    for row in high_quality:
                        response_lower = str(row['response']).lower()
                        topic_kws = topic_keywords[query_topic]
                        # Check if response matches the topic
                        if any(kw in response_lower for kw in topic_kws):
                            # Penalize if response mentions other topics prominently
                            other_topics = {k: v for k, v in topic_keywords.items() if k != query_topic}
                            has_other_topic = False
                            for other_topic, other_kws in other_topics.items():
                                if sum(1 for kw in other_kws if kw in response_lower) >= 2:
                                    has_other_topic = True
                                    break
                            
                            if not has_other_topic:
                                topic_responses.append(row)
                    
                    if topic_responses:
                        high_quality = topic_responses
                
                # For location-specific queries, prefer shorter responses (less likely to have duplicates)
                best_response = high_quality[0]['response']
                for row in high_quality[:3]:  # Check top 3
                    alt_response = row['response']
                    # Prefer responses between 200-1200 chars (comprehensive but not duplicated)
                    if 200 <= len(alt_response) <= 1200:
                        # Check if it's not a duplicate of current best
                        if alt_response[:80].lower() != best_response[:80].lower():
                            best_response = alt_response
                            break
                return best_response
            
            best_response = high_quality[0]['response']
            
            # Additional check: if response is very long (>1500 chars), it might be duplicated
            # Try to find a shorter, more focused response (only for non-location queries)
            if len(best_response) > 1500:
                for row in high_quality[1:]:
                    alt_response = row['response']
                    # Prefer shorter responses that are still comprehensive
                    if len(alt_response) < len(best_response) and len(alt_response) > 200:
                        # Check if it's not a duplicate
                        if alt_response[:100].lower() != best_response[:100].lower():
                            best_response = alt_response
                            break
            
            return best_response
        else:
            # Use best available even if similarity is lower
            return sorted_rows[0]['response']
    
    def _check_conflicts(self, retrieved_rows: List[Dict]) -> Optional[str]:
        """
        Check if retrieved contexts have conflicting information.
        
        Args:
            retrieved_rows: List of retrieved row dictionaries
        
        Returns:
            Conflict message if conflicts found, None otherwise
        """
        if len(retrieved_rows) < 2:
            return None
        
        # Check for conflicting information about same location/topic
        locations = {}
        for row in retrieved_rows:
            location_key = f"{row.get('city', '')}_{row.get('country', '')}"
            # Only check conflicts for non-empty location keys
            if location_key and location_key != '_':
                if location_key not in locations:
                    locations[location_key] = []
                locations[location_key].append(row)
        
        # If multiple entries for same location with different info, note it
        conflicts = []
        for location_key, rows in locations.items():
            if len(rows) > 1:
                # Check if they have different seasons or conflicting advice
                seasons = {r.get('season', '') for r in rows if r.get('season')}
                if len(seasons) > 1:
                    location_display = location_key.replace('_', ', ').strip(', ')
                    if location_display:
                        conflicts.append(f"Different seasonal information found for {location_display}")
        
        if conflicts:
            return "Note: " + "; ".join(conflicts)
        
        return None
    
    def chat(self, user_query: str, top_k: int = 6, conversation_history: List[Dict] = None) -> Dict:
        """
        Answer user query using only retrieved dataset contexts.
        
        Args:
            user_query: User's travel question (may already be enhanced with context)
            top_k: Number of context rows to retrieve (5-8 range)
            conversation_history: Optional conversation history for additional context
        
        Returns:
            Dictionary with response and metadata
        """
        # Correct typos in user query FIRST
        user_query = self._correct_typos(user_query)
        
        # Ensure top_k is in valid range (5-8)
        top_k = max(5, min(8, top_k))
        
        # Check if query is too vague FIRST (before retrieval to save processing)
        # This prevents retrieving irrelevant data for vague queries
        query_words = user_query.lower().strip().split()
        vague_queries = ['why', 'what', 'how', 'when', 'where', 'who', 'which', 'yes', 'no', 'ok', 'okay', 'hi', 'hello', 'hey', 'thanks', 'thank you']
        is_vague = (
            len(query_words) == 1 and query_words[0] in vague_queries or
            len(user_query.strip()) < 3 or
            (len(query_words) <= 2 and all(word in vague_queries for word in query_words))
        )
        
        # STRICT: If query is vague, ALWAYS return clarifying question immediately
        # This prevents returning random irrelevant responses
        if is_vague:
            return {
                'response': "Sorry, I didn't quite understand that.\n\nCould you please repeat or rephrase your question with a bit more detail? For example:\n\n- Which destination are you asking about?\n- Are you interested in food, attractions, hotels, transport, or something else?",
                'retrieved_context_count': 0,
                'avg_similarity': 0.0,
                'needs_clarification': True
            }
        
        # Enhance query with conversation context FIRST (adds location from previous messages)
        if conversation_history:
            user_query = self._enhance_with_context(user_query, conversation_history)
        
        # Enhance query for better retrieval based on intent
        intent = self._detect_query_intent(user_query)
        enhanced_query = user_query
        
        # If food query, enhance with food keywords to improve retrieval
        if intent['is_food']:
            enhanced_query = f"{user_query} restaurant cuisine dining food eat meal"
        
        # If accommodation query, enhance with accommodation keywords
        if intent['is_accommodation']:
            enhanced_query = f"{user_query} hotel accommodation where to stay lodging"
        
        # If surfing query, enhance with surfing keywords to improve retrieval
        if intent.get('is_surfing'):
            enhanced_query = f"{user_query} surfing surf wave waves beach"
        
        # If mountain query, enhance with mountain keywords to improve retrieval
        if intent.get('is_mountain'):
            enhanced_query = f"{user_query} mountain mount peak summit hiking climb hike"
        
        # If skiing query, enhance with skiing keywords to improve retrieval
        if intent.get('is_skiing'):
            enhanced_query = f"{user_query} skiing ski snowboard snow winter sport slope resort niseko hokkaido"
        
        # Retrieve relevant context using TF-IDF
        retrieved_rows = self.retriever.retrieve(enhanced_query, top_k=top_k)
        
        # Check if we have sufficient context
        if not retrieved_rows:
            return {
                'response': "I couldn't find relevant information in my knowledge base. Could you try rephrasing your question or provide more details about what you're looking for?",
                'retrieved_context_count': 0,
                'needs_clarification': True,
                'avg_similarity': 0.0
            }
        
        # Calculate similarity metrics
        avg_similarity = sum(row['similarity_score'] for row in retrieved_rows) / len(retrieved_rows)
        max_similarity = max(row['similarity_score'] for row in retrieved_rows)
        min_similarity = min(row['similarity_score'] for row in retrieved_rows)
        
        # Check if query is too vague (single word, very short, or common words)
        # This check MUST happen BEFORE response selection to prevent random answers
        query_words = user_query.lower().strip().split()
        vague_queries = ['why', 'what', 'how', 'when', 'where', 'who', 'which', 'yes', 'no', 'ok', 'okay', 'hi', 'hello', 'hey', 'thanks', 'thank you']
        is_vague = (
            len(query_words) == 1 and query_words[0] in vague_queries or
            len(user_query.strip()) < 3 or
            (len(query_words) <= 2 and all(word in vague_queries for word in query_words))
        )
        
        # STRICT: If query is vague, ALWAYS return clarifying question regardless of similarity
        # This prevents returning random irrelevant responses
        if is_vague:
            return {
                'response': "Sorry, I didn't quite understand that.\n\nCould you please repeat or rephrase your question with a bit more detail? For example:\n\n- Which destination are you asking about?\n- Are you interested in food, attractions, hotels, transport, or something else?",
                'retrieved_context_count': len(retrieved_rows),
                'avg_similarity': avg_similarity,
                'needs_clarification': True
            }
        
        # If similarity scores are very low, return sorry message
        if avg_similarity < 0.08 or max_similarity < 0.15:
            # Ask clarifying questions based on query intent
            intent = self._detect_query_intent(user_query)
            query_locations = self._extract_location_from_query(user_query)
            
            clarification = "Sorry, I didn't quite understand that from my current data. "
            
            if intent['is_food']:
                if query_locations['countries']:
                    country = query_locations['countries'][0]
                    clarification += f"Could you tell me which city or region in {country.title()} you're interested in, and what type of cuisine you're looking for?"
                elif query_locations['cities']:
                    # REMOVED: No longer ask for clarification when city is specified
                    # Return food data directly instead - don't ask for cuisine type
                    clarification = None  # Skip clarification, will return data directly
                else:
                    clarification += "Could you tell me which country or city you're visiting, and what type of cuisine you're interested in?"
            elif intent['is_accommodation']:
                if query_locations['countries']:
                    country = query_locations['countries'][0]
                    clarification += f"Could you tell me which city or region in {country.title()} you're visiting?"
                elif query_locations['cities']:
                    # REMOVED: No longer ask for clarification when city is specified
                    # Return accommodation data directly instead - don't ask for type
                    clarification = None  # Skip clarification, will return data directly
                else:
                    clarification += "Could you tell me which destination you're visiting and what type of accommodation you need?"
            elif intent['is_when']:
                if query_locations['countries']:
                    country = query_locations['countries'][0]
                    clarification += f"Could you tell me which city or region in {country.title()} you're interested in?"
                elif query_locations['cities']:
                    # REMOVED: No longer ask for clarification when city is specified
                    # Return when/best time data directly instead
                    clarification = None  # Skip clarification, will return data directly
                else:
                    clarification += "Could you tell me which destination you're interested in and what you'd like to do there?"
            else:
                if query_locations['countries']:
                    country = query_locations['countries'][0]
                    clarification += f"Could you tell me which city or region in {country.title()} you're interested in?"
                elif query_locations['cities']:
                    # REMOVED: No longer ask for clarification when city is specified
                    # Return data directly instead
                    clarification = None  # Skip clarification, will return data directly
                else:
                    clarification += "Could you tell me which destination you're interested in and what specific information you need?"
            
            # Only return clarification if it was set (i.e., for country-level or no location queries)
            if clarification:
                return {
                    'response': clarification,
                    'retrieved_context_count': len(retrieved_rows),
                    'avg_similarity': avg_similarity,
                    'needs_clarification': True
                }
            # If clarification was skipped (city-level query), continue to return data directly
            # Don't return here - let the code continue to select and return the best response
        
        # Extract location from query to determine if we should check conflicts
        query_locations = self._extract_location_from_query(user_query)
        has_specific_location = bool(query_locations['countries'] or query_locations['cities'])
        
        # Additional validation: Check if similarity is still too low after filtering
        # If max similarity is very low, the retrieved content is likely not relevant
        # Also check if query is vague (should have been caught earlier, but double-check)
        query_words_check = user_query.lower().strip().split()
        vague_check = len(query_words_check) == 1 and query_words_check[0] in ['why', 'what', 'how', 'when', 'where', 'who', 'which', 'yes', 'no', 'ok', 'okay', 'hi', 'hello', 'hey']
        
        if vague_check or max_similarity < 0.12:
            return {
                'response': "I'm sorry, but I couldn't find relevant information for your question in my knowledge base. Could you please provide more details? For example:\n\n- Which destination are you interested in?\n- What specific information are you looking for?\n- What would you like to know about travel?",
                'retrieved_context_count': len(retrieved_rows),
                'avg_similarity': avg_similarity,
                'needs_clarification': True
            }
        
        # Select best response from retrieved contexts
        # Store original retrieved_rows before any filtering for fallback
        original_retrieved_rows = retrieved_rows.copy() if retrieved_rows else []
        
        # Select best response from retrieved contexts
        response = self._select_best_response(retrieved_rows, user_query, original_retrieved_rows, conversation_history)
        
        # Format the response with proper indexing and bullet points
        if response:
            response = self._format_response(response)
        
        if not response:
            return {
                'response': "I'm sorry, but I couldn't find relevant information for your question in my knowledge base. Could you please provide more details? For example:\n\n- Which destination are you interested in?\n- What specific information are you looking for?\n- What would you like to know about travel?",
                'retrieved_context_count': len(retrieved_rows),
                'avg_similarity': avg_similarity,
                'needs_clarification': True
            }
        
        # Final validation: Check if response is actually relevant to query
        # For very low similarity, ensure response mentions common travel terms
        if max_similarity < 0.18:
            response_lower = response.lower()
            # Check if response contains travel-related content
            travel_keywords = ['travel', 'destination', 'visit', 'trip', 'tourist', 'attraction', 'hotel', 'restaurant', 'food', 'city', 'country', 'place']
            has_travel_content = any(kw in response_lower for kw in travel_keywords)
            
            # If response doesn't seem travel-related and similarity is low, return sorry
            if not has_travel_content and max_similarity < 0.15:
                return {
                    'response': "I'm sorry, but I couldn't find relevant information for your question in my knowledge base. Could you please provide more details? For example:\n\n- Which destination are you interested in?\n- What specific information are you looking for?\n- What would you like to know about travel?",
                    'retrieved_context_count': len(retrieved_rows),
                    'avg_similarity': avg_similarity,
                    'needs_clarification': True
                }
        
        # Clean up response: remove duplicate content and filter by topic
        # If query is about specific topic (attractions, food, etc.), extract only relevant parts
        query_lower = user_query.lower()
        
        # STRICT: For topic-specific queries, extract only the relevant section
        # Check if response is too long and contains multiple topics
        response_lower_check = response.lower()
        if len(response) > 1000 and ('singapore transportation' in response_lower_check or 'singapore budget' in response_lower_check or 'singapore is very safe' in response_lower_check):
            # This response contains multiple topics - extract only the relevant one
            if 'attraction' in query_lower or 'attractions' in query_lower or 'see' in query_lower or 'visit' in query_lower:
                # Extract only attractions section
                start_pos = response_lower_check.find('singapore attractions:')
                if start_pos == -1:
                    start_pos = response_lower_check.find('attractions:')
                
                if start_pos != -1:
                    # Find where next topic starts
                    end_pos = len(response)
                    next_topics = ['singapore transportation:', 'singapore transport:', 'singapore budget', 'singapore is very safe']
                    for topic in next_topics:
                        pos = response_lower_check.find(topic, start_pos + 100)
                        if pos != -1 and pos < end_pos:
                            end_pos = pos
                    
                    # Extract only attractions section
                    response = response[start_pos:end_pos].strip()
                    
                    # Remove any trailing content that mentions other topics
                    if 'singapore transportation' in response.lower():
                        response = response.split('Singapore transportation')[0].strip()
                    if 'singapore budget' in response.lower():
                        response = response.split('Singapore budget')[0].strip()
                    if 'singapore is very safe' in response.lower():
                        response = response.split('Singapore is very safe')[0].strip()
            
            elif 'food' in query_lower or 'restaurant' in query_lower or 'eat' in query_lower:
                # Extract only food section
                start_pos = response_lower_check.find('singapore food:')
                if start_pos == -1:
                    start_pos = response_lower_check.find('food:')
                
                if start_pos != -1:
                    end_pos = len(response)
                    next_topics = ['singapore transportation:', 'singapore transport:', 'singapore budget', 'singapore safe']
                    for topic in next_topics:
                        pos = response_lower_check.find(topic, start_pos + 100)
                        if pos != -1 and pos < end_pos:
                            end_pos = pos
                    response = response[start_pos:end_pos].strip()
            
            elif 'transport' in query_lower or 'get around' in query_lower:
                # Extract only transport section
                start_pos = response_lower_check.find('singapore transportation:')
                if start_pos == -1:
                    start_pos = response_lower_check.find('transportation:')
                
                if start_pos != -1:
                    end_pos = len(response)
                    next_topics = ['singapore budget', 'singapore safe', 'singapore attraction']
                    for topic in next_topics:
                        pos = response_lower_check.find(topic, start_pos + 100)
                        if pos != -1 and pos < end_pos:
                            end_pos = pos
                    response = response[start_pos:end_pos].strip()
        
        # Additional cleanup for duplicate content
        if has_specific_location and len(response) > 800:
                # Similar for transport queries
                response_lower = response.lower()
                start_marker = 'singapore transportation:'
                start_pos = response_lower.find(start_marker)
                if start_pos == -1:
                    start_pos = response_lower.find('transportation:')
                
                if start_pos != -1:
                    next_markers = ['singapore budget', 'singapore safe', 'singapore attraction']
                    end_pos = len(response)
                    for marker in next_markers:
                        pos = response_lower.find(marker, start_pos + 50)
                        if pos != -1 and pos < end_pos:
                            end_pos = pos
                    response = response[start_pos:end_pos].strip()
        
        # Additional cleanup for duplicate content
        if has_specific_location and len(response) > 800:
            # Detect query topic
            query_topic = None
            if 'attraction' in query_lower or 'attractions' in query_lower or 'see' in query_lower or 'visit' in query_lower:
                query_topic = 'attraction'
            elif 'food' in query_lower or 'restaurant' in query_lower or 'eat' in query_lower or 'dining' in query_lower:
                query_topic = 'food'
            elif 'transport' in query_lower or 'get around' in query_lower or 'metro' in query_lower:
                query_topic = 'transport'
            elif 'safe' in query_lower or 'safety' in query_lower:
                query_topic = 'safety'
            elif 'budget' in query_lower or 'cost' in query_lower or 'price' in query_lower:
                query_topic = 'budget'
            
            # If topic is specified, filter response to only relevant parts
            if query_topic:
                # Simple string-based extraction: find topic section and extract up to next topic
                location_name = None
                if query_locations['cities']:
                    location_name = query_locations['cities'][0]
                elif query_locations['countries']:
                    location_name = query_locations['countries'][0]
                
                # Find the start of our topic section
                topic_start_markers = {
                    'attraction': ['attractions:', 'attraction:'],
                    'food': ['food:', 'restaurant:', 'dining:'],
                    'transport': ['transportation:', 'transport:'],
                    'safety': ['safe', 'safety'],
                    'budget': ['budget']
                }
                
                # Find start position of our topic (case-insensitive search)
                start_pos = None
                response_lower = response.lower()
                markers = topic_start_markers.get(query_topic, [])
                
                for marker in markers:
                    search_patterns = []
                    if location_name:
                        # Try with location name (various capitalizations)
                        search_patterns.append(f"{location_name.lower()} {marker}")
                        search_patterns.append(f"{location_name.title()} {marker}")
                        search_patterns.append(f"{location_name.upper()} {marker}")
                    search_patterns.append(marker)  # Also try without location
                    
                    for pattern in search_patterns:
                        pos = response_lower.find(pattern.lower())
                        if pos != -1:
                            start_pos = pos
                            break
                    
                    if start_pos is not None:
                        break
                
                # Find end position (next topic or end of response)
                if start_pos is not None:
                    # Look for next topic markers
                    end_pos = len(response)
                    other_markers = []
                    for topic, topic_markers in topic_start_markers.items():
                        if topic != query_topic:
                            other_markers.extend(topic_markers)
                    
                    # Search for other topic markers after our start position
                    for marker in other_markers:
                        search_patterns = []
                        if location_name:
                            search_patterns.append(f"{location_name.lower()} {marker}")
                            search_patterns.append(f"{location_name.title()} {marker}")
                        search_patterns.append(marker)
                        
                        for pattern in search_patterns:
                            pos = response_lower.find(pattern.lower(), start_pos + 50)  # Start searching after our topic starts
                            if pos != -1 and pos < end_pos:
                                end_pos = pos
                                break
                    
                    # Extract only the relevant section
                    extracted = response[start_pos:end_pos].strip()
                    
                    # Additional cleanup: remove any lines that are clearly other topics
                    lines = extracted.split('\n')
                    cleaned_lines = []
                    for line in lines:
                        line_lower = line.lower().strip()
                        # Stop if we hit another topic header
                        is_other_topic = False
                        for marker in other_markers:
                            if marker in line_lower and len(line_lower) < 100:  # Short line with topic marker = header
                                is_other_topic = True
                                break
                        
                        if is_other_topic:
                            break
                        
                        cleaned_lines.append(line)
                    
                    response = '\n'.join(cleaned_lines).strip()
                    
                    # Final check: if response still contains other topics prominently, try to extract just the first paragraph
                    if len(response) > 1500:
                        # Split by double newlines and take first section
                        sections = response.split('\n\n')
                        if sections:
                            response = sections[0].strip()
                            # If first section is very short, include second if it's still about attractions
                            if len(response) < 300 and len(sections) > 1:
                                second_section = sections[1]
                                if 'attraction' in second_section.lower() and 'transportation' not in second_section.lower():
                                    response = (response + '\n\n' + second_section).strip()
        
        # Check if response contains repeated patterns (indicates duplicates in dataset)
        if len(response) > 1000:
            # Split by paragraphs (double newlines) or sentences
            paragraphs = response.split('\n\n')
            if len(paragraphs) > 1:
                # Check for duplicate paragraphs
                seen_paragraphs = set()
                unique_paragraphs = []
                for para in paragraphs:
                    para_clean = para.strip().lower()[:80]  # First 80 chars as signature
                    # Check if this paragraph is similar to any seen
                    is_duplicate = False
                    for seen in seen_paragraphs:
                        # If first 60 chars match, likely duplicate
                        if para_clean[:60] == seen[:60]:
                            is_duplicate = True
                            break
                    
                    if not is_duplicate:
                        seen_paragraphs.add(para_clean)
                        unique_paragraphs.append(para.strip())
                
                if len(unique_paragraphs) < len(paragraphs):
                    # Found duplicates, reconstruct response
                    response = '\n\n'.join(unique_paragraphs)
            
            # Also check for duplicate sentences within paragraphs
            if len(response) > 1500:
                sentences = response.replace('\n', ' ').split('. ')
                seen_sentences = set()
                unique_sentences = []
                for sentence in sentences:
                    sentence_clean = sentence.strip().lower()[:60]  # First 60 chars as signature
                    if sentence_clean not in seen_sentences and len(sentence.strip()) > 10:
                        seen_sentences.add(sentence_clean)
                        unique_sentences.append(sentence.strip())
                
                if len(unique_sentences) < len(sentences) * 0.7:  # If removed more than 30%, reconstruct
                    response = '. '.join(unique_sentences)
                    if not response.endswith('.'):
                        response += '.'
        
        # Only check for conflicts if no specific location was queried
        # (if location is specified, we've already filtered, so conflicts are less relevant)
        conflict_note = None
        if not has_specific_location:
            conflict_note = self._check_conflicts(retrieved_rows)
        
        if conflict_note:
            response = f"{conflict_note}\n\n{response}"
        
        # Format the response with proper indexing and bullet points
        response = self._format_response(response)
        
        return {
            'response': response,
            'retrieved_context_count': len(retrieved_rows),
            'avg_similarity': avg_similarity,
            'max_similarity': max_similarity,
            'min_similarity': min_similarity,
            'retrieved_rows': retrieved_rows,
            'needs_clarification': False
        }


# Global instance
_rai_service = None


def get_rai_service(csv_path: Optional[str] = None) -> DatasetOnlyChat:
    """
    Get or create the dataset-only chat service instance.
    
    Args:
        csv_path: Optional path to CSV file
    
    Returns:
        DatasetOnlyChat instance
    """
    global _rai_service
    if _rai_service is None:
        _rai_service = DatasetOnlyChat(csv_path=csv_path)
    return _rai_service


def reset_rai_service():
    """Reset the global service instance (useful for testing or reinitialization)."""
    global _rai_service
    _rai_service = None
