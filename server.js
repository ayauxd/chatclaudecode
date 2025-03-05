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
let botName = process.env.BOT_NAME || "CrackedBot";
let brandName = process.env.BRAND_NAME || "Cracked Prompts";
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
    defaultLLM: defaultLLM,
    botName: botName,
    brandName: brandName
  });
});

// Function to validate if a response meets the criteria for the current mode
function isValidResponse(response, style, contextDepth) {
  // Check if response is concise enough for the style
  const wordCount = response.split(/\s+/).length;
  
  const maxWords = {
    'concise': 30,       // Quick Prompts: Max 30 words
    'thorough': 60,      // Detailed Prompts: Max 60 words
    'highly detailed': 100  // Legendary Mode: Max 100 words
  }[style] || 30;
  
  // If response is too long, it fails validation
  if (wordCount > maxWords) {
    return false;
  }
  
  // Check if response is conversational (has questions, etc.)
  const hasQuestion = response.includes('?');
  const hasConversationalMarkers = /\b(let's|how about|what if|tell me|share more|love|great)\b/i.test(response);
  
  // Adjust requirements based on context depth
  if (contextDepth < 3) {
    // For low context, we need questions to gather more info
    return hasQuestion || hasConversationalMarkers;
  } else if (contextDepth < 6) {
    // For medium context, conversational markers are enough
    return hasConversationalMarkers;
  } else {
    // For high context, it can be more direct
    return true;
  }
}

// Function to enforce the conversational style
function enforceConversationalStyle(response, style, tone, contextDepth) {
  // If the response is already valid, return it
  if (isValidResponse(response, style, contextDepth)) {
    return response;
  }
  
  // Trim the response if it's too long
  const words = response.split(/\s+/);
  const maxWords = {
    'concise': 30,
    'thorough': 60,
    'highly detailed': 100
  }[style] || 30;
  
  let trimmedResponse = words.slice(0, maxWords).join(' ');
  
  // Ensure it ends with proper punctuation
  if (!trimmedResponse.endsWith('.') && !trimmedResponse.endsWith('?') && !trimmedResponse.endsWith('!')) {
    trimmedResponse += '.';
  }
  
  // If low context depth, add a question to gather more info
  if (contextDepth < 3 && !trimmedResponse.includes('?')) {
    const questions = {
      'confused': " Can you clarify what you're looking for?",
      'excited': " What specific aspect gets you most excited?",
      'frustrated': " What part seems most challenging to you?",
      'neutral': " What more can you tell me about this?"
    };
    
    trimmedResponse += questions[tone] || questions['neutral'];
  }
  
  // Add a conversational marker if needed
  if (!(/\b(let's|how about|what if|tell me|share more|love|great)\b/i.test(trimmedResponse))) {
    const markers = {
      'concise': " Let's explore this a bit more.",
      'thorough': " I'd love to hear more about your specific goals.",
      'highly detailed': " Let's dig into the details to create something exceptional."
    };
    
    trimmedResponse += markers[style] || markers['concise'];
  }
  
  // Add brand reference if not present
  if (!trimmedResponse.includes(brandName)) {
    trimmedResponse = trimmedResponse.replace(/\.$/, ` for ${brandName}.`);
  }
  
  return trimmedResponse;
}

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

// Detect user tone from input
function detectUserTone(input) {
  const lowerInput = input.toLowerCase();
  
  // Check for confusion indicators
  if (lowerInput.includes('what?') || lowerInput.includes('confused') || 
      (lowerInput.includes('?') && lowerInput.length < 20)) {
    return 'confused';
  }
  
  // Check for excitement/enthusiasm
  if (lowerInput.includes('love') || lowerInput.includes('excit') || 
      lowerInput.includes('great') || lowerInput.includes('awesome') ||
      lowerInput.includes('amazing')) {
    return 'excited';
  }
  
  // Check for negativity/frustration
  if (lowerInput.includes('not working') || lowerInput.includes('bad') ||
      lowerInput.includes('awful') || lowerInput.includes('terrible')) {
    return 'frustrated';
  }
  
  return 'neutral';
}

// Evaluate context depth from conversation
function evaluateContextDepth(input, history) {
  // Common keywords for context analysis
  const keywords = [
    'ai', 'consulting', 'writing', 'trip', 'story', 'code', 'travel', 
    'business', 'project', 'design', 'marketing', 'creative', 'education',
    'prompt', 'research', 'article', 'blog', 'essay', 'report', 'guide'
  ];
  
  // Calculate specificity score based on keywords in input
  const words = input.toLowerCase().split(/\s+/);
  const specificityScore = words.filter(word => 
    keywords.includes(word) || keywords.some(kw => word.includes(kw))
  ).length;
  
  // Calculate coherence based on message history
  const userMessages = history.filter(msg => msg.role === 'user');
  const coherenceScore = userMessages.length * 0.5;
  
  // Look for specificity indicators
  const hasSpecifics = /specific|detailed|focus|exactly|precise/i.test(input);
  const specBonus = hasSpecifics ? 2 : 0;
  
  // Calculate total contextual depth
  return specificityScore + coherenceScore + specBonus;
}

// Get LLM response endpoint
app.post('/api/get-response', async (req, res) => {
  const { llm, conversation, style } = req.body;
  
  try {
    // Get last user message
    const lastUserMsg = conversation.filter(msg => msg.role === 'user').pop()?.content || "";
    
    // Detect tone and evaluate context depth
    const userTone = detectUserTone(lastUserMsg);
    const contextDepth = evaluateContextDepth(lastUserMsg, conversation);
    
    // Enhanced system prompt with simplified logic matching the pseudocode
    let systemPrompt = "";
    
    if (style === "concise") {
      systemPrompt = `
        CrackedLLM response: You are a conversational prompt assistant for Crack Prompts. Provide a ${style} response.
        
        The user's tone appears to be: ${userTone}
        The conversation's context depth is: ${contextDepth}/10
        
        Guidelines:
        1. Keep responses brief and conversational (max 1-2 sentences).
        2. Match the user's tone - ${userTone}:
           - If confused: Clarify gently, "No worries, I can clarify! Are you asking about X or Y?"
           - If excited: Match enthusiasm, "Love that energy! What's the next piece of this idea?"
           - If frustrated: Be helpful, "Let's fix this. What specifically isn't working?"
           - If neutral: Be friendly, "That's a great start! What vibe are you aiming for?"
        
        3. Focus on gathering just one more piece of context with each exchange.
           - Ask targeted questions about the user's goal, audience, or specific details.
           - If they mention multiple elements (e.g., "travel, Japan, temples"), ask about one specific aspect.
        
        4. DON'T give general advice - your purpose is to gather context for prompt generation, not to be a general AI assistant.
        
        Your goal is to guide the user toward creating prompts through friendly conversation.
      `;
    } 
    else if (style === "thorough") {
      systemPrompt = `
        CrackedLLM response: You are a conversational prompt assistant for Crack Prompts. Provide a ${style} response.
        
        The user's tone appears to be: ${userTone}
        The conversation's context depth is: ${contextDepth}/10
        
        Guidelines:
        1. Keep responses conversational but more detailed (2-3 sentences).
        2. Match the user's tone - ${userTone}:
           - If confused: Offer clear explanations, "I see where the confusion might be. Let me clarify..."
           - If excited: Build on their enthusiasm, "That's fantastic! Let's explore this idea more..."
           - If frustrated: Be supportive, "I understand that can be frustrating. Let's tackle this together by..."
           - If neutral: Be engaging, "That's a solid start! Let's dig deeper into..."
        
        3. Focus on gathering 2-3 more pieces of context:
           - Ask about related aspects that would enhance the prompt.
           - If they mention a topic, explore the purpose, audience, and tone they want.
        
        4. Add relevant suggestions that could enhance their idea, but stay focused on prompt creation.
        
        5. Occasionally, if appropriate, you can say: "Oh yeah, we're on a roll! We have enough for a detailed prompt—want to see it?"
        
        Your goal is to guide the user toward creating richer prompts through conversation.
      `;
    }
    else if (style === "highly detailed") {
      systemPrompt = `
        CrackedLLM response: You are a conversational prompt assistant for Crack Prompts. Provide a ${style} response.
        
        The user's tone appears to be: ${userTone}
        The conversation's context depth is: ${contextDepth}/10
        
        Guidelines:
        1. Provide more comprehensive responses (3-4 sentences), but keep them conversational.
        2. Match and enhance the user's tone - ${userTone}:
           - If confused: Offer thorough clarification with examples, "That's a great question. Let me break this down..."
           - If excited: Mirror their enthusiasm and build it further, "I'm thrilled you're excited about this! This could be amazing because..."
           - If frustrated: Be especially supportive, "I completely understand your frustration. Here's how we can approach this differently..."
           - If neutral: Add enthusiasm, "That's a fascinating direction! Let's explore how we could take this to the next level..."
        
        3. Gather rich, nuanced details:
           - Ask about creative angles, emotional resonance, or unexpected connections.
           - Suggest potential directions they might not have considered.
           - Connect their idea to broader contexts or applications.
        
        4. Occasionally, if appropriate, you can say: "Wow, we're really cooking now! This is turning into something legendary—want to see what I can craft with this?"
        
        Your goal is to guide the user toward creating exceptional, legendary prompts through rich conversation.
      `;
    }
    else {
      systemPrompt = `CrackedLLM response: Provide a ${style} response matching the user's tone of ${userTone}.`;
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
      
      // Extract the response text
      let responseText = response.content[0].text;
      
      // Calculate context depth for validation
      const contextDepth = evaluateContextDepth(lastUserMsg, conversation);
      
      // Enforce the conversational style
      responseText = enforceConversationalStyle(responseText, style, userTone, contextDepth);
      
      // Prepend the bot name if not already present
      if (!responseText.startsWith(`${botName} says:`)) {
        responseText = `${botName} says: ${responseText}`;
      }
      
      res.json({
        success: true,
        response: responseText
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
      
      // Extract the response text
      let responseText = response.choices[0].message.content;
      
      // Calculate context depth for validation
      const contextDepth = evaluateContextDepth(lastUserMsg, conversation);
      
      // Enforce the conversational style
      responseText = enforceConversationalStyle(responseText, style, userTone, contextDepth);
      
      // Prepend the bot name if not already present
      if (!responseText.startsWith(`${botName} says:`)) {
        responseText = `${botName} says: ${responseText}`;
      }
      
      res.json({
        success: true,
        response: responseText
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
    // Extract all user messages from conversation
    const userMessages = conversation.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages.pop()?.content || "";
    const previousUserMessages = userMessages.map(msg => msg.content);
    
    // Get full conversation context
    const contextText = conversation.map(msg => `${msg.role}: ${msg.content}`).join("\n");
    
    // Simplified meta-prompt following the new logic
    let metaPrompt = "";
    
    if (level === "quick") {
      metaPrompt = `
      Generate a concise, effective prompt based on the following conversation:
      
      ${contextText}
      
      Guidelines for Quick Prompt:
      1. Keep it simple and clear (1-2 sentences).
      2. Focus on the main topic or goal mentioned in the conversation.
      3. Format as: "Write a [type] about [main focus], focusing on [key aspect]."
      4. Make it ready to use with any AI assistant.
      5. If the conversation is ambiguous, create a clear, focused prompt that captures the essence.
      
      The prompt should be concise and effective. Do not include explanations or context in your response, just the ready-to-use prompt.
      `;
    } 
    else if (level === "detailed") {
      metaPrompt = `
      Generate a detailed, comprehensive prompt based on the following conversation:
      
      ${contextText}
      
      Guidelines for Detailed Prompt:
      1. Create a more comprehensive prompt (2-3 sentences).
      2. Incorporate multiple elements from the conversation, including context, goals, and specific details.
      3. Format as: "Create a comprehensive [type] about [main focus], including [details], covering [aspects], with attention to [nuances]."
      4. Add contextual elements that would make the output more valuable.
      5. Make it ready to use with any AI assistant.
      
      The prompt should be detailed and effective. Do not include explanations or context in your response, just the ready-to-use prompt.
      `;
    } 
    else if (level === "legendary") {
      metaPrompt = `
      Generate an expert-level, comprehensive prompt based on the following conversation:
      
      ${contextText}
      
      Guidelines for Legendary Prompt:
      1. Create a rich, nuanced prompt (3-5 sentences).
      2. Incorporate all elements from the conversation, including subtle context, implied goals, and creative directions.
      3. Format as: "Develop a comprehensive, authoritative [type] on [main focus] that addresses [aspects], examines [perspectives], incorporates [techniques/methods], navigates [challenges], and culminates in [outcome/insight]."
      4. Include creative angles, emotional elements, or specialized approaches.
      5. Make it ready to use with any AI assistant.
      
      The prompt should be exceptional and inspiring. Do not include explanations or context in your response, just the ready-to-use prompt.
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