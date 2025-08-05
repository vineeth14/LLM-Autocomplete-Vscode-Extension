def factorial(n: int) -> int:
    if n < 0:
        raise ValueError("Input must be a non-negative integer")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

def find_max(numbers: List[int]) -> int:
    """Find maximum number in list"""
    if not numbers:
        raise ValueError("List cannot be empty")
    max_val = float('-inf')
    for num in numbers:
        if num > max_val:
            max_val = 
    return max_val

def numberofIslands(grid):
    rl = len(grid)
    cl = len(grid[0])
    islands = 0
    for r in range(rl):
        for c in range()
        





    
    
