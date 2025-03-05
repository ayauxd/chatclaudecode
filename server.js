require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { Anthropic } = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Load API keys from .env file
let claudeApiKey = process.env.CLAUDE_API_KEY || "";
let chatgptApiKey = process.env.OPENAI_API_KEY || "";
let defaultLLM = process.env.DEFAULT_LLM || "claude";
let claudeClient = null;
let openaiClient = null;

// Initialize API clients if keys are provided
if (claudeApiKey && claudeApiKey !== "your_claude_api_key_here") {
  try {
    claudeClient = new Anthropic({
      apiKey: claudeApiKey
    });
    console.log("Claude API client initialized!");
  } catch (error) {
    console.error("Error initializing Claude client:", error);
  }
}

if (chatgptApiKey && chatgptApiKey !== "your_openai_api_key_here") {
  try {
    openaiClient = new OpenAI({
      apiKey: chatgptApiKey
    });
    console.log("OpenAI API client initialized!");
  } catch (error) {
    console.error("Error initializing OpenAI client:", error);
  }
}

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to check if API keys are pre-configured
app.get('/api/check-config', (req, res) => {
  res.json({
    success: true,
    claudeConfigured: !!claudeClient,
    chatgptConfigured: !!openaiClient,
    defaultLLM: defaultLLM
  });
});

// API key configuration endpoint
app.post('/api/config', (req, res) => {
  const { claude_api_key, chatgpt_api_key } = req.body;
  
  try {
    if (claude_api_key) {
      claudeApiKey = claude_api_key;
      claudeClient = new Anthropic({
        apiKey: claudeApiKey
      });
    }
    
    if (chatgpt_api_key) {
      chatgptApiKey = chatgpt_api_key;
      openaiClient = new OpenAI({
        apiKey: chatgptApiKey
      });
    }
    
    res.json({ success: true, message: "API keys configured successfully" });
  } catch (error) {
    console.error("Error configuring API clients:", error);
    res.status(500).json({ success: false, message: "Error configuring API clients" });
  }
});

// Format conversation history for Claude
function formatConversationForClaude(conversation) {
  return conversation.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

// Format conversation history for ChatGPT
function formatConversationForChatGPT(conversation) {
  return conversation.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));
}

// Get LLM response endpoint
app.post('/api/get-response', async (req, res) => {
  const { llm, conversation, style } = req.body;
  
  try {
    // Enhanced system prompt to better handle unstructured inputs
    let systemPrompt = "";
    
    if (style === "concise") {
      systemPrompt = `
        CrackedLLM response: You are a helpful prompt assistant. Provide a ${style} response.
        
        Guidelines for handling user input:
        1. If the input is clear and specific, respond directly and helpfully.
        2. If the input is vague or unstructured (e.g., "I need a prompt for something cool"), ask clarifying questions like "What's 'cool'—a story, a trip, or something else? Give me a starting point!"
        3. If the input contains multiple elements (e.g., "travel, Japan, temples"), identify the core components and ask targeted questions to refine them.
        4. Be transparent about any assumptions you make, e.g., "I'm assuming you mean a travel prompt—correct me if I'm wrong!"
        5. Keep responses brief and focused, while still being helpful.
        6. Adapt your tone to match the user's style.
        
        Your purpose is to guide the user toward creating high-quality prompts through conversation.
      `;
    } 
    else if (style === "thorough") {
      systemPrompt = `
        CrackedLLM response: You are a helpful prompt assistant. Provide a ${style} response.
        
        Guidelines for handling user input:
        1. If the input is clear and specific, provide a thorough, well-structured response.
        2. If the input is vague or unstructured, decompose it into possible interpretations and ask clarifying questions to narrow down the user's intent.
        3. Prioritize critical details in your response, organizing information hierarchically.
        4. Add relevant context or implications the user might not have mentioned, like best practices or creative angles.
        5. Be transparent about assumptions while making educated guesses to move the conversation forward.
        6. Adjust your level of detail based on the user's engagement pattern.
        7. Offer to refine your suggestions based on feedback.
        
        Your purpose is to guide the user toward creating high-quality prompts through conversation, providing more depth and context than in quick mode.
      `;
    }
    else if (style === "highly detailed") {
      systemPrompt = `
        CrackedLLM response: You are a helpful prompt assistant. Provide a ${style} response.
        
        Guidelines for handling user input:
        1. Conduct deep analysis of both explicit and implicit elements in the user's input.
        2. For vague or unstructured inputs, offer multiple interpretations and pathways, asking nuanced questions to understand the user's exact needs.
        3. Create a comprehensive response that addresses all possible aspects of the user's query, organized in a clear, logical structure.
        4. Significantly enhance your response with relevant context, implications, best practices, examples, and creative angles the user might not have considered.
        5. When making assumptions, explain your reasoning and offer alternatives.
        6. Provide specialized insights that elevate the conversation beyond surface-level discussion.
        7. Suggest iterative refinements and creative variations to explore.
        
        Your purpose is to guide the user toward creating exceptional, expert-level prompts through rich, nuanced conversation.
      `;
    }
    else {
      systemPrompt = `CrackedLLM response: Provide a ${style} response.`;
    }
    
    if (llm === 'claude') {
      if (!claudeClient) {
        return res.status(400).json({ success: false, message: "Claude API key not configured" });
      }
      
      // Make the actual API call to Claude
      const response = await claudeClient.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        system: systemPrompt,
        messages: formatConversationForClaude(conversation)
      });
      
      res.json({
        success: true,
        response: response.content[0].text
      });
    } 
    else if (llm === 'chatgpt') {
      if (!openaiClient) {
        return res.status(400).json({ success: false, message: "ChatGPT API key not configured" });
      }
      
      // Make the actual API call to ChatGPT
      const systemMessage = { role: 'system', content: systemPrompt };
      const formattedMessages = [systemMessage, ...formatConversationForChatGPT(conversation)];
      
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: formattedMessages
      });
      
      res.json({
        success: true,
        response: response.choices[0].message.content
      });
    } 
    else {
      return res.status(400).json({ success: false, message: "Invalid LLM selection" });
    }
  } catch (error) {
    console.error("Error getting LLM response:", error);
    res.status(500).json({ success: false, message: `Error getting response from LLM: ${error.message}` });
  }
});

// Generate prompt endpoint
app.post('/api/generate-prompt', async (req, res) => {
  const { level, conversation, llm } = req.body;
  
  try {
    // Extract meaningful context from the conversation
    const userMessages = conversation.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages.pop()?.content || "";
    const previousUserMessages = userMessages.map(msg => msg.content);
    
    // Create a more advanced meta-prompt that handles unstructured inputs better
    let metaPrompt = "";
    
    if (level === "quick") {
      metaPrompt = `
      Generate a concise, effective prompt based on this user input: "${lastUserMessage}"
      
      Context from previous messages (if any):
      ${previousUserMessages.length > 0 ? previousUserMessages.join("\n") : "No previous context"}
      
      Follow these guidelines:
      1. CONTEXT RECOGNITION: Identify the core intent and subject matter.
      2. DECOMPOSITION: Break down any complex elements in the input.
      3. PRIORITIZATION: Structure the prompt with main goals first, then supporting details.
      4. CONTEXTUAL ENHANCEMENT: Add relevant context that might be missing.
      5. FORMAT: Structure as "Write a [type] about [main focus], including [details]" 
      
      If the input is ambiguous, make reasonable assumptions but create a clear, focused prompt.
      The prompt should be concise (1-2 sentences) and ready to use with an AI assistant.
      `;
    } 
    else if (level === "detailed") {
      metaPrompt = `
      Generate a detailed, comprehensive prompt based on this user input: "${lastUserMessage}"
      
      Context from previous messages (if any):
      ${previousUserMessages.length > 0 ? previousUserMessages.join("\n") : "No previous context"}
      
      Follow these guidelines:
      1. CONTEXT RECOGNITION: Thoroughly analyze the intent, subject matter, and implied needs.
      2. DECOMPOSITION: Break down all elements in the input into actionable components.
      3. PRIORITIZATION: Structure the prompt with critical details first, then supporting elements.
      4. CONTEXTUAL ENHANCEMENT: Add relevant context, implications, or best practices that would improve the prompt.
      5. FORMAT: Structure as "Create a comprehensive [type] about [main focus], including [details], covering [aspects], with attention to [nuances]"
      
      If the input is ambiguous, make reasonable assumptions but create a focused, thorough prompt.
      The prompt should be detailed (3-5 sentences) and ready to use with an AI assistant.
      `;
    } 
    else if (level === "legendary") {
      metaPrompt = `
      Generate an expert-level, comprehensive prompt based on this user input: "${lastUserMessage}"
      
      Context from previous messages (if any):
      ${previousUserMessages.length > 0 ? previousUserMessages.join("\n") : "No previous context"}
      
      Follow these guidelines:
      1. CONTEXT RECOGNITION: Conduct deep analysis of explicit and implicit intent, subject matter, and needs.
      2. DECOMPOSITION: Break down all elements into detailed, actionable components and identify their relationships.
      3. PRIORITIZATION: Create a hierarchical structure with primary focus, secondary elements, tertiary details.
      4. CONTEXTUAL ENHANCEMENT: Significantly enrich with relevant context, implications, best practices, examples, and creative angles.
      5. FORMAT: Structure as "Develop a comprehensive, authoritative [type] on [main focus] that addresses [aspects], examines [perspectives], incorporates [techniques/methods], navigates [challenges], and culminates in [outcome/insight]"
      
      Even if the input is brief or ambiguous, create a rich, nuanced prompt that would generate exceptional results.
      The prompt should be highly detailed (5-8 sentences) and ready to use with an AI assistant.
      `;
    }
    
    if (llm === 'claude' && claudeClient) {
      const response = await claudeClient.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: metaPrompt }]
      });
      
      res.json({
        success: true,
        prompt: response.content[0].text
      });
    }
    else if (llm === 'chatgpt' && openaiClient) {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: metaPrompt }]
      });
      
      res.json({
        success: true,
        prompt: response.choices[0].message.content
      });
    }
    else {
      // Fallback to template-based prompts if API clients aren't available
      // Extract a topic from the conversation
      const words = lastUserMessage.split(' ');
      const possibleTopics = words.filter(word => 
        word.length > 3 && 
        !['what', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were', 'should', 'would', 'could', 'the', 'and', 'but'].includes(word.toLowerCase())
      );
      
      const topic = possibleTopics.length > 0 ? possibleTopics[0] : "your topic";
      
      let promptTemplate = "";
      
      if (level === "quick") {
        promptTemplate = "Write a concise blog post about [TOPIC] covering the main points and benefits.";
      } 
      else if (level === "detailed") {
        promptTemplate = "Create a comprehensive guide on [TOPIC] that includes historical context, current applications, step-by-step instructions, and common pitfalls to avoid.";
      } 
      else if (level === "legendary") {
        promptTemplate = "Create an expert-level masterclass on [TOPIC] that synthesizes cutting-edge research, provides nuanced analysis of complex edge cases, includes practical applications with varying difficulty levels, addresses common misconceptions with evidence-based corrections, and concludes with forward-looking predictions about how this field might evolve in the next 5-10 years.";
      }
      
      const prompt = promptTemplate.replace("[TOPIC]", topic);
      
      res.json({
        success: true,
        prompt: prompt
      });
    }
  } catch (error) {
    console.error("Error generating prompt:", error);
    res.status(500).json({ success: false, message: `Error generating prompt: ${error.message}` });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});