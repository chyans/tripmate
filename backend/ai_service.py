import os
import pickle
import pandas as pd
import numpy as np
import faiss
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class TravelAIService:
    def __init__(self):
        self.vectorizer = None
        self.index = None
        self.df = None
        self.model_dir = os.path.join(os.path.dirname(__file__), "travel_qa_model")
        try:
            self.load_or_initialize()
        except Exception as e:
            print(f"Error initializing AI service: {e}")
            import traceback
            traceback.print_exc()
    
    def load_or_initialize(self):
        """Load existing model components or initialize from CSV"""
        os.makedirs(self.model_dir, exist_ok=True)
        
        vectorizer_path = os.path.join(self.model_dir, "tfidf_vectorizer.pkl")
        faiss_index_path = os.path.join(self.model_dir, "faiss_index.bin")
        df_path = os.path.join(self.model_dir, "knowledge_base_df.csv")
        # Try multiple possible paths for the CSV file
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "..", "travel_QA (1).csv"),
            os.path.join(os.path.dirname(__file__), "..", "travel_QA.csv"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "travel_QA (1).csv"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "travel_QA.csv"),
        ]
        csv_source = None
        for path in possible_paths:
            if os.path.exists(path):
                csv_source = path
                break
        
        # Check if model components exist
        if (os.path.exists(vectorizer_path) and 
            os.path.exists(faiss_index_path) and 
            os.path.exists(df_path)):
            try:
                print("Loading existing model components...")
                self.load_components(vectorizer_path, faiss_index_path, df_path)
                print("Model components loaded successfully!")
                return
            except Exception as e:
                print(f"Error loading components: {e}. Reinitializing...")
        
        # Initialize from CSV
        if csv_source and os.path.exists(csv_source):
            print("Initializing model from CSV...")
            self.initialize_from_csv(csv_source)
            self.save_components(vectorizer_path, faiss_index_path, df_path)
            print("Model initialized and saved!")
        else:
            print(f"Warning: CSV file not found")
            print("AI chat will not work until the dataset is available.")
    
    def classify_question_type(self, text):
        """Classify the type of question being asked"""
        text_lower = text.lower()
        
        question_types = {
            'where': ['where', 'location', 'place', 'destination', 'go', 'visit', 'see'],
            'what': ['what', 'which', 'kind', 'type', 'things', 'activities', 'attractions'],
            'when': ['when', 'time', 'season', 'month', 'best time', 'weather'],
            'how': ['how', 'way', 'method', 'get', 'travel', 'reach', 'arrive'],
            'why': ['why', 'reason', 'because', 'should'],
            'recommendation': ['recommend', 'suggest', 'best', 'top', 'must', 'should visit', 'popular'],
            'cost': ['cost', 'price', 'expensive', 'cheap', 'budget', 'money', 'dollar', 'cost'],
            'food': ['food', 'eat', 'restaurant', 'cuisine', 'dish', 'meal', 'dining'],
            'culture': ['culture', 'tradition', 'custom', 'local', 'people', 'language'],
            'safety': ['safe', 'dangerous', 'security', 'crime', 'risk']
        }
        
        detected_types = []
        for q_type, keywords in question_types.items():
            if any(keyword in text_lower for keyword in keywords):
                detected_types.append(q_type)
        
        return detected_types if detected_types else ['general']
    
    def expand_query_synonyms(self, text):
        """Expand query with synonyms and related terms"""
        synonyms = {
            'go': ['visit', 'travel', 'explore', 'see', 'tour'],
            'place': ['location', 'destination', 'spot', 'site', 'attraction'],
            'best': ['top', 'popular', 'famous', 'must-see', 'recommended'],
            'things to do': ['activities', 'attractions', 'sights', 'experiences'],
            'where to go': ['places to visit', 'destinations', 'sights to see'],
            'food': ['cuisine', 'restaurant', 'dining', 'eat', 'meal'],
            'hotel': ['accommodation', 'stay', 'lodging', 'resort'],
            'weather': ['climate', 'temperature', 'season'],
            'cost': ['price', 'expensive', 'budget', 'money']
        }
        
        text_lower = text.lower()
        expanded_terms = [text]
        
        for term, syns in synonyms.items():
            if term in text_lower:
                for syn in syns:
                    expanded_text = text_lower.replace(term, syn)
                    if expanded_text != text_lower:
                        expanded_terms.append(expanded_text)
        
        return ' '.join(expanded_terms)
    
    def preprocess_text(self, text):
        """Clean and preprocess text for better matching"""
        if pd.isna(text):
            return ""
        
        text = str(text)
        # Convert to lowercase
        text = text.lower()
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep spaces and basic punctuation
        text = re.sub(r'[^\w\s.,!?;:-]', '', text)
        # Remove question words that don't add semantic meaning
        question_words = ['what', 'where', 'when', 'how', 'why', 'which', 'who', 'is', 'are', 'the', 'a', 'an']
        words = text.split()
        words = [w for w in words if w not in question_words or len(w) > 3]
        text = ' '.join(words)
        return text.strip()
    
    def extract_locations_from_text(self, text):
        """Extract potential location names from text"""
        # Common location patterns
        locations = set()
        text_lower = text.lower()
        
        # Common countries and major cities (expanded list)
        common_locations = [
            'jamaica', 'japan', 'tokyo', 'osaka', 'kyoto', 'hokkaido', 'hakuba', 'niseko',
            'australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide',
            'usa', 'united states', 'new york', 'los angeles', 'chicago', 'miami', 'san francisco',
            'england', 'london', 'paris', 'france', 'italy', 'rome', 'venice', 'spain', 'madrid', 'barcelona',
            'switzerland', 'zermatt', 'finland', 'lapland', 'norway', 'sweden',
            'thailand', 'bangkok', 'singapore', 'malaysia', 'indonesia', 'bali', 'jakarta', 'yogyakarta', 'bali', 'sumatra', 'java',
            'kingston', 'montego bay', 'negril', 'ocho rios', 'port antonio',
            'aspen', 'colorado', 'lake tahoe', 'california', 'nevada',
            'india', 'china', 'cambodia', 'myanmar', 'maldives', 'vietnam', 'philippines'
        ]
        
        for loc in common_locations:
            if loc in text_lower:
                locations.add(loc)
        
        # Extract capitalized words that might be locations
        capitalized = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b', text)
        for cap in capitalized:
            if len(cap.split()) <= 3:  # Likely a location name
                locations.add(cap.lower())
        
        # Also check for location names that appear multiple times (stronger signal)
        words = text_lower.split()
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        # If a location appears multiple times, it's definitely important
        for loc in common_locations:
            if word_counts.get(loc, 0) > 1:
                locations.add(loc)
        
        return locations
    
    def initialize_from_csv(self, csv_path):
        """Initialize the model from the CSV file with enhanced preprocessing"""
        print("Loading and preprocessing dataset...")
        # Load CSV
        df = pd.read_csv(csv_path)
        
        # Standardize column names
        df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
        
        # Remove duplicates
        initial_count = len(df)
        df = df.drop_duplicates()
        print(f"Removed {initial_count - len(df)} duplicate entries")
        
        # Clean and preprocess text
        print("Cleaning and preprocessing text...")
        df['question_cleaned'] = df['question'].apply(self.preprocess_text)
        df['response_cleaned'] = df['response'].apply(self.preprocess_text)
        
        # Extract locations from each entry for better matching
        print("Extracting location information...")
        df['locations'] = df.apply(
            lambda row: self.extract_locations_from_text(str(row.get('question', '')) + " " + str(row.get('response', ''))),
            axis=1
        )
        
        # Classify question types for each entry
        print("Classifying question types...")
        df['question_types'] = df['question'].apply(self.classify_question_type)
        
        # Add question type keywords to text content for better matching
        type_keywords_map = {
            'where': 'location place destination visit',
            'what': 'attraction activity thing experience',
            'when': 'time season month weather',
            'how': 'way method travel reach',
            'recommendation': 'recommend best top must popular',
            'cost': 'cost price budget money',
            'food': 'food restaurant cuisine dining',
            'culture': 'culture tradition custom local'
        }
        
        def add_type_keywords(row):
            types = row['question_types']
            keywords = ' '.join([type_keywords_map.get(t, '') for t in types if t in type_keywords_map])
            return row['question_cleaned'] + " " + row['response_cleaned'] + " " + keywords
        
        # Create enhanced text_content with multiple variations for better matching
        df['text_content'] = df.apply(add_type_keywords, axis=1)
        
        # Reset index and add kb_id
        df = df.reset_index().rename(columns={'index': 'kb_id'})
        
        self.df = df
        
        # Initialize and train TF-IDF Vectorizer with better parameters
        print("Training enhanced TF-IDF Vectorizer...")
        self.vectorizer = TfidfVectorizer(
            max_features=10000,  # Limit vocabulary size for efficiency
            ngram_range=(1, 3),  # Use unigrams, bigrams, and trigrams
            min_df=2,  # Ignore terms that appear in less than 2 documents
            max_df=0.95,  # Ignore terms that appear in more than 95% of documents
            stop_words='english',  # Remove common English stop words
            lowercase=True,
            strip_accents='unicode',
            analyzer='word'
        )
        
        text_embeddings = self.vectorizer.fit_transform(df['text_content']).toarray()
        print(f"Generated embeddings with shape: {text_embeddings.shape}")
        
        # Create FAISS index
        print("Building FAISS index...")
        embedding_dimension = text_embeddings.shape[1]
        self.index = faiss.IndexFlatL2(embedding_dimension)
        
        # Convert to float32 for FAISS
        text_embeddings = text_embeddings.astype('float32')
        self.index.add(text_embeddings)
        
        print(f"Model initialized with {len(df)} entries")
        print(f"Vocabulary size: {len(self.vectorizer.vocabulary_)}")
    
    def load_components(self, vectorizer_path, faiss_index_path, df_path):
        """Load existing model components"""
        with open(vectorizer_path, 'rb') as f:
            self.vectorizer = pickle.load(f)
        
        self.index = faiss.read_index(faiss_index_path)
        self.df = pd.read_csv(df_path)
        
        # Ensure locations column is properly loaded
        if 'locations' in self.df.columns:
            # Convert string representations back to sets
            def parse_locations(loc_str):
                if pd.isna(loc_str) or loc_str == '':
                    return set()
                if isinstance(loc_str, set):
                    return loc_str
                try:
                    if loc_str.startswith('{'):
                        return eval(loc_str)
                    return set(loc_str.split(',')) if ',' in str(loc_str) else {str(loc_str)}
                except:
                    return set()
            
            self.df['locations'] = self.df['locations'].apply(parse_locations)
        else:
            # Re-extract locations if not present
            print("Re-extracting locations from loaded data...")
            self.df['locations'] = self.df.apply(
                lambda row: self.extract_locations_from_text(
                    str(row.get('question', '')) + " " + str(row.get('response', ''))
                ),
                axis=1
            )
    
    def save_components(self, vectorizer_path, faiss_index_path, df_path):
        """Save model components to disk"""
        with open(vectorizer_path, 'wb') as f:
            pickle.dump(self.vectorizer, f)
        
        faiss.write_index(self.index, faiss_index_path)
        self.df.to_csv(df_path, index=False)
    
    def get_embeddings(self, texts):
        """Get embeddings for text(s)"""
        if self.vectorizer is None:
            return None
        
        if isinstance(texts, str):
            texts = [texts]
        
        return self.vectorizer.transform(texts).toarray().astype('float32')
    
    def search_knowledge_base(self, query, k=3):
        """Search the knowledge base for similar entries"""
        if self.index is None or self.vectorizer is None or self.df is None:
            return None, None
        
        # Generate embedding for query
        query_embedding = self.get_embeddings([query])
        
        if query_embedding is None:
            return None, None
        
        # Perform similarity search
        distances, indices = self.index.search(query_embedding, k)
        
        return indices[0], distances[0]
    
    def generate_answer(self, query, k=1):
        """Generate answer from knowledge base with enhanced matching"""
        if self.df is None:
            return "I'm sorry, the knowledge base is not available. Please ensure the travel dataset is properly configured."
        
        # Classify question type
        question_types = self.classify_question_type(query)
        
        # Preprocess query
        query_cleaned = self.preprocess_text(query)
        query_lower = query_cleaned.lower()
        
        # Expand query with synonyms for better matching
        expanded_query = self.expand_query_synonyms(query_cleaned)
        
        # Extract locations from query
        query_locations = self.extract_locations_from_text(query)
        
        # Search for similar entries - get many candidates
        num_candidates = min(k * 15, 100)  # Get more candidates for better matching
        retrieved_indices, distances = self.search_knowledge_base(query_cleaned, num_candidates)
        
        # Also search with expanded query for better coverage
        if expanded_query != query_cleaned:
            expanded_indices, expanded_distances = self.search_knowledge_base(expanded_query, num_candidates // 2)
            # Merge results, keeping unique indices
            all_indices = list(retrieved_indices)
            all_distances = list(distances)
            for idx, dist in zip(expanded_indices, expanded_distances):
                if idx not in all_indices:
                    all_indices.append(idx)
                    all_distances.append(dist)
            retrieved_indices = np.array(all_indices[:num_candidates])
            distances = np.array(all_distances[:num_candidates])
        
        if retrieved_indices is None or len(retrieved_indices) == 0:
            return "I couldn't find a relevant answer in my knowledge base. Could you try rephrasing your question?"
        
        # Enhanced scoring with multiple factors
        scored_results = []
        query_words = set(query_lower.split())
        
        for i, idx in enumerate(retrieved_indices):
            row = self.df.iloc[idx]
            question_text = str(row.get('question_cleaned', row.get('question', ''))).lower()
            response_text = str(row.get('response_cleaned', row.get('response', ''))).lower()
            combined_text = question_text + " " + response_text
            
            # Get stored locations for this entry
            entry_locations = row.get('locations', set())
            if isinstance(entry_locations, str):
                try:
                    entry_locations = eval(entry_locations) if entry_locations.startswith('{') else set()
                except:
                    entry_locations = set()
            
            distance = distances[i] if i < len(distances) else 1000
            
            # Calculate multiple relevance scores
            scores = {
                'semantic_distance': distance,
                'location_match': 0,
                'location_penalty': 0,
                'keyword_overlap': 0,
                'question_similarity': 0
            }
            
            # 1. Location matching (most important for location-specific queries)
            if query_locations:
                # Check if entry mentions query locations
                for q_loc in query_locations:
                    q_loc_lower = q_loc.lower()
                    # Check both in text and in stored locations
                    mentions_location = (q_loc_lower in combined_text or 
                                       q_loc_lower in entry_locations or
                                       any(q_loc_lower in str(loc).lower() for loc in entry_locations))
                    
                    if mentions_location:
                        scores['location_match'] += 30  # Very strong boost
                    else:
                        scores['location_penalty'] += 20  # Very strong penalty
                
                # Extra boost if location appears multiple times in query (user really wants this location)
                location_count_in_query = sum(1 for loc in query_locations if loc.lower() in query_lower)
                if location_count_in_query > 1:
                    scores['location_match'] += 15  # Extra boost for repeated mentions
                
                # Extra penalty if entry mentions different locations (especially if query has specific locations)
                entry_locations_lower = {loc.lower() for loc in entry_locations}
                query_locations_lower = {loc.lower() for loc in query_locations}
                different_locations = entry_locations_lower - query_locations_lower
                
                # If entry mentions locations NOT in query, heavily penalize
                if different_locations:
                    # Count how many query locations are mentioned vs different locations
                    matching_locs = len(entry_locations_lower & query_locations_lower)
                    different_locs_count = len(different_locations)
                    
                    # If more different locations than matching, heavy penalty
                    if different_locs_count > matching_locs:
                        scores['location_penalty'] += 15
                    elif different_locs_count > 0:
                        scores['location_penalty'] += 8
            
            # 2. Keyword overlap (weighted by importance)
            entry_words = set(combined_text.split())
            overlap = len(query_words.intersection(entry_words))
            # Weight important words more (longer words, location names, etc.)
            important_words = {w for w in query_words if len(w) > 4 or w in query_locations}
            important_overlap = len(important_words.intersection(entry_words))
            scores['keyword_overlap'] = overlap * 0.5 + important_overlap * 1.5
            
            # 3. Question similarity (boost if question matches well)
            question_words = set(question_text.split())
            question_overlap = len(query_words.intersection(question_words))
            scores['question_similarity'] = question_overlap * 3  # Questions are very important
            
            # 4. Question type matching (boost if answer type matches question type)
            entry_lower = combined_text.lower()
            type_keywords = {
                'where': ['location', 'place', 'destination', 'visit', 'go', 'see'],
                'what': ['attraction', 'activity', 'thing', 'experience', 'sight'],
                'when': ['time', 'season', 'month', 'weather', 'best time'],
                'how': ['way', 'method', 'get', 'travel', 'reach', 'arrive'],
                'cost': ['cost', 'price', 'expensive', 'cheap', 'budget', 'dollar'],
                'food': ['food', 'restaurant', 'cuisine', 'dish', 'eat', 'dining'],
                'recommendation': ['recommend', 'best', 'top', 'must', 'popular', 'famous']
            }
            
            type_match_score = 0
            for q_type in question_types:
                if q_type in type_keywords:
                    type_keyword_count = sum(1 for keyword in type_keywords[q_type] if keyword in entry_lower)
                    type_match_score += type_keyword_count * 2
            
            scores['question_type_match'] = type_match_score
            
            # Calculate final score (lower is better)
            final_score = (
                scores['semantic_distance'] * 1.0 -  # Base semantic similarity
                scores['location_match'] +  # Boost for location matches
                scores['location_penalty'] -  # Penalty for wrong locations
                scores['keyword_overlap'] -  # Boost for keyword matches
                scores['question_similarity'] -  # Boost for question similarity
                scores.get('question_type_match', 0)  # Boost for question type match
            )
            
            scored_results.append({
                'idx': idx,
                'score': final_score,
                'scores': scores,
                'text': combined_text,
                'locations': entry_locations
            })
        
        # Sort by score (lower is better)
        scored_results.sort(key=lambda x: x['score'])
        
        # Get top k results (but ensure we have good matches)
        # Filter out very poor matches first
        good_results = [r for r in scored_results if r['score'] < 1000]  # Reasonable threshold
        if not good_results:
            good_results = scored_results[:10]  # Fallback to top 10
        
        top_results = good_results[:max(k, 5)]  # Get more results for better selection
        
        # If query mentions locations, prioritize results that mention them AND exclude other locations
        if query_locations:
            # Create a set of query location keywords (including variations)
            query_location_keywords = set()
            for loc in query_locations:
                loc_lower = loc.lower()
                query_location_keywords.add(loc_lower)
                # Add country name if it's a city
                if loc_lower in ['jakarta', 'bali', 'yogyakarta', 'bandung', 'surabaya', 'medan', 'semarang', 'makassar', 'palembang', 'denpasar']:
                    query_location_keywords.add('indonesia')
                if loc_lower == 'indonesia':
                    query_location_keywords.add('indonesian')
            
            # Countries/regions to exclude (unless they're in query)
            excluded_regions = {
                'india', 'indian', 'taj mahal', 'agra',
                'china', 'chinese', 'great wall',
                'cambodia', 'cambodian', 'angkor wat', 'siem reap',
                'myanmar', 'burmese', 'bagan',
                'maldives', 'maldivian',
                'thailand', 'thai', 'bangkok',
                'vietnam', 'vietnamese',
                'philippines', 'filipino',
                'japan', 'japanese', 'tokyo',
                'asia', 'asian'
            }
            
            # Remove query locations from excluded regions
            for query_keyword in query_location_keywords:
                excluded_regions.discard(query_keyword)
            
            # Find location matches that DON'T mention excluded regions
            location_matches = []
            for r in top_results:
                entry_text_lower = r['text'].lower()
                entry_locs = {str(loc).lower() for loc in r.get('locations', set())}
                
                # Check if entry mentions query location
                mentions_query_location = any(
                    query_keyword in entry_text_lower or query_keyword in entry_locs
                    for query_keyword in query_location_keywords
                )
                
                # Check if entry mentions excluded regions
                mentions_excluded = any(excluded in entry_text_lower or excluded in entry_locs for excluded in excluded_regions)
                
                if mentions_query_location and not mentions_excluded:
                    location_matches.append(r)
            
            if location_matches:
                # Use the best location match that doesn't mention excluded regions
                best_result = location_matches[0]
                answer = self.df.iloc[best_result['idx']]['response']
            else:
                # No clean location match, search more aggressively
                for result in scored_results:
                    entry_text_lower = result['text'].lower()
                    entry_locs = {str(loc).lower() for loc in result.get('locations', set())}
                    
                    mentions_query_location = any(
                        query_keyword in entry_text_lower or query_keyword in entry_locs
                        for query_keyword in query_location_keywords
                    )
                    mentions_excluded = any(excluded in entry_text_lower or excluded in entry_locs for excluded in excluded_regions)
                    
                    if mentions_query_location and not mentions_excluded:
                        answer = self.df.iloc[result['idx']]['response']
                        break
                else:
                    # Fallback: use best match even if it mentions other locations, but prefer ones with query location
                    for result in top_results:
                        entry_text_lower = result['text'].lower()
                        if any(query_keyword in entry_text_lower for query_keyword in query_location_keywords):
                            answer = self.df.iloc[result['idx']]['response']
                            break
                    else:
                        # Last resort: use best semantic match
                        answer = self.df.iloc[top_results[0]['idx']]['response']
        else:
            # No specific location mentioned, prioritize by question type
            type_keywords = {
                'where': ['location', 'place', 'destination', 'visit', 'go', 'see'],
                'what': ['attraction', 'activity', 'thing', 'experience', 'sight'],
                'when': ['time', 'season', 'month', 'weather', 'best time'],
                'how': ['way', 'method', 'get', 'travel', 'reach', 'arrive'],
                'cost': ['cost', 'price', 'expensive', 'cheap', 'budget', 'dollar'],
                'food': ['food', 'restaurant', 'cuisine', 'dish', 'eat', 'dining'],
                'recommendation': ['recommend', 'best', 'top', 'must', 'popular', 'famous']
            }
            
            best_match = None
            for result in top_results:
                entry_text_lower = result['text'].lower()
                # Check if answer matches question type
                type_match = any(
                    q_type in type_keywords and any(kw in entry_text_lower for kw in type_keywords[q_type])
                    for q_type in question_types
                )
                if type_match:
                    best_match = result
                    break
            
            if best_match:
                answer = self.df.iloc[best_match['idx']]['response']
            else:
                # Use best semantic match
                answer = self.df.iloc[top_results[0]['idx']]['response']
        
        # Post-process answer to ensure it's relevant
        answer_lower = answer.lower()
        type_keywords = {
            'where': ['location', 'place', 'destination', 'visit', 'go', 'see'],
            'what': ['attraction', 'activity', 'thing', 'experience', 'sight'],
            'when': ['time', 'season', 'month', 'weather', 'best time'],
            'how': ['way', 'method', 'get', 'travel', 'reach', 'arrive'],
            'cost': ['cost', 'price', 'expensive', 'cheap', 'budget', 'dollar'],
            'food': ['food', 'restaurant', 'cuisine', 'dish', 'eat', 'dining'],
            'recommendation': ['recommend', 'best', 'top', 'must', 'popular', 'famous']
        }
        
        # If answer doesn't seem relevant to question type, try to find better match
        if question_types and question_types != ['general']:
            type_relevant = any(
                q_type in type_keywords and any(kw in answer_lower for kw in type_keywords[q_type])
                for q_type in question_types
            )
            
            if not type_relevant and len(scored_results) > 1:
                # Try next best matches
                for result in scored_results[1:min(10, len(scored_results))]:
                    candidate_answer = self.df.iloc[result['idx']]['response']
                    candidate_lower = candidate_answer.lower()
                    if any(
                        q_type in type_keywords and any(kw in candidate_lower for kw in type_keywords[q_type])
                        for q_type in question_types
                    ):
                        answer = candidate_answer
                        break
        
        return answer

# Global instance
_ai_service = None

def get_ai_service():
    """Get or create the AI service instance"""
    global _ai_service
    if _ai_service is None:
        _ai_service = TravelAIService()
    return _ai_service

