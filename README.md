# ChatOnClaude - Conversational Tiered Prompt System

A chat interface that guides the conversation toward generating high-quality prompts through natural dialogue and a tiered methodology, using both Claude and ChatGPT.

## Features

- Three tiers of prompt generation based on conversation depth and quality:
  - Quick Prompts (conversational, basic context)
  - Detailed Prompts (more comprehensive)
  - Legendary Mode (rich, creative details)
- Natural, tone-matching conversation flow:
  - Responds differently based on detected user tone (confused, excited, frustrated, neutral)
  - Adjusts response style based on current tier (concise, thorough, highly detailed)
  - Uses evolving phrases to encourage further exploration
- Context-aware tier progression:
  - Evaluates conversation depth based on specificity, keywords, and coherence
  - Only offers prompts when there's sufficient context, not just based on message count
  - Interactive prompt generation with user control (accept/decline offers)
- Advanced handling of unstructured inputs:
  - Context recognition and disambiguation for vague queries
  - Decomposition of complex inputs into actionable components
  - Prioritization and hierarchical structuring of output
  - Contextual enhancement with relevant insights
  - Iterative refinement suggestions
- Technical features:
  - Support for both Claude and ChatGPT API integration
  - API key configuration via UI or .env file
  - Prompts presented as attachments in chat

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