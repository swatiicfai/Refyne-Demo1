let summaryText = "";

// 🛑 REMOVED: No longer hardcoded. The key will be fetched from chrome.storage.

// Function to get the API key from Chrome storage
async function getApiKey() {
// NOTE: You must have the "storage" permission in your manifest.json
const result = await chrome.storage.local.get(['openai_api_key']);
return result.openai_api_key;
}

// Function to call OpenAI API for summarization
async function summarize(text) {
const OPENAI_API_KEY = await getApiKey();

// 1. Check if the API key is available
if (!OPENAI_API_KEY || OPENAI_API_KEY === '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') {
throw new Error("API Key not set. Please go to the extension options/settings to set your OpenAI API Key.");
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
// 💡 IMPROVED: Throw a more detailed error with status code
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
document.getElementById("summary").innerText = "Could not access page content (missing permissions or secure page).";
summaryText = "";
console.error("Scripting injection failed:", e);
return;
}

// 2. Main summarization block
try {
document.getElementById("summary").innerText = "Summarizing, please wait..."; // Show loading message
summaryText = await summarize(pageText);
document.getElementById("summary").innerText = summaryText;
} catch (err) {
// 💡 IMPROVED: Show a clearer error message in the console
document.getElementById("summary").innerText = "Error: Summarization failed. Check DevTools for details, or ensure your API key is correct.";
summaryText = "";
console.error("🔴 Fatal Summarization Error:", err.message);
}
});

document.getElementById("speakBtn").addEventListener("click", () => {
if (!summaryText) {
alert("Please summarize first!");
return;
}
chrome.tts.speak(summaryText, { rate: 1.0, pitch: 1.1, lang: "en-US" });
});
