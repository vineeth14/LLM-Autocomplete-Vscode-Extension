from typing import List, Optional

class BaseProcessor:
    def process(self):
        pass

class Calculator(BaseProcessor):
    def __init__(self, precision=2):
        self.precision = precision
        self.history = []
    
    def add(self, a, b):
        result = a + b
        self.history.append(f"add: {a} + {b} = {result}")
        return result
    
    def multiply(self, a, b):
        result = a * b
        self.history.append(f"multiply: {a} * {b} = {result}")
        return result
    
    def get_last_result(self):
        if self.history:
            return self.history[-1]
        return None

class DataProcessor(BaseProcessor):
    def __init__(self):
        self.data = []
        self.processed_count = 0
    
    def add_item(self, item):
        self.data.append(item)
        return len(self.data)
    
    def process_all(self):
        for item in self.data:
            pass
        self.processed_count = len(self.data)
    
    def clear_data(self):
        self.data = []
        self.processed_count = 0

def create_calculator(precision: Calculator) -> Optional[Calculator]:
    return Calculator(precision.precision)

def process_items(items: List[DataProcessor]) -> BaseProcessor:
    return items[0] if items else DataProcessor()

def test_inheritance():
    calc = Calculator()
    calc
def test_parameters():
    def helper(calc: Calculator):
        calc.
def test_return_types():
    result = create_calculator()
    result.
    
    items = process_items([])
    items.