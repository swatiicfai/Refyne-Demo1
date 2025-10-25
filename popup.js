let summaryText = "";

document.getElementById("summarizeBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Extract visible text from the page
  const [{ result: pageText }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText
  });

  try {
    const summarizer = await ai.languageModel.create({
      type: "key-points", // You can also use "tldr", "headline", etc.
      length: "medium"
    });

    summaryText = await summarizer.summarize(pageText);
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
