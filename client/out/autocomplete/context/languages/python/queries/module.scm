; Import statements for context
(import_statement) @import

(import_from_statement) @from_import

; Top-level function signatures
(function_definition
  name: (identifier) @function_name
  parameters: (parameters) @parameters) @top_level_function

; Top-level class signatures  
(class_definition
  name: (identifier) @class_name) @top_level_class