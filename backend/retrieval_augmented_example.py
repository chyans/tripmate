"""
Example: Retrieval-Augmented AI Chat Integration
Demonstrates how to use TravelRetriever with an LLM API (OpenAI, Anthropic, etc.)
"""

import os
from travel_retriever import TravelRetriever, create_retriever


def chat_with_retrieval_augmented_ai(user_query: str, csv_path: str = None, use_openai: bool = True):
    """
    Complete example of retrieval-augmented chat flow.
    
    This function:
    1. Retrieves relevant context using TF-IDF
    2. Formats context for AI
    3. Calls LLM API with retrieved context
    4. Returns AI response
    
    Args:
        user_query: User's travel question
        csv_path: Optional path to CSV file
        use_openai: Whether to use OpenAI API (requires OPENAI_API_KEY env var)
    
    Returns:
        Dictionary with response and metadata
    """
    # Initialize retriever
    retriever = create_retriever(csv_path)
    
    # Retrieve top 6 most relevant rows (5-8 range)
    retrieved_rows = retriever.retrieve(user_query, top_k=6)
    
    # Check if we have sufficient context
    if not retrieved_rows:
        return {
            'response': "I couldn't find relevant information in my knowledge base. Could you try rephrasing your question?",
            'retrieved_context_count': 0,
            'needs_clarification': True
        }
    
    # Check if similarity scores are too low (insufficient context)
    avg_similarity = sum(row['similarity_score'] for row in retrieved_rows) / len(retrieved_rows)
    if avg_similarity < 0.1:  # Threshold for insufficient context
        return {
            'response': "I found some information, but it may not fully answer your question. Could you provide more details about what you're looking for?",
            'retrieved_context_count': len(retrieved_rows),
            'avg_similarity': avg_similarity,
            'needs_clarification': True
        }
    
    # Build AI prompt with retrieved context
    prompt = retriever.build_ai_prompt(user_query, retrieved_rows)
    
    # Call LLM API (OpenAI example)
    if use_openai:
        try:
            import openai
            
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                return {
                    'response': "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.",
                    'retrieved_context_count': len(retrieved_rows),
                    'prompt': prompt,
                    'error': 'missing_api_key'
                }
            
            client = openai.OpenAI(api_key=api_key)
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": retriever.SYSTEM_PROMPT},
                    {"role": "user", "content": f"{retriever.format_context_for_ai(retrieved_rows)}\n\nUser Query: {user_query}\n\nAnswer:"}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content
            
            return {
                'response': ai_response,
                'retrieved_context_count': len(retrieved_rows),
                'avg_similarity': avg_similarity,
                'retrieved_rows': retrieved_rows,
                'needs_clarification': False
            }
            
        except ImportError:
            return {
                'response': "OpenAI library not installed. Install with: pip install openai",
                'retrieved_context_count': len(retrieved_rows),
                'prompt': prompt,
                'error': 'library_not_installed'
            }
        except Exception as e:
            return {
                'response': f"Error calling OpenAI API: {str(e)}",
                'retrieved_context_count': len(retrieved_rows),
                'prompt': prompt,
                'error': str(e)
            }
    else:
        # Return formatted prompt for manual LLM call or other providers
        return {
            'response': None,
            'retrieved_context_count': len(retrieved_rows),
            'prompt': prompt,
            'retrieved_rows': retrieved_rows,
            'instruction': 'Use the prompt above with your preferred LLM API'
        }


def example_usage():
    """Example usage of the retrieval-augmented chat."""
    
    queries = [
        "What are the best winter destinations for skiing?",
        "Suggest family-friendly beach destinations in Asia",
        "What activities can I do in Australia?",
        "Recommend hotels in Japan for solo travelers"
    ]
    
    print("=" * 80)
    print("TripMate Retrieval-Augmented AI Chat - Examples")
    print("=" * 80)
    
    for query in queries:
        print(f"\n{'='*80}")
        print(f"Query: {query}")
        print(f"{'='*80}\n")
        
        result = chat_with_retrieval_augmented_ai(query, use_openai=False)  # Set to True if you have OpenAI API key
        
        print(f"Retrieved {result['retrieved_context_count']} relevant contexts")
        
        if result.get('prompt'):
            print("\n--- Complete Prompt for LLM ---")
            print(result['prompt'])
            print("\n" + "-" * 80)
        
        if result.get('response'):
            print("\n--- AI Response ---")
            print(result['response'])
        
        print("\n")


if __name__ == "__main__":
    example_usage()

