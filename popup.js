let summaryText = "";

// Place your OpenAI API key below
const OPENAI_API_KEY = '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';

// Function to call OpenAI API for summarization
async function summarize(text) {
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
    throw new Error("Summarization failed: " + response.statusText);
  }
}

document.getElementById("summarizeBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Extract visible text from the page
  const [{ result: pageText }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText
  });

  try {
    summaryText = await summarize(pageText);
    document.getElementById("summary").innerText = summaryText;
  } catch (err) {
    document.getElementById("summary").innerText = "Summarization not supported.";
    summaryText = "";
    console.error(err);
  }
});

document.getElementById("speakBtn").addEventListener("click", () => {
  if (!summaryText) {
    alert("Please summarize first!");
    return;
  }
  chrome.tts.speak(summaryText, { rate: 1.0, pitch: 1.1, lang: "en-US" });
});
