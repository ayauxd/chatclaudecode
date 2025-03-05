document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('messages');
    const thinkingIndicator = document.getElementById('thinking-indicator');
    const progressIndicator = document.getElementById('progress-indicator');
    const tierQuickIndicator = document.getElementById('tier-quick');
    const tierDetailedIndicator = document.getElementById('tier-detailed');
    const tierLegendaryIndicator = document.getElementById('tier-legendary');

    // Chat Tier States
    const TIERS = {
        INITIAL: 'initial',
        QUICK: 'quick',
        DETAILED: 'detailed',
        LEGENDARY: 'legendary'
    };

    // LLM Selection (default to Claude)
    let selectedLLM = 'claude';
    
    // API key status
    let apiKeysConfigured = {
        claude: false,
        chatgpt: false
    };

    // Conversation state
    let currentTier = TIERS.INITIAL;
    let interactionCount = 0;
    let botMessageCount = 0;
    let conversationHistory = [];
    
    // Chat Content Templates
    const tierMessages = {
        [TIERS.INITIAL]: {
            greeting: "Hello! I can help you craft effective AI prompts. What topic are you interested in? (You'll need to set your API keys to get started)",
            thinking: "Thinking...",
            progressWidth: "10%"
        },
        [TIERS.QUICK]: {
            prefix: "Let me explore",
            thinking: "Crafting a quick prompt for you...",
            progressWidth: "33%",
            responseStyle: "concise"
        },
        [TIERS.DETAILED]: {
            prefix: "I'd like to dig deeper into",
            thinking: "Creating a more detailed prompt...",
            progressWidth: "66%",
            responseStyle: "thorough"
        },
        [TIERS.LEGENDARY]: {
            prefix: "Now I can create an expert-level prompt for",
            thinking: "Generating a comprehensive prompt...",
            progressWidth: "100%",
            responseStyle: "highly detailed"
        }
    };

    // Tier upgrade messages
    const tierUpgradeMessages = {
        [TIERS.QUICK]: "Quick Prompts activated! I can now generate basic prompts for your needs.",
        [TIERS.DETAILED]: "Detailed Prompts unlocked! I can now create more comprehensive prompts with better context.",
        [TIERS.LEGENDARY]: "Legendary Mode activated! I'll craft expert-level prompts with depth and nuance."
    };

    // Evolving phrases for each tier
    const evolvingPhrases = {
        [TIERS.QUICK]: (topic) => `Tell me more about ${topic}.`,
        [TIERS.DETAILED]: (topic) => `Intriguing, let's dig deeper into ${topic}.`,
        [TIERS.LEGENDARY]: (topic) => `Whoa, this is getting deep with ${topic}, I'm liking where this is going!`
    };

    // Prompt card messages
    const promptCardMessages = [
        "I might have something for you, check this out:",
        "What do you think about this?",
        "This is some deep research material:"
    ];

    // Function to add a message to the chat
    function addMessage(text, isUser = false, role = isUser ? 'user' : 'assistant') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isUser ? 'user-message' : 'bot-message');
        messageElement.textContent = text;
        
        // Add to conversation history
        conversationHistory.push({ role: role, content: text });
        
        // Add tier-specific styling to bot messages
        if (!isUser) {
            botMessageCount++;
            
            // Apply tier styling based on current tier
            if (currentTier === TIERS.QUICK) {
                messageElement.classList.add('tier-1');
            } else if (currentTier === TIERS.DETAILED) {
                messageElement.classList.add('tier-2');
            } else if (currentTier === TIERS.LEGENDARY) {
                messageElement.classList.add('tier-3');
            }
        }
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageElement;
    }

    // Function to add a tier upgrade notification
    function addTierUpgradeNotification(tier) {
        if (!tierUpgradeMessages[tier]) return;
        
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('tier-upgrade');
        
        // Add tier-specific styling
        if (tier === TIERS.DETAILED) {
            notificationElement.classList.add('tier-2');
        } else if (tier === TIERS.LEGENDARY) {
            notificationElement.classList.add('tier-3');
        }
        
        notificationElement.textContent = tierUpgradeMessages[tier];
        messagesContainer.appendChild(notificationElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Remove the notification after some time
        setTimeout(() => {
            notificationElement.style.opacity = '0';
            setTimeout(() => {
                messagesContainer.removeChild(notificationElement);
            }, 500);
        }, 5000);
    }

    // Function to add a prompt card
    function addPromptCard(title, promptText) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('prompt-card');
        
        // Add tier-specific card styling
        if (currentTier === TIERS.DETAILED) {
            cardElement.classList.add('tier-2');
        } else if (currentTier === TIERS.LEGENDARY) {
            cardElement.classList.add('tier-3');
        }
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        
        const textElement = document.createElement('p');
        textElement.textContent = promptText;
        
        cardElement.appendChild(titleElement);
        cardElement.appendChild(textElement);
        
        messagesContainer.appendChild(cardElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Add click to copy functionality
        cardElement.addEventListener('click', () => {
            navigator.clipboard.writeText(promptText)
                .then(() => {
                    // Visual feedback that prompt was copied
                    cardElement.style.borderColor = 'var(--brand-color)';
                    cardElement.style.boxShadow = 'var(--shadow-md)';
                    
                    setTimeout(() => {
                        cardElement.style.borderColor = '';
                        cardElement.style.boxShadow = '';
                    }, 300);
                    
                    // Add a small notification
                    const notification = document.createElement('div');
                    notification.textContent = 'Prompt copied to clipboard';
                    notification.style.position = 'fixed';
                    notification.style.bottom = '20px';
                    notification.style.left = '50%';
                    notification.style.transform = 'translateX(-50%)';
                    notification.style.padding = '8px 16px';
                    notification.style.backgroundColor = 'var(--text-dark)';
                    notification.style.color = 'var(--text-light)';
                    notification.style.borderRadius = '4px';
                    notification.style.fontSize = '14px';
                    notification.style.boxShadow = 'var(--shadow-md)';
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.2s ease';
                    notification.style.zIndex = '1000';
                    
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        notification.style.opacity = '1';
                    }, 10);
                    
                    setTimeout(() => {
                        notification.style.opacity = '0';
                        setTimeout(() => {
                            document.body.removeChild(notification);
                        }, 200);
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy prompt: ', err);
                });
        });
        
        return cardElement;
    }

    // Function to show the thinking indicator
    function showThinking(message = "Thinking...") {
        thinkingIndicator.querySelector('span').textContent = message;
        thinkingIndicator.classList.remove('hidden');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Function to hide the thinking indicator
    function hideThinking() {
        thinkingIndicator.classList.add('hidden');
    }

    // Function to update the tier indicators
    function updateTierIndicators() {
        // Reset all indicators
        tierQuickIndicator.classList.remove('active');
        tierDetailedIndicator.classList.remove('active');
        tierLegendaryIndicator.classList.remove('active');
        
        // Activate based on current tier - shows progression
        if (currentTier === TIERS.QUICK) {
            tierQuickIndicator.classList.add('active');
            progressIndicator.style.width = tierMessages[TIERS.QUICK].progressWidth;
        } else if (currentTier === TIERS.DETAILED) {
            tierQuickIndicator.classList.add('active');
            tierDetailedIndicator.classList.add('active');
            progressIndicator.style.width = tierMessages[TIERS.DETAILED].progressWidth;
        } else if (currentTier === TIERS.LEGENDARY) {
            tierQuickIndicator.classList.add('active');
            tierDetailedIndicator.classList.add('active');
            tierLegendaryIndicator.classList.add('active');
            progressIndicator.style.width = tierMessages[TIERS.LEGENDARY].progressWidth;
        }
    }

    // Function to evaluate context depth
    function evaluateContextDepth() {
        // Get all user messages
        const userMessages = conversationHistory.filter(msg => msg.role === 'user');
        if (userMessages.length === 0) return 0;
        
        // Common keywords to look for
        const keywords = [
            'ai', 'consulting', 'writing', 'trip', 'story', 'code', 'travel', 
            'business', 'project', 'design', 'marketing', 'creative', 'education',
            'prompt', 'research', 'article', 'blog', 'essay', 'report', 'guide'
        ];
        
        // Calculate score based on message count, specificity, and coherence
        let score = 0;
        
        // Base score from message count (more messages = more context)
        score += Math.min(userMessages.length * 0.5, 3);
        
        // Check for specificity in the last 3 messages
        const recentMessages = userMessages.slice(-3);
        recentMessages.forEach(msg => {
            const content = msg.content.toLowerCase();
            
            // Check for keywords
            keywords.forEach(keyword => {
                if (content.includes(keyword)) score += 0.3;
            });
            
            // Check for specificity indicators
            if (/specific|detailed|focus|exactly|precise/i.test(content)) score += 0.5;
            
            // Check for question responses (shows engagement)
            if (content.includes('?') && content.length > 20) score += 0.5;
            
            // Length indicates detail
            score += Math.min(content.length / 100, 1);
        });
        
        return Math.min(score, 10);
    }
    
    // Function to check if we have enough context for a tier
    function hasEnoughContextForTier(tier) {
        const depth = evaluateContextDepth();
        
        if (tier === TIERS.QUICK) {
            return depth >= 2 && interactionCount >= 1;
        } else if (tier === TIERS.DETAILED) {
            return depth >= 4 && interactionCount >= 3;
        } else if (tier === TIERS.LEGENDARY) {
            return depth >= 6 && interactionCount >= 5;
        }
        
        return false;
    }
    
    // Function to update the tier based on interaction count and context depth
    function updateTier() {
        const previousTier = currentTier;
        
        // Start with interaction-based progression
        if (interactionCount === 0) {
            currentTier = TIERS.INITIAL;
        } else if (hasEnoughContextForTier(TIERS.LEGENDARY)) {
            currentTier = TIERS.LEGENDARY;
        } else if (hasEnoughContextForTier(TIERS.DETAILED)) {
            currentTier = TIERS.DETAILED;
        } else if (hasEnoughContextForTier(TIERS.QUICK)) {
            currentTier = TIERS.QUICK;
        }
        
        // If tier changed, update the UI
        if (previousTier !== currentTier && currentTier !== TIERS.INITIAL) {
            // Update tier indicators
            updateTierIndicators();
            
            // Show tier upgrade notification (except for the first tier)
            if (previousTier !== TIERS.INITIAL) {
                addTierUpgradeNotification(currentTier);
            }
        }
        
        return previousTier !== currentTier;
    }

    // Function to extract a meaningful topic from user input
    function extractTopic(userInput) {
        // Simple keyword extraction (could be more sophisticated with AI)
        const words = userInput.split(' ');
        const keywords = words.filter(word => 
            word.length > 3 && 
            !['what', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were', 'should', 'would', 'could', 'the', 'and', 'but'].includes(word.toLowerCase())
        );
        
        // Take last 2-3 meaningful words as the topic
        const topic = keywords.slice(-Math.min(3, keywords.length)).join(' ');
        return topic || userInput.split(' ').slice(-2).join(' '); // Fallback
    }

    // Function to create tooltips for the tier indicators
    function createTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.textContent = text;
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'var(--text-dark)';
        tooltip.style.color = 'var(--text-light)';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.bottom = '100%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.marginBottom = '10px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.zIndex = '100';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s ease';
        tooltip.style.pointerEvents = 'none';
        
        // Add arrow
        const arrow = document.createElement('div');
        arrow.style.position = 'absolute';
        arrow.style.top = '100%';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.width = '0';
        arrow.style.height = '0';
        arrow.style.borderLeft = '6px solid transparent';
        arrow.style.borderRight = '6px solid transparent';
        arrow.style.borderTop = '6px solid var(--text-dark)';
        
        tooltip.appendChild(arrow);
        element.appendChild(tooltip);
        
        element.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
    }

    // Function to configure API keys
    async function configureApiKeys() {
        // For demo purposes, create a simple form to input API keys
        const configModal = document.createElement('div');
        configModal.style.position = 'fixed';
        configModal.style.top = '0';
        configModal.style.left = '0';
        configModal.style.width = '100%';
        configModal.style.height = '100%';
        configModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        configModal.style.display = 'flex';
        configModal.style.justifyContent = 'center';
        configModal.style.alignItems = 'center';
        configModal.style.zIndex = '1000';
        
        const configForm = document.createElement('div');
        configForm.style.backgroundColor = 'var(--input-bg)';
        configForm.style.padding = '24px';
        configForm.style.borderRadius = 'var(--border-radius-md)';
        configForm.style.boxShadow = 'var(--shadow-lg)';
        configForm.style.width = '90%';
        configForm.style.maxWidth = '500px';
        
        const title = document.createElement('h3');
        title.textContent = 'Configure API Keys';
        title.style.marginBottom = '16px';
        title.style.fontSize = '18px';
        title.style.fontWeight = '600';
        
        const claudeLabel = document.createElement('label');
        claudeLabel.textContent = 'Claude API Key:';
        claudeLabel.style.display = 'block';
        claudeLabel.style.marginBottom = '4px';
        claudeLabel.style.fontSize = '14px';
        
        const claudeInput = document.createElement('input');
        claudeInput.type = 'password';
        claudeInput.placeholder = 'Enter Claude API Key';
        claudeInput.style.width = '100%';
        claudeInput.style.padding = '8px 12px';
        claudeInput.style.marginBottom = '16px';
        claudeInput.style.borderRadius = '4px';
        claudeInput.style.border = '1px solid var(--border-color)';
        
        const chatgptLabel = document.createElement('label');
        chatgptLabel.textContent = 'ChatGPT API Key:';
        chatgptLabel.style.display = 'block';
        chatgptLabel.style.marginBottom = '4px';
        chatgptLabel.style.fontSize = '14px';
        
        const chatgptInput = document.createElement('input');
        chatgptInput.type = 'password';
        chatgptInput.placeholder = 'Enter ChatGPT API Key';
        chatgptInput.style.width = '100%';
        chatgptInput.style.padding = '8px 12px';
        chatgptInput.style.marginBottom = '16px';
        chatgptInput.style.borderRadius = '4px';
        chatgptInput.style.border = '1px solid var(--border-color)';
        
        const llmLabel = document.createElement('label');
        llmLabel.textContent = 'Select LLM:';
        llmLabel.style.display = 'block';
        llmLabel.style.marginBottom = '4px';
        llmLabel.style.fontSize = '14px';
        
        const llmSelect = document.createElement('select');
        llmSelect.style.width = '100%';
        llmSelect.style.padding = '8px 12px';
        llmSelect.style.marginBottom = '24px';
        llmSelect.style.borderRadius = '4px';
        llmSelect.style.border = '1px solid var(--border-color)';
        
        const claudeOption = document.createElement('option');
        claudeOption.value = 'claude';
        claudeOption.textContent = 'Claude';
        
        const chatgptOption = document.createElement('option');
        chatgptOption.value = 'chatgpt';
        chatgptOption.textContent = 'ChatGPT';
        
        llmSelect.appendChild(claudeOption);
        llmSelect.appendChild(chatgptOption);
        
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Save Configuration';
        submitButton.style.backgroundColor = 'var(--brand-color)';
        submitButton.style.color = 'var(--text-light)';
        submitButton.style.border = 'none';
        submitButton.style.padding = '8px 16px';
        submitButton.style.borderRadius = '4px';
        submitButton.style.cursor = 'pointer';
        submitButton.style.width = '100%';
        
        // Add elements to form
        configForm.appendChild(title);
        configForm.appendChild(claudeLabel);
        configForm.appendChild(claudeInput);
        configForm.appendChild(chatgptLabel);
        configForm.appendChild(chatgptInput);
        configForm.appendChild(llmLabel);
        configForm.appendChild(llmSelect);
        configForm.appendChild(submitButton);
        
        // Add form to modal
        configModal.appendChild(configForm);
        
        // Add modal to document
        document.body.appendChild(configModal);
        
        // Handle form submission
        return new Promise((resolve) => {
            submitButton.addEventListener('click', async () => {
                const claudeKey = claudeInput.value.trim();
                const chatgptKey = chatgptInput.value.trim();
                const llm = llmSelect.value;
                
                // Validate at least one API key is provided
                if (!claudeKey && !chatgptKey) {
                    alert('Please provide at least one API key.');
                    return;
                }
                
                // Save selected LLM
                selectedLLM = llm;
                
                // Make API call to configure keys
                try {
                    const response = await fetch('/api/config', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            claude_api_key: claudeKey,
                            chatgpt_api_key: chatgptKey
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Update API key status
                        apiKeysConfigured.claude = !!claudeKey;
                        apiKeysConfigured.chatgpt = !!chatgptKey;
                        
                        // Remove modal
                        document.body.removeChild(configModal);
                        
                        // Resolve with success
                        resolve(true);
                    } else {
                        alert('Failed to configure API keys. Please try again.');
                        resolve(false);
                    }
                } catch (error) {
                    console.error('Error configuring API keys:', error);
                    alert('An error occurred while configuring API keys. Please try again.');
                    resolve(false);
                }
            });
        });
    }

    // Function to get LLM response
    async function getLLMResponse(style) {
        try {
            const response = await fetch('/api/get-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    llm: selectedLLM,
                    conversation: conversationHistory,
                    style: style
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                return data.response;
            } else {
                console.error('Error getting LLM response:', data.message);
                return `Error: ${data.message}`;
            }
        } catch (error) {
            console.error('Error calling API:', error);
            return 'Sorry, I encountered an error while processing your request.';
        }
    }

    // Function to generate prompt
    async function generatePrompt(level) {
        try {
            const response = await fetch('/api/generate-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    level: level,
                    conversation: conversationHistory,
                    llm: selectedLLM
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                return data.prompt;
            } else {
                console.error('Error generating prompt:', data.message);
                return `Error: ${data.message}`;
            }
        } catch (error) {
            console.error('Error calling API:', error);
            return 'Sorry, I encountered an error while generating a prompt.';
        }
    }

    // Function to get evolving phrase
    function getEvolvingPhrase(tier, userInput) {
        const topic = extractTopic(userInput);
        return evolvingPhrases[tier](topic);
    }
    
    // Function to detect ambiguity in user input
    function detectAmbiguity(userInput) {
        // Simple ambiguity detection based on input length and vague terms
        const isShort = userInput.split(' ').length < 3;
        const hasVagueTerms = /\b(something|stuff|things|cool|nice|good|interesting|anything)\b/i.test(userInput);
        const lacksSpecifics = !/\b(how|what|why|when|where|who|which)\b/i.test(userInput);
        
        return isShort || (hasVagueTerms && lacksSpecifics);
    }
    
    // Function to suggest refinements based on previous prompts
    function suggestRefinement(prompt) {
        // This would be more sophisticated in a production environment
        // For now, we'll suggest basic refinements based on prompt length
        const words = prompt.split(' ').length;
        
        if (words < 10) {
            return "Would you like to add more details to make this prompt more specific?";
        } else if (words < 20) {
            return "This prompt looks good. Want to add a specific style or format requirement?";
        } else {
            return "This is a detailed prompt. Would you like to refine any particular aspect?";
        }
    }

    // Add initial bot message
    addMessage(tierMessages[TIERS.INITIAL].greeting);

    // Check if API keys are pre-configured on the server
    async function checkPreConfiguredKeys() {
        try {
            const response = await fetch('/api/check-config');
            const data = await response.json();
            
            if (data.success) {
                // Set the configured APIs and selected LLM
                apiKeysConfigured.claude = data.claudeConfigured;
                apiKeysConfigured.chatgpt = data.chatgptConfigured;
                selectedLLM = data.defaultLLM;
                
                if (apiKeysConfigured.claude || apiKeysConfigured.chatgpt) {
                    addMessage(`API keys are pre-configured! Using ${selectedLLM} for responses. You can start chatting now.`);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error checking pre-configured keys:', error);
            return false;
        }
    }

    // Create a "Configure API Keys" button (shown only if keys aren't pre-configured)
    const configButton = document.createElement('button');
    configButton.textContent = 'Configure API Keys';
    configButton.style.backgroundColor = 'var(--brand-color)';
    configButton.style.color = 'var(--text-light)';
    configButton.style.border = 'none';
    configButton.style.padding = '8px 16px';
    configButton.style.borderRadius = '4px';
    configButton.style.marginBottom = '16px';
    configButton.style.cursor = 'pointer';
    configButton.style.alignSelf = 'center';
    
    configButton.addEventListener('click', async () => {
        await configureApiKeys();
        
        // If API keys are configured, update the UI
        if (apiKeysConfigured.claude || apiKeysConfigured.chatgpt) {
            configButton.style.display = 'none';
            addMessage(`API keys configured! Using ${selectedLLM} for responses. You can start chatting now.`);
        }
    });
    
    // Check for pre-configured keys, only show button if needed
    checkPreConfiguredKeys().then(preConfigured => {
        if (!preConfigured) {
            messagesContainer.appendChild(configButton);
        }
    });

    // Handle form submission
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userMessage = messageInput.value.trim();
        if (!userMessage) return;
        
        // Check if API keys are configured
        if (!apiKeysConfigured.claude && !apiKeysConfigured.chatgpt) {
            alert('Please configure API keys first.');
            return;
        }
        
        // Add user message to chat
        addMessage(userMessage, true);
        messageInput.value = '';
        messageInput.style.height = 'auto'; // Reset height
        
        // Check for ambiguity in user input
        const isAmbiguous = detectAmbiguity(userMessage);
        
        // Increment interaction count
        interactionCount++;
        
        // Update tier based on context depth and interaction count
        // Returns true if we've changed tiers
        const tierChanged = updateTier();
        
        // Get response style based on current tier
        let responseStyle = "concise"; // Default
        if (currentTier === TIERS.DETAILED) {
            responseStyle = "thorough";
        } else if (currentTier === TIERS.LEGENDARY) {
            responseStyle = "highly detailed";
        }
        
        // Show thinking indicator with tier-specific message
        const thinkingText = currentTier !== TIERS.INITIAL 
            ? tierMessages[currentTier].thinking 
            : tierMessages[TIERS.INITIAL].thinking;
        
        showThinking(thinkingText);
        
        try {
            // Determine if we have enough context to generate a prompt
            const contextDepth = evaluateContextDepth();
            const readyForPrompt = {
                [TIERS.QUICK]: contextDepth >= 2 && interactionCount >= 2,
                [TIERS.DETAILED]: contextDepth >= 4 && interactionCount >= 4,
                [TIERS.LEGENDARY]: contextDepth >= 6 && interactionCount >= 6
            }[currentTier] || false;
            
            // Get initial response from LLM
            const response = await getLLMResponse(responseStyle);
            
            // Add evolving phrase based on tier (except for initial tier)
            let fullResponse = response;
            if (currentTier !== TIERS.INITIAL) {
                const phrase = getEvolvingPhrase(currentTier, userMessage);
                
                // Only add the phrase if it doesn't create redundancy
                if (!response.toLowerCase().includes(phrase.toLowerCase())) {
                    fullResponse += " " + phrase;
                }
            }
            
            // Add the response to the chat
            hideThinking();
            addMessage(fullResponse);
            
            // If we have enough context and the input isn't too ambiguous, offer to generate a prompt
            if (readyForPrompt && !isAmbiguous && currentTier !== TIERS.INITIAL) {
                let promptOfferMessage = "";
                let promptLevel = "";
                
                if (currentTier === TIERS.QUICK) {
                    promptOfferMessage = "Hey, we're on a roll here! Looks like we've got enough to whip up a quick prompt—ready for it?";
                    promptLevel = "quick";
                } else if (currentTier === TIERS.DETAILED) {
                    promptOfferMessage = "Oh yeah, we're on a roll! Looks like we have enough to generate a really detailed prompt for diving deep—want to go for it?";
                    promptLevel = "detailed";
                } else if (currentTier === TIERS.LEGENDARY) {
                    promptOfferMessage = "Wow, we're really cooking now! Looks like we've got enough for an epic, legendary prompt—ready to see it?";
                    promptLevel = "legendary";
                }
                
                // Add the offer with a slight delay for conversational flow
                setTimeout(() => {
                    addMessage(promptOfferMessage);
                    
                    // Create custom buttons for Yes/No
                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.gap = '10px';
                    buttonContainer.style.marginBottom = '15px';
                    buttonContainer.style.marginTop = '5px';
                    buttonContainer.style.alignSelf = 'flex-start';
                    
                    const yesButton = document.createElement('button');
                    yesButton.textContent = 'Yes, generate it!';
                    yesButton.style.backgroundColor = 'var(--brand-color)';
                    yesButton.style.color = 'var(--text-light)';
                    yesButton.style.border = 'none';
                    yesButton.style.padding = '8px 16px';
                    yesButton.style.borderRadius = '4px';
                    yesButton.style.cursor = 'pointer';
                    
                    const noButton = document.createElement('button');
                    noButton.textContent = 'Not yet';
                    noButton.style.backgroundColor = 'var(--text-secondary)';
                    noButton.style.color = 'var(--text-light)';
                    noButton.style.border = 'none';
                    noButton.style.padding = '8px 16px';
                    noButton.style.borderRadius = '4px';
                    noButton.style.cursor = 'pointer';
                    
                    buttonContainer.appendChild(yesButton);
                    buttonContainer.appendChild(noButton);
                    messagesContainer.appendChild(buttonContainer);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    
                    // Handle button clicks
                    yesButton.addEventListener('click', async () => {
                        // Remove the buttons
                        messagesContainer.removeChild(buttonContainer);
                        
                        // Show user's choice
                        addMessage("Yes, generate it!", true);
                        
                        // Show thinking indicator
                        showThinking("Generating your prompt...");
                        
                        // Generate the prompt
                        const generatedPrompt = await generatePrompt(promptLevel);
                        
                        // Hide thinking indicator
                        hideThinking();
                        
                        // Add a message with a random prompt card introduction
                        const randomMessage = promptCardMessages[Math.floor(Math.random() * promptCardMessages.length)];
                        addMessage(randomMessage);
                        
                        // Add the prompt card
                        const promptTitle = `${promptLevel.charAt(0).toUpperCase() + promptLevel.slice(1)} Prompt`;
                        const promptCard = addPromptCard(promptTitle, generatedPrompt);
                        
                        // Suggest a refinement with slight delay
                        setTimeout(() => {
                            const refinementSuggestion = suggestRefinement(generatedPrompt);
                            addMessage(refinementSuggestion);
                        }, 1500);
                    });
                    
                    noButton.addEventListener('click', () => {
                        // Remove the buttons
                        messagesContainer.removeChild(buttonContainer);
                        
                        // Show user's choice and continue
                        addMessage("Not yet", true);
                        addMessage("No problem! Let's keep exploring your idea. What other aspects would you like to dive into?");
                    });
                }, 1500);
            }
            
        } catch (error) {
            console.error('Error processing message:', error);
            hideThinking();
            addMessage("Sorry, I encountered an error while processing your message.");
        }
    });

    // Auto-resize the textarea as users type
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(150, this.scrollHeight) + 'px';
    });

    // Add tooltips to tier indicators
    createTooltip(tierQuickIndicator, 'Quick Prompts (unlocked at 3 interactions)');
    createTooltip(tierDetailedIndicator, 'Detailed Prompts (unlocked at 5 interactions)');
    createTooltip(tierLegendaryIndicator, 'Legendary Mode (unlocked at 9 interactions)');
    
    // Initial progress indicator
    progressIndicator.style.width = tierMessages[TIERS.INITIAL].progressWidth;
    
    // Focus on input field when page loads
    messageInput.focus();
});