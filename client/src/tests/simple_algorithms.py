"""
Simple algorithmic functions for testing autocompletion
"""
import math
from typing import List, Dict

def area_of_square(side: float) -> float:
    return side * side

def area_of_circle(radius: float) -> float:
    """Calculate area of a circle"""
    return radius ** 2 * math.pi

def area_of_rectangle(length: float, width: float) -> float: 
    return length * width

def fibonacci(n: int) -> int:
    """Generate nth fibonacci number"""



def factorial(n: int) -> int:
    """Calculate factorial of n"""



def find_max(numbers: List[int]) -> int:
    """Find maximum number in list"""
    if not numbers:
        return 0
    max_val = numbers[0]
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val

def bubble_sort(arr: List[int]) -> List[int]:
    """Simple bubble sort implementation"""
    n = len(arr)

def merge_sort(arr):
    """Merge Sort Implementation"""
    

def numberOfIslands(grid: List[List[str]]) -> int:




    
        