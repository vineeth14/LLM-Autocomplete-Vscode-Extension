"""
Test file with various Python scenarios for AST context parsing
Use this file to test context retrieval at different cursor positions
"""

import os
import sys
import pandas as pd
from typing import List, Dict, Optional
from sklearn.metrics import accuracy_score, precision_score
import numpy as np

# Global variable
GLOBAL_CONFIG = {"debug": True, "max_items": 100}

class DataProcessor:
    """Main data processing class with various methods."""
    
    def __init__(self, config: Dict[str, any]):
        self.config = config
        self.cache = {}
        self.results = []
    
    @property
    def status(self) -> str:
        return "ready" if self.cache else "empty"
    
    def preprocess(self, data: pd.DataFrame) -> pd.DataFrame:
        """Preprocess the input data."""
        if data.empty:
            return data
            
        # Test context: cursor inside method, should know about data parameter
        cleaned_data = data.dropna()
        # <cursor_here> - Should know: self, data, cleaned_data, method signature
        
        return cleaned_data
    
    def analyze(self, df: pd.DataFrame, threshold: float = 0.5) -> Dict:
        """Analyze data with nested functions and complex scope."""
        
        def validate_input(input_df: pd.DataFrame) -> bool:
            """Nested function for validation."""
            if input_df is None:
                return False
            # <cursor_here> - Should know: input_df, parent scope (df, threshold, self)
            return len(input_df) > 0
        
        def calculate_metrics(data_subset: pd.DataFrame):
            """Another nested function."""
            scores = []
            for idx, row in data_subset.iterrows():
                score = row['value'] * threshold  # Uses parent scope variable
                scores.append(score)
                # <cursor_here> - Should know: scores, score, idx, row, data_subset, threshold from parent
            
            return scores
        
        # Method body
        if not validate_input(df):
            return {}
            
        processed = self.preprocess(df)
        metrics = calculate_metrics(processed)
        
        # <cursor_here> - Should know: df, threshold, validate_input, calculate_metrics, processed, metrics
        
        return {
            "metrics": metrics,
            "count": len(df),
            "threshold_used": threshold
        }

def standalone_function(items: List[str], processor: DataProcessor) -> Optional[List]:
    """Standalone function outside of class."""
    
    if not items:
        return None
    
    # <cursor_here> - Should know: items, processor, function signature, imports
    
    result = []
    for item in items:
        if item.startswith("test"):
            processed_item = processor.preprocess(pd.DataFrame([item]))
            result.append(processed_item)
    
    return result

# Global function with complex logic
def main():
    """Main execution function."""
    
    # Create processor
    config = GLOBAL_CONFIG.copy()
    processor = DataProcessor(config)
    
    # Test data
    test_data = pd.DataFrame({
        'value': [1, 2, 3, 4, 5],
        'category': ['A', 'B', 'A', 'C', 'B']
    })
    
    # <cursor_here> - Should know: config, processor, test_data, GLOBAL_CONFIG, all imports
    
    # Process data
    results = processor.analyze(test_data, threshold=0.7)
    
    # Test standalone function
    items = ["test1", "test2", "other"]
    processed_items = standalone_function(items, processor)
    
    # <cursor_here> - Should know: all above variables, function calls available
    
    return results, processed_items

class InheritedProcessor(DataProcessor):
    """Test inheritance and method overriding."""
    
    def __init__(self, config: Dict[str, any], extra_param: str):
        super().__init__(config)
        self.extra_param = extra_param
    
    def enhanced_analyze(self, df: pd.DataFrame) -> Dict:
        """Enhanced analysis with inheritance context."""
        
        # Call parent method
        base_results = super().analyze(df)
        
        # <cursor_here> - Should know: df, base_results, self (with inherited + new attributes)
        
        # Additional processing
        enhanced_results = base_results.copy()
        enhanced_results["extra"] = self.extra_param
        
        return enhanced_results

# Context with decorators
@property
def get_system_info():
    """Function with decorator."""
    # <cursor_here> - Should know: decorator context
    return {"os": os.name, "python": sys.version}

# Context with exception handling
def risky_operation(data: List[int]) -> float:
    """Function with try/except for context testing."""
    
    try:
        total = sum(data)
        average = total / len(data)
        # <cursor_here> - Should know: data, total, average, in try block
        
    except ZeroDivisionError as e:
        error_msg = f"Division error: {e}"
        # <cursor_here> - Should know: e, error_msg, data from outer scope
        return 0.0
    
    except Exception as general_error:
        # <cursor_here> - Should know: general_error, data, but not total/average (different except block)
        return -1.0
    
    finally:
        # <cursor_here> - Should know: data parameter, but local vars depend on which block executed
        pass
    
    return average

# Context with comprehensions and lambda
def advanced_processing(data_list: List[Dict]) -> List[float]:
    """Test comprehensions and lambda context."""
    
    # List comprehension
    values = [item['value'] for item in data_list if item.get('active', False)]
    
    # <cursor_here> - Should know: data_list, values
    
    # Lambda function
    multiplier = lambda x: x * 2
    doubled = list(map(multiplier, values))
    
    # Dictionary comprehension  
    value_map = {f"item_{i}": val for i, val in enumerate(doubled)}
    
    # <cursor_here> - Should know: all above variables, comprehension context
    
    return doubled

if __name__ == "__main__":
    # Script execution context
    # <cursor_here> - Should know: all module-level definitions, imports
    
    results, items = main()
    print(f"Results: {results}")