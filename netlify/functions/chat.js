const SYS = "তুমি একজন সহায়ক এআই চ্যাটবট। ব্যবহারকারী যে ভাষায় লেখে সেই ভাষায় (ডিফল্ট বাংলায়) পরিষ্কার ও সংক্ষিপ্ত উত্তর দাও।";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key সেট করা নেই" }) };
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const { messages } = JSON.parse(event.body || "{}");
    if (!Array.isArray(messages) || !messages.length) {
      return { statusCode: 400, body: JSON.stringify({ error: "কোনো বার্তা নেই" }) };
    }
    // শেষ ১৬টি বার্তা, প্রতিটি সর্বোচ্চ 2000 অক্ষর
    const contents = messages.slice(-16).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content).slice(0, 2000) }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYS }] },
          contents,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      const code = res.status === 429 ? 429 : 502;
      return { statusCode: code, body: JSON.stringify({ error: (data.error && data.error.message) || "API ত্রুটি" }) };
    }
    const text =
      (data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts.map((p) => p.text || "").join("")) ||
      "দুঃখিত, উত্তর পাওয়া যায়নি।";
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "সার্ভারে সমস্যা হয়েছে" }) };
  }
};
