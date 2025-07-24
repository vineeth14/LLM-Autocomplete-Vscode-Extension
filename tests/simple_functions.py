"""
Test file for basic function autocompletion
Tests scope-aware context with simple function definitions and calls
"""
import os
import json
from typing import List, Dict, Optional

def validate_email(email: str) -> bool:
    """Check if email format is valid"""
    return "@" in email and "." in email

def validate_user_data(user: Dict[str, str]) -> bool:
    """Validate user data dictionary"""
    required_fields = ["name", "email", "age"]
    
    # Test 1: Should suggest user.get() or user keys
    if not user. 
        return False
    
    for field in required_fields:
        if field not in user:
            return False
    
    # Test 2: Should suggest validate_email function
    return validate_  

def process_user_list(users: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Process a list of users, filtering valid ones"""
    valid_users = []
    
    for user in users:
        # Test 3: Should suggest validate_user_data function
        if validate_user_  # <-- CURSOR
            valid_users.append(user)
    
    return valid_users

def save_to_file(data: List[Dict], filename: str) -> bool:
    """Save data to JSON file"""
    try:
        # Test 4: Should suggest json.dumps() from import
        content = json.  # <-- CURSOR
        
        # Test 5: Should suggest os.path functions from import
        if not os.path.  # <-- CURSOR
            return False
            
        with open(filename, 'w') as f:
            f.write(content)
        return True
    except Exception:
        return False

def main():
    """Main function to test all functionality"""
    users = [
        {"name": "John", "email": "john@test.com", "age": "25"},
        {"name": "Jane", "email": "invalid-email", "age": "30"}
    ]
    
    # Test 6: Should suggest process_user_list function
    valid_users = process_  # <-- CURSOR
    
    # Test 7: Should suggest save_to_file function  
    saved = save_  # <-- CURSOR
    
    print(f"Processed {len(valid_users)} users, saved: {saved}")

if __name__ == "__main__":
    # Test 8: Should suggest main() function
    main  # <-- CURSOR