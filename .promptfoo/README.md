# Promptfoo Evaluation Setup

This directory contains the Promptfoo configuration for evaluating all AI prompts used in the Nabu project.

## Overview

Promptfoo is used to:
- Evaluate prompt accuracy and quality
- Compare output quality across different models (GPT-4o-mini, GPT-4o, GPT-3.5-turbo, etc.)
- Test prompts with various input scenarios
- Ensure consistent output formats and quality

## Prompts Evaluated

1. **Title Generation**
   - Single note title generation
   - Bulk note title generation (multiple thoughts)

2. **Webhook Processing**
   - Webhook payload classification
   - Webhook title extraction
   - Folder suggestions for webhook content

3. **Tag Suggestions**
   - Tag suggestion with existing tags context
   - Tag suggestion for new content

## Directory Structure

```
.promptfoo/
├── promptfooconfig.yaml                    # Main configuration file (all prompts)
├── promptfooconfig-title-single.yaml       # Individual config: Single note title
├── promptfooconfig-title-bulk.yaml         # Individual config: Bulk note title
├── promptfooconfig-webhook-classify.yaml   # Individual config: Webhook classification
├── promptfooconfig-webhook-title.yaml      # Individual config: Webhook title extraction
├── promptfooconfig-webhook-folder.yaml     # Individual config: Folder suggestion
├── promptfooconfig-tag-suggestion.yaml     # Individual config: Tag suggestion
├── prompts/                                # Prompt template files (reference only)
│   ├── title-generation.yaml
│   ├── webhook.yaml
│   └── tag-suggestion.yaml
├── tests/                                  # Test cases (reference only)
│   ├── title-generation-tests.yaml
│   ├── webhook-tests.yaml
│   └── tag-tests.yaml
└── outputs/                                # Evaluation results (gitignored)
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```
   (promptfoo is already included as a dev dependency)

2. **Set Environment Variables**
   Ensure you have the following API keys set:
   ```bash
   OPENAI_API_KEY=your_openai_api_key
   # Optional: For Anthropic models
   # ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

## Running Evaluations

### Run Individual Prompt Evaluations (Recommended)

Test each prompt individually for focused evaluation:

```bash
# Title Generation - Single Note
npm run promptfoo:eval:title-single

# Title Generation - Bulk Notes
npm run promptfoo:eval:title-bulk

# Webhook Classification
npm run promptfoo:eval:webhook-classify

# Webhook Title Extraction
npm run promptfoo:eval:webhook-title

# Webhook Folder Suggestion
npm run promptfoo:eval:webhook-folder

# Tag Suggestion
npm run promptfoo:eval:tag-suggestion
```

### Run All Evaluations Together
```bash
npm run promptfoo:eval
```

Or directly:
```bash
npx promptfoo eval -c .promptfoo/promptfooconfig.yaml
```

### View Results in Web UI
```bash
npm run promptfoo:view
```

Or directly:
```bash
npx promptfoo view
```

This opens a web interface where you can:
- Compare outputs across different models
- Review assertion results
- Analyze performance metrics
- Export results

This opens a web interface where you can:
- Compare outputs across different models
- Review assertion results
- Analyze performance metrics
- Export results

## Adding New Test Cases

To add a new test case, edit the appropriate test file in `.promptfoo/tests/`:

1. **For Title Generation**: Edit `.promptfoo/tests/title-generation-tests.yaml`
2. **For Webhook Tests**: Edit `.promptfoo/tests/webhook-tests.yaml`
3. **For Tag Tests**: Edit `.promptfoo/tests/tag-tests.yaml`

Example test case structure:
```yaml
tests:
  - vars:
      prompt: title-single  # Reference to prompt ID
      content: "Your test content here"
    assert:
      - type: contains
        value: "Expected content"
        description: "What this assertion checks"
      - type: javascript
        value: "output.length >= 3 && output.length <= 100"
        description: "Custom validation logic"
```

## Adding New Prompts

To add a new prompt:

1. Add the prompt definition to the appropriate test file (or create a new one)
2. Define it in the `prompts` section:
```yaml
prompts:
  - id: my-new-prompt
    messages:
      - role: system
        content: "System prompt here"
      - role: user
        content: "User prompt with {{variables}}"
```

3. Reference it in test cases using `prompt: my-new-prompt`

## Evaluation Criteria

Each test includes assertions that check:

- **Format Validation**: JSON structure, length constraints, format requirements
- **Content Quality**: Relevance, accuracy, completeness
- **Consistency**: Stable outputs across runs
- **Model Comparison**: Side-by-side comparison of different models

## Interpreting Results

### Assertion Types

- `contains`: Output must contain specified text
- `not-contains`: Output must not contain specified text
- `contains-any`: Output must contain at least one of the specified values
- `contains-json`: Output must be valid JSON matching the schema
- `javascript`: Custom JavaScript validation logic
- `equals`: Exact match
- `icontains`: Case-insensitive contains

### Metrics

Promptfoo tracks:
- **Pass Rate**: Percentage of assertions that pass
- **Latency**: Response time per model
- **Token Usage**: Tokens consumed per request
- **Cost**: Estimated cost per evaluation (if configured)

## Model Comparison

The configuration compares:
- **GPT-4o-mini**: Fast, cost-effective (current default)
- **GPT-4o**: Higher quality, more capable
- **GPT-3.5-turbo**: Faster, lower cost alternative

To add more models, edit `.promptfoo/promptfooconfig.yaml`:
```yaml
providers:
  - openai:gpt-4o-mini
  - openai:gpt-4o
  - anthropic:claude-3-5-sonnet-20241022
```

## Best Practices

1. **Regular Evaluation**: Run evaluations after prompt changes
2. **Version Control**: Commit test cases and config, but not outputs
3. **CI/CD Integration**: Consider adding to CI pipeline for regression testing
4. **Documentation**: Update test descriptions when adding new cases
5. **Edge Cases**: Include tests for edge cases (empty input, very long content, etc.)

## Troubleshooting

### API Key Issues
- Ensure `OPENAI_API_KEY` is set in your environment
- Check API key permissions and rate limits

### Test Failures
- Review assertion descriptions in test output
- Check if prompt format matches expected structure
- Verify variable names match between prompts and tests

### Performance Issues
- Adjust `maxConcurrency` in `promptfooconfig.yaml`
- Reduce number of test cases for faster runs
- Use caching for repeated evaluations

## Resources

- [Promptfoo Documentation](https://www.promptfoo.dev/docs/)
- [Promptfoo GitHub](https://github.com/promptfoo/promptfoo)
- [Getting Started Guide](https://www.promptfoo.dev/docs/getting-started/)

## Notes

- Output files are stored in `.promptfoo/outputs/` and are gitignored
- Prompts are extracted from the actual codebase to ensure accuracy
- Test cases are based on realistic usage scenarios from the application

