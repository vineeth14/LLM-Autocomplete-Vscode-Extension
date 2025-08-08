
def topological_sort(graph):
    from collections import defaultdict, deque
    
    in_degree = defaultdict(int)
    adj_list = defaultdict(list)

    for node 
        if node not in in_degree:
            in_degree[] = 0
        for neighbor in graph[node]:
           adj_list[node].append(neighbor)
            in_degree[neighbor] += 1
    queue = deque([])
    result = []
    while queue:
        current = queue.popleft()
        result.append(current)
        for neighbor in adj_list[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(result) != len(in_degree):
        return None  # Cycle detected
    
    return result