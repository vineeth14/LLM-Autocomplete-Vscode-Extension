; Class signature with docstring (for context)
(class_definition
  name: (identifier) @class_name
  body: (block
    (expression_statement
      (string) @docstring)
    .) @body) @class_signature

; Class signature without docstring
(class_definition
  name: (identifier) @class_name
  body: (block) @body) @class_basic