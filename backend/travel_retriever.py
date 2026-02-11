"""
TripMate Travel QA Retrieval System
Uses TF-IDF retrieval to find relevant travel information from CSV dataset.
"""

import os
import re
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple, Optional


class TravelRetriever:
    """
    TF-IDF based retriever for travel QA dataset.
    Retrieves top-k most relevant rows based on cosine similarity.
    """
    
    SYSTEM_PROMPT = """You are TripMate's travel assistant.
You must answer using only the Retrieved Travel QA Context.
Do not guess or hallucinate.
If important information is missing, ask 1–2 short clarifying questions.
When giving recommendations, give 3–6 options with clear reasons.
When giving itineraries, provide day-by-day plans.
If multiple contexts conflict, point it out."""

    def __init__(self, csv_path: str):
        """
        Initialize the retriever with CSV dataset.
        
        Args:
            csv_path: Path to travel_QA CSV file
        """
        self.csv_path = csv_path
        self.df = None
        self.vectorizer = None
        self.document_vectors = None
        self._load_and_prepare_data()
        self._build_index()

    def _normalize_text(self, text: str) -> str:
        """Normalize text: lowercase, cleanup whitespace."""
        if pd.isna(text):
            return ""
        text = str(text)
        text = text.lower()
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def _extract_country(self, question: str, response: str) -> str:
        """Extract country from question/response text."""
        text = (question + " " + response).lower()
        
        countries = {
            'usa': ['usa', 'united states', 'america', 'us', 'u.s.', 'colorado', 'california', 'nevada', 'arizona', 'new york', 'los angeles'],
            'switzerland': ['switzerland', 'swiss', 'zermatt'],
            'finland': ['finland', 'finnish', 'lapland'],
            'japan': ['japan', 'japanese', 'tokyo', 'kyoto', 'osaka', 'niseko', 'hakuba', 'hokkaido', 'kamakura', 'kanazawa', 'nara'],
            'australia': ['australia', 'australian', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'queensland', 'victoria', 'tasmania'],
            'indonesia': ['indonesia', 'indonesian', 'bali', 'jakarta', 'yogyakarta', 'bandung', 'surabaya', 'sumatra', 'java'],
            'thailand': ['thailand', 'thai', 'bangkok', 'phuket'],
            'malaysia': ['malaysia', 'malaysian', 'langkawi'],
            'maldives': ['maldives', 'maldivian'],
            'india': ['india', 'indian', 'andaman', 'nicobar'],
            'vietnam': ['vietnam', 'vietnamese', 'da nang', 'ho chi minh'],
            'italy': ['italy', 'italian', 'rome', 'venice', 'amalfi', 'positano'],
            'france': ['france', 'french', 'paris'],
            'spain': ['spain', 'spanish', 'madrid', 'barcelona'],
            'iceland': ['iceland', 'icelandic'],
            'canada': ['canada', 'canadian', 'banff'],
            'chile': ['chile', 'chilean', 'patagonia'],
            'argentina': ['argentina', 'argentinian', 'patagonia'],
            'new zealand': ['new zealand', 'zealand', 'queenstown', 'fiordland'],
            'philippines': ['philippines', 'filipino']
        }
        
        for country, keywords in countries.items():
            if any(keyword in text for keyword in keywords):
                return country
        return ""

    def _extract_city(self, question: str, response: str) -> str:
        """Extract city from question/response text."""
        text = (question + " " + response).lower()
        
        cities = [
            'aspen', 'lake tahoe', 'zermatt', 'lapland', 'niseko', 'sydney', 'melbourne',
            'brisbane', 'perth', 'adelaide', 'bali', 'jakarta', 'yogyakarta', 'bandung',
            'tokyo', 'kyoto', 'osaka', 'bangkok', 'phuket', 'langkawi', 'da nang',
            'rome', 'venice', 'paris', 'madrid', 'barcelona', 'banff', 'sedona',
            'positano', 'queenstown', 'kamakura', 'kanazawa', 'nara'
        ]
        
        for city in cities:
            if city in text:
                return city.title()
        return ""

    def _extract_tags(self, question: str, response: str) -> str:
        """Extract tags/keywords from question/response."""
        text = (question + " " + response).lower()
        tags = []
        
        tag_keywords = {
            'winter': ['winter', 'snow', 'skiing', 'snowboarding', 'cold', 'cozy', 'snowy', 'ice', 'frost'],
            'summer': ['summer', 'beach', 'sunny', 'hot', 'swimming', 'tropical', 'warm weather'],
            'spring': ['spring', 'bloom', 'cherry', 'flowers', 'mild'],
            'fall': ['fall', 'autumn', 'leaves', 'harvest'],
            'adventure': ['adventure', 'hiking', 'trekking', 'outdoor', 'activities', 'extreme', 'thrilling'],
            'culture': ['culture', 'temple', 'museum', 'historic', 'traditional', 'heritage', 'art', 'architecture'],
            'beach': ['beach', 'coastal', 'ocean', 'surfing', 'snorkeling', 'diving', 'seaside', 'shore'],
            'family': ['family', 'family-friendly', 'kids', 'children', 'family vacation'],
            'solo': ['solo', 'peaceful', 'mindfulness', 'serene', 'alone', 'solo travel'],
            'couple': ['couple', 'romantic', 'honeymoon', 'romance', 'couples'],
            'luxury': ['luxury', 'resort', 'spa', 'premium', '5-star', 'upscale', 'high-end'],
            'budget': ['budget', 'cheap', 'affordable', 'economy', 'low-cost', 'inexpensive'],
            'food': ['food', 'restaurant', 'cuisine', 'dining', 'eat', 'culinary', 'gastronomy', 'local food'],
            'nature': ['nature', 'national park', 'wildlife', 'forest', 'mountain', 'jungle', 'rainforest'],
            'nightlife': ['nightlife', 'bars', 'clubs', 'entertainment', 'party'],
            'shopping': ['shopping', 'markets', 'malls', 'souvenirs', 'boutiques'],
            'wellness': ['wellness', 'spa', 'yoga', 'meditation', 'retreat', 'relaxation'],
            'photography': ['photography', 'scenic', 'views', 'landscape', 'picturesque']
        }
        
        for tag, keywords in tag_keywords.items():
            if any(keyword in text for keyword in keywords):
                tags.append(tag)
        
        return ", ".join(tags[:7])  # Increased to 7 tags for better matching

    def _extract_season(self, question: str, response: str) -> str:
        """Extract season from question/response."""
        text = (question + " " + response).lower()
        
        if any(word in text for word in ['winter', 'snow', 'skiing', 'cold']):
            return 'winter'
        elif any(word in text for word in ['summer', 'beach', 'hot', 'sunny']):
            return 'summer'
        elif any(word in text for word in ['spring', 'bloom', 'cherry']):
            return 'spring'
        elif any(word in text for word in ['fall', 'autumn', 'leaves']):
            return 'fall'
        return ""

    def _extract_traveler_type(self, question: str, response: str) -> str:
        """Extract traveler type from question/response."""
        text = (question + " " + response).lower()
        
        if any(word in text for word in ['family', 'kids', 'children', 'family-friendly']):
            return 'family'
        elif any(word in text for word in ['solo', 'alone', 'single']):
            return 'solo'
        elif any(word in text for word in ['couple', 'romantic', 'honeymoon']):
            return 'couple'
        elif any(word in text for word in ['group', 'friends', 'together']):
            return 'group'
        return ""

    def _load_and_prepare_data(self):
        """Load CSV and expand with additional columns."""
        print(f"Loading dataset from {self.csv_path}...")
        self.df = pd.read_csv(self.csv_path)
        
        # Standardize column names
        self.df.columns = [col.strip().lower().replace(' ', '_') for col in self.df.columns]
        
        # Remove duplicates
        initial_count = len(self.df)
        self.df = self.df.drop_duplicates()
        print(f"Loaded {len(self.df)} entries (removed {initial_count - len(self.df)} duplicates)")
        
        # Expand dataset with new columns
        print("Expanding dataset with metadata columns...")
        self.df['country'] = self.df.apply(
            lambda row: self._extract_country(str(row.get('question', '')), str(row.get('response', ''))),
            axis=1
        )
        self.df['city'] = self.df.apply(
            lambda row: self._extract_city(str(row.get('question', '')), str(row.get('response', ''))),
            axis=1
        )
        self.df['tags'] = self.df.apply(
            lambda row: self._extract_tags(str(row.get('question', '')), str(row.get('response', ''))),
            axis=1
        )
        self.df['season'] = self.df.apply(
            lambda row: self._extract_season(str(row.get('question', '')), str(row.get('response', ''))),
            axis=1
        )
        self.df['traveler_type'] = self.df.apply(
            lambda row: self._extract_traveler_type(str(row.get('question', '')), str(row.get('response', ''))),
            axis=1
        )
        
        # Normalize text fields
        print("Normalizing text fields...")
        self.df['question_normalized'] = self.df['question'].apply(self._normalize_text)
        self.df['response_normalized'] = self.df['response'].apply(self._normalize_text)
        
        # Extract question type for better matching
        def extract_question_type(q_text):
            """Extract question type to improve matching."""
            q_lower = str(q_text).lower()
            if any(kw in q_lower for kw in ['where', 'location', 'place', 'destination']):
                return 'where'
            elif any(kw in q_lower for kw in ['what', 'which', 'activities', 'attractions', 'things to do']):
                return 'what'
            elif any(kw in q_lower for kw in ['when', 'time', 'season', 'best time', 'weather']):
                return 'when'
            elif any(kw in q_lower for kw in ['how', 'way', 'method', 'get to', 'travel']):
                return 'how'
            elif any(kw in q_lower for kw in ['recommend', 'suggest', 'best', 'top']):
                return 'recommendation'
            elif any(kw in q_lower for kw in ['cost', 'price', 'budget', 'expensive', 'cheap']):
                return 'cost'
            elif any(kw in q_lower for kw in ['hotel', 'accommodation', 'stay', 'lodging']):
                return 'accommodation'
            elif any(kw in q_lower for kw in ['food', 'restaurant', 'cuisine', 'eat', 'dining']):
                return 'food'
            return 'general'
        
        self.df['question_type'] = self.df['question'].apply(extract_question_type)
        
        # Create combined searchable document per row (enhanced with question type)
        def create_searchable_doc(row):
            parts = [
                str(row.get('question', '')),
                str(row.get('response', '')),
                str(row.get('country', '')),
                str(row.get('city', '')),
                str(row.get('tags', '')),
                str(row.get('season', '')),
                str(row.get('traveler_type', '')),
                str(row.get('question_type', ''))  # Add question type for better matching
            ]
            combined = " ".join(parts)
            return self._normalize_text(combined)
        
        self.df['searchable_document'] = self.df.apply(create_searchable_doc, axis=1)
        
        print(f"Dataset prepared with {len(self.df)} entries")

    def _build_index(self):
        """Build TF-IDF index from searchable documents."""
        print("Building TF-IDF index...")
        
        self.vectorizer = TfidfVectorizer(
            max_features=10000,
            ngram_range=(1, 2),  # Unigrams and bigrams
            min_df=2,  # Ignore terms in < 2 documents
            max_df=0.95,  # Ignore terms in > 95% documents
            stop_words='english',
            lowercase=True,
            strip_accents='unicode'
        )
        
        # Fit and transform documents
        documents = self.df['searchable_document'].tolist()
        self.document_vectors = self.vectorizer.fit_transform(documents)
        
        print(f"TF-IDF index built with vocabulary size: {len(self.vectorizer.vocabulary_)}")

    def retrieve(self, query: str, top_k: int = 6) -> List[Dict]:
        """
        Retrieve top-k most relevant rows using TF-IDF cosine similarity.
        
        Args:
            query: User query string
            top_k: Number of results to retrieve (default 6, range 5-8)
        
        Returns:
            List of dictionaries containing retrieved rows with similarity scores
        """
        if self.vectorizer is None or self.document_vectors is None:
            return []
        
        # Normalize query
        query_normalized = self._normalize_text(query)
        
        # Vectorize query
        query_vector = self.vectorizer.transform([query_normalized])
        
        # Compute cosine similarity
        similarities = cosine_similarity(query_vector, self.document_vectors)[0]
        
        # Get top-k indices
        top_k = max(5, min(25, top_k))  # Ensure between 5-25
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        # Build results
        results = []
        for idx in top_indices:
            row = self.df.iloc[idx]
            results.append({
                'question': str(row.get('question', '')),
                'response': str(row.get('response', '')),
                'country': str(row.get('country', '')),
                'city': str(row.get('city', '')),
                'tags': str(row.get('tags', '')),
                'season': str(row.get('season', '')),
                'traveler_type': str(row.get('traveler_type', '')),
                'question_type': str(row.get('question_type', '')),  # Include question type
                'similarity_score': float(similarities[idx])
            })
        
        return results

    def format_context_for_ai(self, retrieved_rows: List[Dict]) -> str:
        """
        Format retrieved rows into context string for AI prompt.
        
        Args:
            retrieved_rows: List of retrieved row dictionaries
        
        Returns:
            Formatted context string
        """
        if not retrieved_rows:
            return "No relevant context found."
        
        context_parts = ["Retrieved Travel QA Context:\n"]
        
        for i, row in enumerate(retrieved_rows, 1):
            context_parts.append(f"\n--- Context {i} (Relevance: {row['similarity_score']:.3f}) ---")
            context_parts.append(f"Question: {row['question']}")
            context_parts.append(f"Response: {row['response']}")
            
            metadata = []
            if row.get('country'):
                metadata.append(f"Country: {row['country']}")
            if row.get('city'):
                metadata.append(f"City: {row['city']}")
            if row.get('tags'):
                metadata.append(f"Tags: {row['tags']}")
            if row.get('season'):
                metadata.append(f"Season: {row['season']}")
            if row.get('traveler_type'):
                metadata.append(f"Traveler Type: {row['traveler_type']}")
            
            if metadata:
                context_parts.append(" | ".join(metadata))
        
        return "\n".join(context_parts)

    def build_ai_prompt(self, user_query: str, retrieved_rows: List[Dict]) -> str:
        """
        Build complete AI prompt with system prompt, context, and user query.
        
        Args:
            user_query: User's question
            retrieved_rows: Retrieved context rows
        
        Returns:
            Complete prompt string
        """
        context = self.format_context_for_ai(retrieved_rows)
        
        prompt = f"""{self.SYSTEM_PROMPT}

{context}

User Query: {user_query}

Answer:"""
        
        return prompt


def create_retriever(csv_path: Optional[str] = None) -> TravelRetriever:
    """
    Factory function to create TravelRetriever instance.
    Tries multiple possible CSV paths.
    
    Args:
        csv_path: Optional path to CSV file
    
    Returns:
        TravelRetriever instance
    """
    if csv_path and os.path.exists(csv_path):
        return TravelRetriever(csv_path)
    
    # Try common paths
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "travel_QA (1).csv"),
        os.path.join(os.path.dirname(__file__), "travel_QA (1).csv"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "travel_QA (1).csv"),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return TravelRetriever(path)
    
    raise FileNotFoundError(f"Could not find travel_QA CSV file. Tried: {possible_paths}")


# Example usage function
def example_retrieval_augmented_chat(user_query: str, csv_path: Optional[str] = None):
    """
    Example function demonstrating retrieval-augmented chat flow.
    
    This shows how to:
    1. Load the dataset
    2. Retrieve relevant context
    3. Format context for AI
    4. Build complete prompt
    
    Args:
        user_query: User's travel question
        csv_path: Optional path to CSV file
    
    Returns:
        Dictionary with retrieved context and formatted prompt
    """
    # Initialize retriever
    retriever = create_retriever(csv_path)
    
    # Retrieve top 6 most relevant rows
    retrieved_rows = retriever.retrieve(user_query, top_k=6)
    
    # Format context for AI
    context = retriever.format_context_for_ai(retrieved_rows)
    
    # Build complete prompt
    prompt = retriever.build_ai_prompt(user_query, retrieved_rows)
    
    return {
        'retrieved_rows': retrieved_rows,
        'context': context,
        'prompt': prompt,
        'num_results': len(retrieved_rows)
    }


if __name__ == "__main__":
    # Example usage
    import sys
    import io
    
    # Set UTF-8 encoding for Windows console
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    example_query = "What are the best winter destinations for skiing?"
    
    print("=" * 80)
    print("TripMate Travel QA Retrieval System - Example")
    print("=" * 80)
    print(f"\nUser Query: {example_query}\n")
    
    result = example_retrieval_augmented_chat(example_query)
    
    print(f"\nRetrieved {result['num_results']} relevant contexts\n")
    print("=" * 80)
    print("FORMATTED CONTEXT FOR AI:")
    print("=" * 80)
    try:
        print(result['context'])
    except UnicodeEncodeError:
        print(result['context'].encode('utf-8', errors='replace').decode('utf-8', errors='replace'))
    print("\n" + "=" * 80)
    print("COMPLETE AI PROMPT:")
    print("=" * 80)
    try:
        print(result['prompt'])
    except UnicodeEncodeError:
        print(result['prompt'].encode('utf-8', errors='replace').decode('utf-8', errors='replace'))

