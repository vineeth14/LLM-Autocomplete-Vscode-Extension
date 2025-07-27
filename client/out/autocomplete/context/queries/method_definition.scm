; Method signature with docstring (for context)
(function_definition
  name: (identifier) @method_name
  parameters: (parameters) @parameters
  body: (block
    (expression_statement
      (string) @docstring)
    .) @body) @method_signature

; Method signature without docstring  
(function_definition
  name: (identifier) @method_name
  parameters: (parameters) @parameters
  body: (block) @body) @method_basic