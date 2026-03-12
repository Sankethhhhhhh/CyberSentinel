import re
import tldextract
from urllib.parse import urlparse


class URLFeatureExtractor:

    def __init__(self, url: str):

        self.url = url
        self.parsed_url = urlparse(url)
        self.extracted_tld = tldextract.extract(url)

    def extract_features(self) -> dict:

        features = {}

        # URL length
        features["url_length"] = len(self.url)

        # Domain length
        domain = self.extracted_tld.domain + "." + self.extracted_tld.suffix
        features["domain_length"] = len(domain)

        # Number of dots
        features["num_dots"] = self.url.count(".")

        # Number of hyphens
        features["num_hyphens"] = self.url.count("-")

        # HTTPS presence
        features["has_https"] = 1 if self.parsed_url.scheme == "https" else 0

        # IP address detection
        host = self.parsed_url.hostname or ""
        ip_pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"

        features["is_ip_address"] = 1 if re.match(ip_pattern, host) else 0

        # Special characters
        special_chars = ["@", "?", "&", "=", "_"]

        for char in special_chars:

            features[f"num_{char}"] = self.url.count(char)

        # Subdomain count
        subdomain = self.extracted_tld.subdomain

        features["subdomain_count"] = (
            len(subdomain.split(".")) if subdomain else 0
        )

        # Digit count
        features["num_digits"] = sum(c.isdigit() for c in self.url)

        # Combined special characters
        features["num_special_chars"] = sum(
            self.url.count(char) for char in special_chars
        )

        # Path length
        features["path_length"] = len(self.parsed_url.path)

        # Query length
        features["query_length"] = len(self.parsed_url.query)

        return features

    @staticmethod
    def get_feature_names():

        return [
            "url_length",
            "domain_length",
            "num_dots",
            "num_hyphens",
            "has_https",
            "is_ip_address",
            "num_@",
            "num_?",
            "num_&",
            "num_=",
            "num__",
            "subdomain_count",
            "num_digits",
            "num_special_chars",
            "path_length",
            "query_length",
        ]