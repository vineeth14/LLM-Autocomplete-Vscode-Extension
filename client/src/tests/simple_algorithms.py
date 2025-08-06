def factorial(n: int) -> int:
    if n == 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

def find_max(numbers: list[int]) -> int:
    """Find maximum number in list"""
    if len(numbers) == 0:
        raise ValueError("List is empty")
    max_val = numbers[0]
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val

def numberOfIslands(grid):
    rl = len(grid)  
    cl = len(grid[0])
    islands = 0
    visited = set()

    def dfs(row, col): 
        if row < 0 or row >= rl or col < 0 or col >= cl:
            return False
        key = (row, col)
        if grid[row][col] == '1' and key not in visited:
            visited.add(key)
            dfs(row + 1, col)  
            dfs(row - 1, col)  
            dfs(row, col + 1)  
            dfs(row, col - 1)  
        return True
    for row in range(rl):
        for col in range(cl):
            if grid[row][col] == '1' and (row, col) not in visited:
                islands += 1
                dfs(row, col)
    return islands