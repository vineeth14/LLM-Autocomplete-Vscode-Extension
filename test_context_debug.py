import math
from typing import List, Dict

def area_of_square(side: float):
    """Calculate area of a square."""
    return side * side

def area_of_circle(radius: float):
    """Calculate area of a circle."""  
    area = math.pi * radius * radius
    print(f"The area of a circle is {area}")
    return area

# Simple algorithmic functions for testing autocompletion
def area_of_square(side: float) -> float:
    area = side * side
    print(f"The area of a square is {area}")
    return area

def area_of_circle(radius: float) -> float:
    area = # <-- cursor position to test context
    
def area_of_rectangle(length: float, width: float) -> float:
    area = length * width
    print(f"The area of a rectangle is {area}")
    return area