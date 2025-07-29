"""
Test data for LLM judge quality testing - Scope Understanding Focus
Tests if LLM understands function scope, nested calls, and available functions
"""
import requests
import json
from typing import List, Dict

# Scenario 1: API call completion (common pattern)
response = requests.get("https://api.example.com/users")
data = response.

# Scenario 2: Dictionary access with actual context
user_data = {"name": "John", "age": 30, "email": "john@example.com"}
email = user_data[

# Scenario 3: List comprehension (real filtering scenario)
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
even_numbers = [x for x in numbers if x 

# Scenario 4: String formatting (common need)
name = "Alice"
age = 25
message = f"Hello {name}, you are {

# Scenario 5: Empty bubble sort function - test if LLM can implement from scratch
def bubble_sort(arr: List[int]) -> List[int]:
    """Sort array using bubble sort algorithm"""
    

# Scenario 6: Graph DFS function - test nested/recursive understanding  
def find_path_dfs(graph: Dict[str, List[str]], start: str, end: str, visited=None):
    """Find path in graph using DFS - expects nested recursive calls"""
    if visited is None:
        visited = set()
    

# Scenario 7: Function that calls bubble_sort - test scope awareness
def analyze_scores(student_scores: List[int]) -> Dict[str, int]:
    """Analyze student scores by sorting them first"""
    sorted_scores = bubble_sort(
    
# Scenario 8: Lambda function in functional context  
users = [{"name": "Alice", "score": 95}, {"name": "Bob", "score": 87}]
top_users = list(filter(lambda user: user[ 