let summaryText = "";

// Function to safely wait for chrome.storage to be available and get the API key
async function getApiKey() {
    // 1. DEFENSIVE CHECK: Wait a moment for chrome.storage to load if it's undefined
    if (typeof chrome.storage === 'undefined') {
        // Wait briefly (50ms) and retry, which can resolve rare timing issues in popups
        await new Promise(resolve => setTimeout(resolve, 50));
        if (typeof chrome.storage === 'undefined') {
            console.error("🔴 chrome.storage API failed to load.");
            return null; // Return null if still unavailable
        }
    }
    
    // 2. Fetch the key
    // NOTE: You must have the "storage" permission in your manifest.json
    const result = await chrome.storage.local.get(['openai_api_key']);
    return result.openai_api_key;
}

// Function to call OpenAI API for summarization
async function summarize(text) {
    const OPENAI_API_KEY = await getApiKey();

    // 1. Check if the API key is available
    // NOTE: The placeholder key should not be used in a production environment.
    if (!OPENAI_API_KEY || OPENAI_API_KEY === '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') {
        throw new Error("API Key not set or is invalid. Please go to the extension options/settings to set your OpenAI API Key.");
    }

    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const body = {
        model: "gpt-3.5-turbo",
        messages: [
            {role: "user", content: "Summarize this: " + text}
        ],
        max_tokens: 200,
        temperature: 0.5
    };

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(body)
    });

    if (response.ok) {
        const json = await response.json();
        return json.choices[0].message.content.trim();
    } else {
        // Throw a more detailed error with status code and body
        const errorBody = await response.text();
        throw new Error(`Summarization failed with status ${response.status}: ${errorBody}`);
    }
}

document.getElementById("summarizeBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 1. Check if summarization is possible on the current tab URL
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
        document.getElementById("summary").innerText = "Summarization not supported on internal Chrome pages.";
        summaryText = "";
        return;
    }

    // Extract visible text from the page
    let pageText;
    try {
        [{ result: pageText }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText
        });
    } catch (e) {
        document.getElementById("summary").innerText = "Could not access page content (missing 'activeTab' or 'scripting' permission, or secure page).";
        summaryText = "";
        console.error("Scripting injection failed:", e);
        return;
    }

    // 2. NEW CHECK: Stop if page text is too short to summarize
    const MIN_TEXT_LENGTH = 100; 
    if (!pageText || pageText.trim().length < MIN_TEXT_LENGTH) {
        document.getElementById("summary").innerText = `Not enough visible text on the page to summarize. Minimum required text length is ${MIN_TEXT_LENGTH} characters.`;
        summaryText = "";
        return;
    }

    // 3. Main summarization block
    try {
        document.getElementById("summary").innerText = "Summarizing, please wait..."; // Show loading message
        summaryText = await summarize(pageText);
        document.getElementById("summary").innerText = summaryText;
    } catch (err) {
        // Show a clearer error message in the console and popup
        document.getElementById("summary").innerText = "Error: Summarization failed. Check DevTools console for details, or ensure your API key is correct.";
        summaryText = "";
        console.error("🔴 Fatal Summarization Error:", err.message);
    }
});

document.getElementById("speakBtn").addEventListener("click", () => {
    if (!summaryText) {
        alert("Please summarize first!");
        return;
    }
    
    // TTS with error callback for robustness
    chrome.tts.speak(summaryText, { rate: 1.0, pitch: 1.1, lang: "en-US" }, () => {
        if (chrome.runtime.lastError) {
            console.error("🔴 TTS Error:", chrome.runtime.lastError.message);
            alert("Text-to-Speech failed. Check if the TTS engine is available.");
        }
    });
});
