"""
Test file for basic class method autocompletion
Tests scope-aware context with class definitions and method calls
"""
import requests
from typing import Optional, Dict, List

class UserValidator:
    """Simple class for validating user data"""
    
    def __init__(self, strict_mode: bool = False):
        self.strict_mode = strict_mode
        self.validation_rules = ["email", "name"]
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        return "@" in email and len(email) > 3
    
    def validate_name(self, name: str) -> bool:
        """Validate name format"""
        return len(name) > 1 and name.isalpha()
    
    def validate_user(self, user_data: Dict[str, str]) -> bool:
        """Validate complete user data"""
        # Test 1: Should suggest self.validate_email method
        email_valid = self.validate_  # <-- CURSOR
        
        # Test 2: Should suggest self.validate_name method  
        name_valid = self.validate_  # <-- CURSOR
        
        # Test 3: Should suggest self.strict_mode property
        if self.strict_  # <-- CURSOR
            # Additional validation in strict mode
            return email_valid and name_valid and len(user_data) >= 3
            
        return email_valid and name_valid

class UserService:
    """Service class for managing users"""
    
    def __init__(self, api_base_url: str):
        self.api_base_url = api_base_url
        # Test 4: Should suggest UserValidator class from same file
        self.validator = UserValidator  # <-- CURSOR
        self.users_cache = []
    
    def fetch_user_data(self, user_id: str) -> Optional[Dict]:
        """Fetch user data from API"""
        try:
            # Test 5: Should suggest requests.get from import
            response = requests.  # <-- CURSOR
            
            # Test 6: Should suggest self.api_base_url property
            url = f"{self.api_  # <-- CURSOR}/users/{user_id}"
            response = requests.get(url)
            return response.json()
        except Exception:
            return None
    
    def validate_and_cache_user(self, user_data: Dict[str, str]) -> bool:
        """Validate user data and add to cache if valid"""
        # Test 7: Should suggest self.validator property
        is_valid = self.validator.  # <-- CURSOR
        
        if is_valid:
            # Test 8: Should suggest self.users_cache property
            self.users_  # <-- CURSOR.append(user_data)
            return True
        return False
    
    def get_cached_users(self) -> List[Dict]:
        """Return all cached users"""
        # Test 9: Should suggest self.users_cache property
        return self.users_  # <-- CURSOR
    
    def process_user_by_id(self, user_id: str) -> bool:
        """Complete workflow: fetch, validate, and cache user"""
        # Test 10: Should suggest self.fetch_user_data method
        user_data = self.fetch_  # <-- CURSOR
        
        if user_data:
            # Test 11: Should suggest self.validate_and_cache_user method
            return self.validate_and_  # <-- CURSOR
        return False

def main():
    """Test the classes"""
    # Test 12: Should suggest UserService class
    service = UserService  # <-- CURSOR
    
    # Test 13: Should suggest service.process_user_by_id method
    result = service.process_  # <-- CURSOR
    
    # Test 14: Should suggest service.get_cached_users method
    cached = service.get_  # <-- CURSOR
    
    print(f"Processing result: {result}")
    print(f"Cached users: {len(cached)}")

if __name__ == "__main__":
    main()