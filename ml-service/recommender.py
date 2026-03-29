import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any

def recommend_next_reel(
    reels: List[Dict[str, Any]],
    current_emotion: str,
    mood_goal: str,
    history_ids: List[int],
    liked_ids: List[int]
) -> int:
    """
    Content-Based ML Recommender for Emotional Reels.
    Uses TF-IDF Vectorization & Cosine Similarity to find the best next video.
    """
    if not reels:
        return 1
    
    # Filter out recent history
    history_set = set(history_ids[-5:]) # don't repeat last 5
    candidate_reels = [r for r in reels if r.get("id") not in history_set]
    
    # Fallback if somehow history covers all reels
    if not candidate_reels:
        candidate_reels = reels
        
    # Build text corpus for reels
    # Features: Title, Description, Emotion Tag
    corpus = []
    for r in candidate_reels:
        text = f"{r.get('title', '')} {r.get('desc', '')} {r.get('tag', '')} {r.get('tag', '')}"
        corpus.append(text.lower())
        
    # Build user query text
    # 1. Start with mood goal keywords
    query_parts = []
    
    goal_keywords = {
        "happy": "happy joy laugh funny celebrate upbeat positive",
        "calm": "calm relax peace rain nature ASMR soothing quiet",
        "energized": "energy pump hype epic fast loud",
        "any": "interesting mix random"
    }
    
    # 2. Add current emotion context to query if user explicitly wants out of a negative loop
    negative_to_positive = {
        "sad": "happy joy laugh uplifting",
        "angry": "calm relax peaceful",
        "fearful": "happy calm safe",
        "disgusted": "happy funny sweet"
    }
    
    base_query = goal_keywords.get(mood_goal, goal_keywords["any"])
    query_parts.append(base_query)
    
    if current_emotion in negative_to_positive and mood_goal in ("any", "happy", "calm"):
        query_parts.append(negative_to_positive[current_emotion])
    else:
        query_parts.append(current_emotion)
        
    # 3. Add liked reels text (User Profile)
    liked_set = set(liked_ids)
    for r in reels:
        if r.get("id") in liked_set:
            # Add liked info to user query profile, weighted up
            text = f"{r.get('title', '')} {r.get('desc', '')} {r.get('tag', '')}"
            query_parts.append(text.lower())
    
    user_query = " ".join(query_parts)
    
    # ML Part: TF-IDF
    vectorizer = TfidfVectorizer(stop_words='english')
    
    # Fit on all docs (candidates + query)
    all_docs = corpus + [user_query]
    
    try:
        tfidf_matrix = vectorizer.fit_transform(all_docs)
        
        # Calculate cosine similarity of all candidates against the user query (which is the last vector)
        candidate_vectors = tfidf_matrix[:-1]
        query_vector = tfidf_matrix[-1]
        
        similarities = cosine_similarity(query_vector, candidate_vectors).flatten()
        
        # Find index of highest similarity
        best_idx = int(np.argmax(similarities))
        return candidate_reels[best_idx]["id"]
        
    except Exception as e:
        print(f"ML Recommendation Error: {e}")
        # Random fallback
        import random
        return random.choice(candidate_reels)["id"]
