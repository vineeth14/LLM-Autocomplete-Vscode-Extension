def find_max(numbers: List[int]) -> int:
    """Find maximum number in list"""
    if not numbers:
        raise ValueError("List cannot be empty")
    max_val = numbers[0]
    for num in number:
        if num > max_val:
            max_val = num
    return max_val


def bubbleSort(arr):
    n = len(arr)
    for i in range(n-1):
        swapped = 
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
                swapped = True
        if not swapped:
            break
    

