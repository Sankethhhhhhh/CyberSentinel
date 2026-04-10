import re
import math
import logging
from urllib.parse import urlparse
import tldextract
import whois
from datetime import datetime
import numpy as np
import scipy.sparse as sp
from sklearn.base import BaseEstimator, TransformerMixin

logger = logging.getLogger(__name__)

# --- URL FEATURE ENGINEERING ---

def url_entropy(url: str) -> float:
    """Calculates the Shannon entropy of the URL string."""
    if not url:
        return 0.0
    
    # Calculate character frequencies
    char_count = {}
    for char in url:
        char_count[char] = char_count.get(char, 0) + 1
        
    # Calculate entropy
    entropy = 0.0
    length = len(url)
    for freq in char_count.values():
        prob = freq / length
        entropy -= prob * math.log2(prob)
        
    return entropy

def has_ip(url: str) -> int:
    """Checks if the URL contains an IP address instead of a domain name."""
    # Matches IPv4 addresses
    ip_pattern = re.compile(
        r'(([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.'
        r'([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5]))'
    )
    domain = urlparse(url).netloc
    if ip_pattern.search(domain):
        return 1
    return 0

def special_char_count(url: str) -> int:
    """Counts the number of special characters in the URL."""
    # List of special characters commonly found in phishing URLs
    special_chars = set(['@', '?', '-', '=', '_', '%', '&', '/', '#'])
    return sum(1 for char in url if char in special_chars)

def extract_url_features(url: str) -> dict:
    """
    Extracts numerical and categorical features from a URL for model training/inference.
    
    Returns:
        dict: A dictionary of feature names and their corresponding values.
    """
    url = str(url).strip()
    parsed_url = urlparse(url)
    extracted = tldextract.extract(url)
    
    # Basic textual features
    url_length = len(url)
    num_dots = url.count('.')
    num_special_chars = special_char_count(url)
    is_https = 1 if parsed_url.scheme.lower() == 'https' else 0
    ip_present = has_ip(url)
    entropy_val = url_entropy(url)
    
    # Domain features
    domain = f"{extracted.domain}.{extracted.suffix}" if extracted.suffix else extracted.domain
    # Calculate number of subdomains. If subdomain is WWW, don't count it as highly suspicious
    subdomains = extracted.subdomain
    num_subdomains = 0
    if subdomains:
        subdomains = subdomains.replace("www.", "")
        if subdomains:
            num_subdomains = subdomains.count('.') + 1
            
    # Domain age
    domain_age_days = 0 # 0 implies missing or error
    try:
        # Avoid WHOIS lookups for local IPs or empty domains
        if domain and not ip_present:
            # Set timeout to prevent hanging
            w = whois.whois(domain)
            creation_date = w.creation_date
            if type(creation_date) is list:
                creation_date = creation_date[0]
            
            if creation_date and isinstance(creation_date, datetime):
                age = (datetime.now() - creation_date).days
                domain_age_days = age if age >= 0 else 0
            elif creation_date and isinstance(creation_date, str):
                # Attempt basic string parsing if it's not a datetime object
                # This could be expanded based on whois string formats
                pass
    except Exception as e:
        logger.debug(f"WHOIS lookup failed for {domain}: {e}")
        domain_age_days = 0
        
    features = {
        'url_length': url_length,
        'num_dots': num_dots,
        'num_special_chars': num_special_chars,
        'has_https': is_https,
        'has_ip': ip_present,
        'num_subdomains': num_subdomains,
        'entropy': entropy_val,
        'domain_age_days': domain_age_days
    }
    
    return features


# --- SMS TEXT FEATURE ENGINEERING ---

def normalize_text(text: str) -> str:
    """
    Normalizes text by handling leetspeak and removing excessive symbols.
    """
    text = text.lower()

    # Replace leetspeak characters
    replacements = {
        "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "@": "a"
    }
    for k, v in replacements.items():
        text = text.replace(k, v)

    # Remove excessive symbols (keep alphanumeric and spaces)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)

    return text

def preprocess_sms(text: str) -> str:
    """
    Preprocesses SMS text by normalization, lowercasing, 
    replacing URLs, and normalizing whitespace.
    """
    if not isinstance(text, str):
        return ""
        
    # Replace URLs with "URL" placeholder before normalization
    url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
    text = url_pattern.sub('URL', text)
    
    # Normalize text (leetspeak, symbols, lowercasing)
    text = normalize_text(text)
    
    # Normalize spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def keyword_features(text: str) -> dict:
    """
    Extracts binary flags for common phishing keywords and custom features.
    """
    # Expanded phishing keywords list
    phishing_keywords = [
        "urgent", "verify", "click", "login", "account", "bank", "otp", 
        "password", "limited", "suspend", "free", "reward", "claim", 
        "update", "security", "alert", "link", "now", "suspended", 
        "winner", "prize", "action required", "locked", "confirm", 
        "limited time", "gift", "immediately", "kyc", "refund", "tax",
        "electricity", "sim", "delivery", "court", "notice", "transaction",
        "billing"
    ]
    
    text_lower = text.lower()
    
    features = {}
    for kw in phishing_keywords:
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(kw) + r'\b'
        match = re.search(pattern, text_lower)
        # Multiply keyword matches by 5 to increase their importance in the model
        features[f"kw_{kw.replace(' ', '_')}"] = 5 if match else 0
        
    # Additional logic features requested
    features["contains_url"] = 5 if re.search(r'http[s]?://|www\.', text_lower) else 0
    features["contains_number"] = 5 if re.search(r'\d', text_lower) else 0
    features["message_length"] = len(text)
    
    # Strong Binary Flags
    features["has_urgent"] = int("urgent" in text_lower)
    features["has_verify"] = int("verify" in text_lower)
    features["has_bank"] = int("bank" in text_lower)
    features["has_link"] = int("http" in text_lower or "www" in text_lower)
    
    return features

class SMSPipelineTransformer(BaseEstimator, TransformerMixin):
    """
    A scikit-learn compatible transformer that combines TF-IDF and keyword features.
    This allows us to save the entire preprocessing logic in a single pipeline file.
    """
    def __init__(self, vectorizer=None):
        self.vectorizer = vectorizer
        self.keyword_cols = None

    def fit(self, X, y=None):
        # We assume X is a pandas Series or list of raw SMS messages
        if self.vectorizer is None:
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.vectorizer = TfidfVectorizer(max_features=3000, ngram_range=(1, 2))
        
        # Preprocess for TF-IDF
        processed_x = [preprocess_sms(text) for text in X]
        self.vectorizer.fit(processed_x)
        
        # Get keyword columns from a sample to ensure consistency
        sample_kwd = keyword_features(X[0] if len(X) > 0 else "")
        self.keyword_cols = list(sample_kwd.keys())
        
        return self

    def transform(self, X):
        # 1. TF-IDF Features
        processed_x = [preprocess_sms(text) for text in X]
        tfidf_matrix = self.vectorizer.transform(processed_x)
        
        # 2. Keyword Features
        kwd_list = []
        for text in X:
            kwd_dict = keyword_features(text)
            # Ensure order matches self.keyword_cols
            kwd_list.append([kwd_dict[col] for col in self.keyword_cols])
        
        kwd_sparse = sp.csr_matrix(kwd_list)
        
        # 3. Triple keyword importance (as done in current training)
        kwd_multiplied = sp.hstack([kwd_sparse, kwd_sparse, kwd_sparse])
        
        # 4. Combine
        combined = sp.hstack([tfidf_matrix, kwd_multiplied])
        return combined
