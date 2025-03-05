# ChatOnClaude - Tiered Prompt System

A chat interface that guides the conversation through a tiered methodology using both Claude and ChatGPT, with advanced handling of unstructured inputs.

## Features

- Three tiers of prompt generation:
  - Quick Prompts (after first interaction)
  - Detailed Prompts (after 3 interactions)
  - Legendary Mode (after 5 interactions)
- Support for both Claude and ChatGPT API integration
- API key configuration via UI or .env file
- Prompt generation at key milestones (interactions 3, 5, and 9)
- Evolving phrases based on conversation topics
- Responses styled according to the current tier
- Advanced handling of unstructured inputs:
  - Context recognition and disambiguation for vague queries
  - Decomposition of complex inputs into actionable components
  - Prioritization and hierarchical structuring of output
  - Contextual enhancement with relevant insights
  - Iterative refinement suggestions
  - Adaptation to user preferences
  - Transparent handling of assumptions

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure your API keys in the `.env` file:
   ```
   CLAUDE_API_KEY=your_claude_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   DEFAULT_LLM=claude
   ```
4. Start the server:
   ```
   npm run dev
   ```
5. Visit `http://localhost:3000` in your browser

## API Key Configuration

You can configure API keys in two ways:

1. **Using the .env file** (recommended):
   - Edit the `.env` file and add your API keys
   - The app will use these keys automatically

2. **Using the UI**:
   - If no API keys are configured in the .env file, you'll see a "Configure API Keys" button
   - Click the button and enter your keys in the modal

## Usage

1. Start chatting with the assistant
2. As you interact, the interface will progress through tiers:
   - Quick Prompts: Concise responses
   - Detailed Prompts: Thorough responses
   - Legendary Mode: Highly detailed, contextual responses

3. At interactions 3, 5, and 9, the system will generate prompts as "attached cards"

## Technology

- Node.js
- Express
- Anthropic Claude API
- OpenAI GPT API
- JavaScript/HTML/CSS