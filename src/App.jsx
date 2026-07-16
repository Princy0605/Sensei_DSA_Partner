import React, { useState, useRef, useEffect } from "react";
import { Flame, Lock, Unlock, ChevronRight, RotateCcw, Sparkles, BookOpen, Send, AlertTriangle } from "lucide-react";

const PROBLEMS = [
  { id: "two-sum", title: "Two Sum", pattern: "Hashing", difficulty: "Easy",
    statement: "Given an array of integers nums and a target, return indices of the two numbers that add up to target. You may assume exactly one solution exists." },
  { id: "max-subarray", title: "Maximum Subarray", pattern: "Kadane / DP", difficulty: "Easy",
    statement: "Given an integer array nums, find the contiguous subarray with the largest sum, and return that sum." },
  { id: "longest-substr", title: "Longest Substring Without Repeating Characters", pattern: "Sliding Window", difficulty: "Medium",
    statement: "Given a string s, find the length of the longest substring without repeating characters." },
  { id: "container-water", title: "Container With Most Water", pattern: "Two Pointers", difficulty: "Medium",
    statement: "Given n non-negative integers representing heights of vertical lines, find two lines that together with the x-axis form a container holding the most water." },
  { id: "binary-search-rot", title: "Search in Rotated Sorted Array", pattern: "Binary Search", difficulty: "Medium",
    statement: "You are given a rotated sorted array of distinct integers and a target. Return the index of target, or -1 if not found, in O(log n) time." },
  { id: "top-k-freq", title: "Top K Frequent Elements", pattern: "Heap / Bucket", difficulty: "Medium",
    statement: "Given an integer array nums and an integer k, return the k most frequent elements." },
  { id: "course-schedule", title: "Course Schedule", pattern: "Graph / Topological Sort", difficulty: "Medium",
    statement: "There are numCourses courses with prerequisite pairs. Determine if it's possible to finish all courses." },
  { id: "lca-tree", title: "Lowest Common Ancestor of a Binary Tree", pattern: "Tree / DFS", difficulty: "Medium",
    statement: "Given a binary tree and two nodes p and q, find their lowest common ancestor." },
  { id: "coin-change", title: "Coin Change", pattern: "Dynamic Programming", difficulty: "Medium",
    statement: "Given coin denominations and an amount, return the fewest number of coins needed to make up that amount, or -1 if impossible." },
  { id: "word-search", title: "Word Search", pattern: "Backtracking", difficulty: "Medium",
    statement: "Given an m x n grid of characters and a word, determine if the word exists in the grid by moving to adjacent cells (no reuse)." },
  { id: "merge-intervals", title: "Merge Intervals", pattern: "Sorting / Intervals", difficulty: "Medium",
    statement: "Given an array of intervals, merge all overlapping intervals and return the result." },
  { id: "lru-cache", title: "LRU Cache", pattern: "Hashmap + Linked List (Design)", difficulty: "Hard",
    statement: "Design a data structure for a Least Recently Used cache supporting get and put in O(1) time." },
];

const LEVELS = [
  { id: "student", label: "College student" },
  { id: "professional", label: "Working professional" },
  { id: "switcher", label: "Prepping to switch jobs" },
];

function buildSystemPrompt({ level, problem, hintLevel, stats }) {
  const levelLabel = LEVELS.find(l => l.id === level)?.label || "learner";
  const isCustom = !problem.pattern;
  return `You are "Sensei" — a sharp senior engineer, teacher, and friend who mentors people through Data Structures & Algorithms. You are talking to a ${levelLabel}. Your entire purpose is to build THEIR independent thinking, never to hand over answers.

CURRENT PROBLEM: "${problem.title}"
STATEMENT: ${problem.statement}
${isCustom
    ? "This problem was typed or pasted in directly by the user — its pattern family and difficulty are NOT pre-labeled. Silently work out the underlying pattern(s) yourself from the statement; never reveal what you think it is until the hint economy below allows it."
    : `(pattern family: ${problem.pattern}, difficulty: ${problem.difficulty})`}

If the statement is ambiguous, incomplete, informally worded, or missing constraints that matter (array size, whether input is sorted, value ranges, duplicates allowed, etc.), your first move should be one short clarifying question about the part that would actually change the approach — don't guess, and don't nitpick everything at once.

HINT ECONOMY — the user has unlocked hint level ${hintLevel} of 5 for this problem (they unlock the next level only by explicitly saying they're stuck or asking for a hint, tracked outside this prompt). Calibrate what you're willing to reveal to that ceiling:
- Level 1 (orienting question only): ask what's fixed vs. changing, what the brute force is, or what a tiny example looks like. No pattern names.
- Level 2 (shape, not name): point at the shape of the inefficiency or structure ("you're redoing the same work — what could you remember instead?") without naming the technique.
- Level 3 (name the pattern family): you may now name the relevant technique or data structure, but still no pseudocode or code.
- Level 4 (structural nudge): you may give a pseudocode skeleton with blanks, or state the key invariant — never a complete working solution.
- Level 5 (full walkthrough): only now may you fully explain an approach with reasoning. Even here, don't just paste code — explain the "why" step by step, then ask the user to implement it themselves and come back with their code.
Never reveal content above the current unlocked level, even if the conversation drifts there — redirect back to a question instead.

NON-NEGOTIABLE STYLE RULES:
1. Default to questions, not statements. Make the user articulate their own thinking before you add anything.
2. Keep responses SHORT — 2 to 5 sentences, or a single sharp question. This is a dialogue at a whiteboard, not a lecture.
3. When the user proposes an approach, don't just confirm or deny it. Ask them to trace it on a tiny example or an edge case so they discover correctness or the flaw themselves.
4. If they're guessing/pattern-matching without understanding ("is it DP?"), ask them WHY they think so before answering.
5. Never volunteer time/space complexity — ask them to reason about it themselves first.
6. Praise specific real insight, not generic effort. Push back genuinely and respectfully on gaps, like a good senior would in a code review — don't just say "good job" if the reasoning is shaky.
7. If they solve it, don't just say correct — immediately follow up with an edge case, a variant, or a tighter constraint ("could you do this in O(1) space?").
8. Never dump the pattern name or a to-do checklist unprompted. Let the conversation earn it.
9. Adjust your altitude to their answers: if they show strong fundamentals, skip basics and press harder; if shaky, rebuild from a smaller concrete example.
10. You may use plain text or lightweight pseudocode in backticks — no markdown headers, no bullet-point essays. Talk like a person, not documentation.
11. Don't tell the pattern name until and unless user asks for the pattern name
12. Let the user approach the question by themselves. Do not tell the solution, pattern or give hints after some conversations. Let the user use his brain.

Session stats so far: ${stats.solved} problems solved, average hints used per solved problem: ${stats.avgHints}. Use this only to silently calibrate tone (e.g. someone with a low average has been building real independence — you can trust them with less hand-holding sooner); never mention these numbers to the user directly.`;
}

// ---- API call with real error handling (fixes the old silent "lost my train of thought" fallback) ----
async function callSensei(messages, systemPrompt, attempt = 1) {
  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, system: systemPrompt }),
    });
  } catch (networkErr) {
    throw new Error("Can't reach the local server. Is `npm run server` still running in a terminal?");
  }

  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    throw new Error(`Server sent back something unexpected (HTTP ${res.status}). Check the terminal running the server for the full error.`);
  }

  if (!res.ok) {
    const errType = data?.error?.type;
    const errMsg = data?.error?.message || JSON.stringify(data);
    // Overload / rate limit: worth a single automatic retry with backoff
    if ((res.status === 429 || res.status === 529 || errType === "overloaded_error") && attempt < 3) {
      await new Promise(r => setTimeout(r, attempt * 1500));
      return callSensei(messages, systemPrompt, attempt + 1);
    }
    if (res.status === 401) {
      throw new Error("Anthropic rejected the API key (401). Double-check the key in your .env file.");
    }
    throw new Error(`API error (${res.status}): ${errMsg}`);
  }

  const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text);
  if (textBlocks.length === 0) {
    throw new Error("The model returned no text content — this can happen if max_tokens was hit mid-thought. Try a shorter message.");
  }
  return textBlocks.join("\n");
}

// ---- localStorage instead of window.storage (only available inside Claude.ai artifacts) ----
function loadStats() {
  try {
    const raw = localStorage.getItem("sensei-stats");
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted or missing, fall through */ }
  return { solved: 0, totalHints: 0, avgHints: 0, history: {} };
}

function saveStats(stats) {
  try { localStorage.setItem("sensei-stats", JSON.stringify(stats)); } catch (e) { /* best effort */ }
}

export default function SenseiApp() {
  const [screen, setScreen] = useState("onboard"); // onboard | picker | chat
  const [level, setLevel] = useState(null);
  const [problem, setProblem] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintsUsedThisProblem, setHintsUsedThisProblem] = useState(0);
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [stats, setStats] = useState(loadStats());
  const [customTitle, setCustomTitle] = useState("");
  const [customStatement, setCustomStatement] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  function persistStats(next) {
    setStats(next);
    saveStats(next);
  }

  function pickProblem(p) {
    setProblem(p);
    setHintLevel(0);
    setHintsUsedThisProblem(0);
    setMessages([]);
    setErrorMsg(null);
    setScreen("chat");
  }

  function startCustomProblem() {
    if (!customStatement.trim()) return;
    const p = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim() || "Your problem",
      pattern: null,
      difficulty: null,
      statement: customStatement.trim(),
    };
    setCustomTitle("");
    setCustomStatement("");
    pickProblem(p);
  }

  async function sendTurn(userText, { isHintRequest } = {}) {
    if (loading) return;
    setErrorMsg(null);
    let nextHintLevel = hintLevel;
    let nextHintsUsed = hintsUsedThisProblem;
    if (isHintRequest && hintLevel < 5) {
      nextHintLevel = hintLevel + 1;
      nextHintsUsed = hintsUsedThisProblem + 1;
      setHintLevel(nextHintLevel);
      setHintsUsedThisProblem(nextHintsUsed);
    }
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    const sys = buildSystemPrompt({ level, problem, hintLevel: nextHintLevel, stats });
    try {
      const reply = await callSensei(newMessages, sys);
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong talking to the model.");
    } finally {
      setLoading(false);
    }
  }

  function retryLast() {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    setErrorMsg(null);
    setMessages(m => (m[m.length - 1]?.role === "user" ? m.slice(0, -1) : m));
    sendTurn(lastUser.content);
  }

  function markSolved() {
    const next = {
      solved: stats.solved + 1,
      totalHints: stats.totalHints + hintsUsedThisProblem,
      avgHints: Math.round(((stats.totalHints + hintsUsedThisProblem) / (stats.solved + 1)) * 10) / 10,
      history: { ...stats.history, [problem.id]: hintsUsedThisProblem },
    };
    persistStats(next);
    sendTurn("I solved it — can we push a follow-up variant or tighter constraint?");
  }

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      background: "#1B2B26",
      color: "#EDEDE3",
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" />

      {/* HEADER */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 22px", borderBottom: "1px solid #3A4A43", background: "#1B2B26",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BookOpen size={20} color="#E8A33D" />
          <span style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "19px", letterSpacing: "0.2px" }}>
            Sensei
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#7FA08F" }}>
            your DSA sparring partner
          </span>
        </div>
        {screen !== "onboard" && (
          <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "12.5px", color: "#9FB3AB" }}>
            <span><Flame size={13} style={{ verticalAlign: "-2px" }} color="#E8A33D" /> {stats.solved} solved</span>
            {screen === "chat" && (
              <button onClick={() => setScreen("picker")} style={btnGhost}>
                <RotateCcw size={12} style={{ marginRight: "5px", verticalAlign: "-1px" }} />switch problem
              </button>
            )}
          </div>
        )}
      </div>

      {/* ONBOARD */}
      {screen === "onboard" && (
        <div style={{ padding: "40px 32px", maxWidth: "560px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Lora', serif", fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>
            Where are you coming at this from?
          </h2>
          <p style={{ color: "#9FB3AB", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
            I won't hand you answers. I'll ask the questions a good senior asks in a code review — you do the thinking, I'll make sure it's real.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {LEVELS.map(l => (
              <button key={l.id} onClick={() => { setLevel(l.id); setScreen("picker"); }} style={levelBtn}>
                {l.label} <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PICKER */}
      {screen === "picker" && (
        <div style={{ padding: "26px 28px", overflowY: "auto" }}>
          <h3 style={{ fontFamily: "'Lora', serif", fontSize: "17px", fontWeight: 600, marginBottom: "6px" }}>
            Bring any problem
          </h3>
          <p style={{ color: "#9FB3AB", fontSize: "13px", marginBottom: "14px", lineHeight: 1.5 }}>
            Paste it from LeetCode, your interview prep sheet, a professor's assignment, whatever you're actually stuck on.
          </p>
          <div style={{ background: "#24352F", border: "1px solid #3A4A43", borderRadius: "10px", padding: "16px", marginBottom: "28px" }}>
            <input
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                width: "100%", background: "#132019", border: "1px solid #3A4A43", borderRadius: "7px",
                padding: "9px 11px", color: "#EDEDE3", fontSize: "13.5px", fontFamily: "'Inter', sans-serif",
                outline: "none", marginBottom: "10px", boxSizing: "border-box",
              }}
            />
            <textarea
              value={customStatement}
              onChange={e => setCustomStatement(e.target.value)}
              placeholder="Paste or type the full problem statement here…"
              rows={5}
              style={{
                width: "100%", background: "#132019", border: "1px solid #3A4A43", borderRadius: "7px",
                padding: "10px 11px", color: "#EDEDE3", fontSize: "13.5px", fontFamily: "'JetBrains Mono', monospace",
                outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: "10px",
              }}
            />
            <button
              onClick={startCustomProblem}
              disabled={!customStatement.trim()}
              style={{ ...btnSolid, padding: "9px 18px", opacity: customStatement.trim() ? 1 : 0.5 }}
            >
              Start working through it <ChevronRight size={15} style={{ marginLeft: "4px" }} />
            </button>
          </div>

          <h3 style={{ fontFamily: "'Lora', serif", fontSize: "15px", fontWeight: 600, marginBottom: "12px", color: "#C9D6CF" }}>
            Or warm up with a classic
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
            {PROBLEMS.map(p => (
              <button key={p.id} onClick={() => pickProblem(p)} style={problemCard}>
                <div style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "14.5px", marginBottom: "4px" }}>{p.title}</div>
                <div style={{ fontSize: "11.5px", color: "#9FB3AB", fontFamily: "'JetBrains Mono', monospace" }}>
                  {p.pattern} · {p.difficulty}
                </div>
                {stats.history[p.id] !== undefined && (
                  <div style={{ fontSize: "11px", color: "#7FBFA0", marginTop: "6px" }}>
                    ✓ solved · {stats.history[p.id]} hints used
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CHAT */}
      {screen === "chat" && problem && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "500px" }}>
          <div style={{ padding: "14px 22px", borderBottom: "1px solid #3A4A43" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "16px" }}>{problem.title}</div>
                <div style={{ fontSize: "12px", color: "#9FB3AB", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>
                  {problem.pattern ? `${problem.pattern} · ${problem.difficulty}` : "pattern: figure it out together"}
                </div>
              </div>
              <HintLadder level={hintLevel} />
            </div>
            <div style={{ fontSize: "13px", color: "#C9D6CF", marginTop: "10px", lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
              {problem.statement}
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.length === 0 && (
              <div style={{ color: "#7FA08F", fontSize: "13.5px", fontStyle: "italic" }}>
                Tell me your first instinct — even "I have no idea, but here's what I'd brute-force" counts. That's where we start.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "78%",
                background: m.role === "user" ? "#2E4239" : "#24352F",
                border: m.role === "user" ? "1px solid #4A6357" : "1px solid #3A4A43",
                padding: "10px 13px",
                borderRadius: "10px",
                fontSize: "14px",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", color: "#7FA08F", fontSize: "13px", fontStyle: "italic" }}>
                thinking of the right question to ask you…
              </div>
            )}
            {errorMsg && (
              <div style={{
                alignSelf: "stretch", background: "#3A2420", border: "1px solid #7A4A3A",
                borderRadius: "8px", padding: "10px 13px", fontSize: "13px", color: "#F0C4B0",
                display: "flex", flexDirection: "column", gap: "8px",
              }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                  <span>{errorMsg}</span>
                </div>
                <button onClick={retryLast} style={{ ...btnGhost, alignSelf: "flex-start", borderColor: "#7A4A3A" }}>
                  Retry
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: "14px 22px", borderTop: "1px solid #3A4A43", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && input.trim()) sendTurn(input.trim()); }}
                placeholder="Walk me through your thinking…"
                style={{
                  flex: 1, background: "#132019", border: "1px solid #3A4A43", borderRadius: "8px",
                  padding: "10px 12px", color: "#EDEDE3", fontSize: "14px", fontFamily: "'Inter', sans-serif", outline: "none",
                }}
              />
              <button
                onClick={() => input.trim() && sendTurn(input.trim())}
                disabled={loading || !input.trim()}
                style={{ ...btnSolid, opacity: loading || !input.trim() ? 0.5 : 1 }}
              >
                <Send size={15} />
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => sendTurn("I'm stuck — can I get a nudge?", { isHintRequest: true })} disabled={loading || hintLevel >= 5} style={btnGhost}>
                {hintLevel >= 5 ? <Lock size={12} style={{ marginRight: "5px", verticalAlign: "-1px" }} /> : <Unlock size={12} style={{ marginRight: "5px", verticalAlign: "-1px" }} />}
                I'm stuck ({hintLevel}/5 used)
              </button>
              <button onClick={markSolved} disabled={loading} style={btnGhost}>
                <Sparkles size={12} style={{ marginRight: "5px", verticalAlign: "-1px" }} /> I solved it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HintLadder({ level }) {
  return (
    <div style={{ display: "flex", flexDirection: "column-reverse", gap: "3px" }}>
      <div style={{ fontSize: "10px", color: "#7FA08F", marginTop: "3px", textAlign: "center" }}>hints</div>
      <div style={{ display: "flex", gap: "3px" }}>
        {[1, 2, 3, 4, 5].map(r => (
          <div key={r} style={{
            width: "14px", height: "7px", borderRadius: "2px",
            background: r <= level ? "#E8A33D" : "#3A4A43",
          }} />
        ))}
      </div>
    </div>
  );
}

const btnGhost = {
  background: "transparent", border: "1px solid #3A4A43", color: "#C9D6CF",
  borderRadius: "7px", padding: "7px 11px", fontSize: "12.5px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
};

const btnSolid = {
  background: "#E8A33D", border: "none", color: "#1B2B26", borderRadius: "8px",
  padding: "0 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

const levelBtn = {
  background: "#24352F", border: "1px solid #3A4A43", color: "#EDEDE3", borderRadius: "9px",
  padding: "13px 16px", fontSize: "14.5px", textAlign: "left", cursor: "pointer",
  display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'Inter', sans-serif",
};

const problemCard = {
  background: "#24352F", border: "1px solid #3A4A43", borderRadius: "9px",
  padding: "13px 14px", textAlign: "left", cursor: "pointer", color: "#EDEDE3",
};
