---
name: validator
type: rules
description: Validates documentation against the API delta using declarative rules
---

## Rules

- id: required_header
  severity: error
  check: contains
  pattern: "# Feature: {feature}"
  message: "Missing required header. The documentation must begin with exactly: # Feature: {feature} — check for extra spaces, wrong capitalisation, or missing newline before the heading."

- id: no_invented_endpoints
  severity: error
  check: endpoints_in_delta
  message: "Invented endpoint not in structured data"

- id: coverage_new
  severity: error
  check: delta_coverage_new
  message: "New endpoint missing from documentation"

- id: coverage_modified
  severity: error
  check: delta_coverage_modified
  message: "Modified endpoint missing from documentation"

- id: coverage_removed
  severity: warning
  check: delta_coverage_removed
  message: "Removed endpoint not mentioned in documentation"

- id: valid_http_methods
  severity: error
  check: http_methods
  allowed:
    - GET
    - POST
    - PUT
    - PATCH
    - DELETE
    - HEAD
    - OPTIONS
    - QUERY
    - MUTATION
    - RPC
  message: "Invalid HTTP method in documentation"

- id: curl_required_for_each_endpoint
  severity: error
  check: endpoint_section_contains
  required_any:
    - "curl "
    - "cURL example"
  message: "Missing cURL example for endpoint: {method} {path}"

- id: purpose_description_required
  severity: error
  check: endpoint_section_contains
  required_any:
    - "Purpose & Description"
  minimum_prose_sentences: 3
  message: "Missing or insufficient Purpose & Description section for endpoint: {method} {path}. This section is mandatory and must contain at least 3 sentences in flowing prose."

- id: no_3column_request_schema_table
  severity: error
  check: no_3col_table
  message: "3-column request body table detected. Find every line that reads '| Field | Type | Required |' and change it to '| Field | Type | Required | Accepted Values |'. Then add '| — |' as a 4th cell to EVERY data row in that table. Do this for ALL tables in the entire document in one pass."

- id: status_codes_table_required_per_endpoint
  severity: error
  check: endpoint_section_contains
  required_any:
    - "| Code |"
    - "| code |"
  message: "Missing Status Codes (Errors) table for endpoint: {method} {path}. Every endpoint must have a status codes table."

- id: bearer_endpoints_must_have_401
  severity: error
  check: bearer_endpoints_have_status_code
  required_code: 401
  message: "Endpoint {method} {path} uses bearer authentication but the Status Codes table is missing a 401 entry. Bearer endpoints must always document 401."

- id: status_codes_must_be_sorted_ascending
  severity: warning
  check: status_code_table_sort_order
  message: "Status codes in the Errors table for {method} {path} are not sorted ascending. Sort 4xx before 5xx."

- id: code_quality_section_required
  severity: warning
  check: contains_when_new_or_modified_endpoints_present
  pattern: "## Code Quality"
  message: "Missing '## Code Quality' section. This section is required when new or modified endpoints are present in the diff."

- id: no_escaped_pipe_in_tables
  severity: error
  check: regex_absent
  patterns:
    - "\\\\\\|"
  message: "Escaped pipe (\\|) found in a table cell. Use commas to separate enum values instead: 'admin, user, viewer' not 'admin\\|user\\|viewer'."

- id: no_placeholder_values_in_curl
  severity: error
  check: regex_absent_in_curl_blocks
  patterns:
    - "\"string\""
    - "\"integer\""
    - "\"boolean\""
    - "\"value\""
    - "\"example\""
    - ": 123}"
    - ": 0}"
    - ": true}"
    - ": false}"
  message: "Placeholder value detected in cURL example. Use realistic sample values (e.g. actual email addresses, UUID strings, ISO 8601 dates), not type names or bare booleans."

- id: no_speculation
  severity: error
  check: regex_absent
  patterns:
    - "(?:may|might|could)\\s+(?:want to|consider|think about)"
    - "in\\s+the\\s+(?:near\\s+)?future"
    - "it\\s+is\\s+(?:recommended|suggested)\\s+that\\s+you"
    - "you\\s+(?:should|might want to|could)\\s+(?:also|consider)"
    - "note:\\s+this\\s+is\\s+not\\s+yet\\s+implemented"
    - "will\\s+be\\s+(?:used|available|supported|added|implemented)"
    - "planned\\s+for\\s+(?:future|later|upcoming)"
  message: "Speculative language detected — remove this phrase entirely: '{match}'"