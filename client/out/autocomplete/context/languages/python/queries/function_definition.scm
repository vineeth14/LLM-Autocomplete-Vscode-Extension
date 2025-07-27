; Function signature with docstring (for context)
(function_definition
  name: (identifier) @function_name
  parameters: (parameters) @parameters
  body: (block
    (expression_statement
      (string) @docstring)
    .) @body) @function_signature

; Function signature without docstring
(function_definition
  name: (identifier) @function_name
  parameters: (parameters) @parameters
  body: (block) @body) @function_basic