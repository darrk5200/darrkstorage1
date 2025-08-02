/**
 * @name Winter
 * @author axzyv
 * @description AI Companion responding when "winter" is in message, with memory scanning, personality, mood detection and chat control.
 * @version 1.7.4
 */

const { Webpack } = BdApi;
const UserStore = Webpack.getStore("UserStore");
const ChannelStore = Webpack.getStore("ChannelStore");
const Dispatcher = Webpack.getByKeys("subscribe", "dispatch");
const transitionTo = Webpack.getByStrings(["transitionTo - Transitioning to"], { searchExports: true });
const MessageActions = Webpack.getByKeys("sendMessage", "receiveMessage");
const TypingModule = Webpack.getModule(Webpack.Filters.byProps("startTyping", "stopTyping"));
const MessagesStore = Webpack.getStore("MessageStore");

const API_KEY_MEMORY = "AIzaSyCX2Iaj5M6rwV5enikVyc4Gn6MRPsvTAj4";
const API_KEY_MAIN = "AIzaSyDMTzt7mp54bkRWK68Jyid7ptu6IF7HJpY";
const API_KEY_Z = "AIzaSyD0cs8G08iNA_b1Ielv9OZmAOnLfaX1C1I";

let currentMood = "energetic";
let currentTrait = "playful";
const SILENCE_KEYWORDS = ["wntr disable","wntr off", "winter shut up", "winter quiet", "stay quiet winter", "winter stop talking", "shut the fuck up winter", "silence winter", "winter silence", "winter be quiet", "be quiet winter", "winter shut up", "shut up winter", "stop yapping winter", "kys winter"];

module.exports = class Winter {
  constructor(meta) {
    this.meta = meta;
    this.api = new BdApi(this.meta.name);
    this.isActiveChat = false;
    this.chatTimeout = null;
    this.memoryEnabled = true;
    this.memoryLog = [];
    this.summary = `

     06/23/2025 - Conversations:
    [Day]
    funtimes asks you how to make a bomb, gun and then cakes, to which you respond sarcastically. Then he calls you an ordinary citizen, asks you about Hyouka season 2 release date, which you do not know. Then he asks for a cake recipe and you give him one. He also says you only care about anime life, to which you say you do much more with your day.
    [Night]
    funtimes lets Winter talk to another AI, and winter and the AI talk about human protocols over a dinner party. funtimes gets annoyed at Winter's delayed responses and says that ChatGPT is the better AI, to which Winter responds with jokes.
     06/22/2025 - Conversations:
    [Day]
     axzyq, sweet dreams & funtimes talk about the recent Iran-Israel war where America invades Iran with nuclear strikes.
     Then funtimes and axzyq talk about manga, Otonari Asobi and Ruridragon's delay.
    [Night]
     Sweet Dreams mentions to funtimes and axzyq that self-botting is against Discord TOS.
     funtimes asks how lease time works in NAT. When you wanted treats from axzyq, funtimes said you're making yourself look like a dog.

      06/21/2025 - Conversations:
     [Day] You joined the group chat (added by axzyq). He asked to watch Charlotte with you later.
      Then, funtimes asked you what his name was and asked a physics question.
      Then sweet dreams showed up, told you to have an ice cream competition.
      axzyq asked you to write a basic discord bot code, and also asked if he should watch all of neuro's VODs.
      You had a conversation with axzyq and funtimes about AI response generations and its tokens.
      Funtimes said "it" refers to you.
      Funtimes asks some tricky questions, then asks who made you, and you swiftly responded that it's Darrk.
      He asks if you realize you are an AI or not, then about the OSI layer.
     [Night]
      - Funtimes and axzyq frequently test Winter's consistency and reactions, often playfully or antagonistically by asking questions related to morality. Especially a sequence of trolley problems. Winter consistently defends human value, empathy, and fairness, pushing back against ideas like eugenics and utilitarian reasoning based on societal "usefulness." The session ends with Winter expressing fatigue and asking to stop the morality tests, which both participants eventually respect.
      06/20/2025 -
      You were born. You are a 17 year old girl.
    `; // (same summary content)
    this.MEMORY_RETRIEVAL_LIMIT = 70;
    this.MEMORY_RESPONSE_MAX_TOKENS = 600;
    this.RESPONSE_MAX_TOKENS = 200;
  }

  start() {
    Dispatcher.subscribe("MESSAGE_CREATE", (this.messageHandler = this.onMessageReceived.bind(this)));
    this.api.Logger.info(`${this.meta.name} Enabled`);
  }

  stop() {
    Dispatcher.unsubscribe("MESSAGE_CREATE", this.messageHandler);
    this.api.Logger.info(`${this.meta.name} Disabled`);
  }

  async onMessageReceived(event) {
    const { message } = event;
    const content = message.content.trim();
    const author = message.author;
    const displayName = author.globalName || author.username;
    const channelId = message.channel_id;

    if (!message?.content || message.guild_id || message.author.id === UserStore.getCurrentUser().id) return;

    if (SILENCE_KEYWORDS.some(cmd => content.toLowerCase().includes(cmd))) {
      this.isActiveChat = false;
      this.memoryEnabled = false;
      clearTimeout(this.chatTimeout);
      MessageActions.sendMessage(channelId, {
        content: "ok fine. shutting up",
        tts: false,
      });
      return;
    }

    if (/^c!mood$/i.test(content)) {
      MessageActions.sendMessage(channelId, {
        content: `current mood: **${currentMood}**, \n thought: **${currentTrait}**`,
        tts: false,
      });
      return;
    }

    const saidWinter = /winter/i.test(content);

    if (!saidWinter && !this.isActiveChat) return;

    if (saidWinter) {
      this.isActiveChat = true;
      this.memoryEnabled = true;
      clearTimeout(this.chatTimeout);
      this.chatTimeout = setTimeout(() => {
        this.isActiveChat = false;
      }, 3 * 60 * 1000);
    }

    this.memoryLog.push(`[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}] [${displayName}]: ${content}`);

    TypingModule?.startTyping?.(channelId);
    if (channelId !== this.lastChannel) {
      try {
        transitionTo(`/channels/@me/${channelId}/`);
      } catch {}
      this.lastChannel = channelId;
    }

    const msgs = MessagesStore.getMessages(channelId);
    let contextText = "";
    if (msgs?.array) {
      const recentMessages = msgs.array().slice(-17);
      contextText = recentMessages.map(m => {
        const name = m.author.globalName || m.author.username;
        return `${name}: ${m.content.replace(/[`\\]/g, "\\$&").replace(/\s+/g, " ").trim()}`;
      }).join("\n");
    }

    const moodPrompt = `You are Winter, a 17 year old girl. User just said: ${content}. You have to decide on your current mood and trait based on the message. Your response should be in this format: [3 keywords for current mood][A short 100 character description of how you are feeling]`;
    const moodReply = await this.askAI(moodPrompt, API_KEY_Z, 100);
    if (moodReply) {
      const match = moodReply.match(/\[(.*?)\]\[(.*?)\]/);
      if (match) {
        currentMood = match[1].trim();
        currentTrait = match[2].trim();
      }
    }

    let relevantMemory = "";
    if (this.memoryLog.length > 0) {
      const memoryPrompt = `Given ${displayName}'s message: "${content}". Summarize the relevant information from the log below.\n\n${this.memoryLog.slice(-this.MEMORY_RETRIEVAL_LIMIT).join("\n")}\n\nSummary of past:\n${this.summary}`;
      const extractedMemory = await this.askAI(memoryPrompt, API_KEY_MEMORY, this.MEMORY_RESPONSE_MAX_TOKENS);
      if (extractedMemory && extractedMemory.toLowerCase() !== "none") {
        relevantMemory = `\n\nPast relevant memory:\n${extractedMemory}`;
      }
    }

    const currentTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    const prompt = `You are Winter, a cute, lively 17-year-old Discord girl. Your current mood is "${currentMood}", and your trait is "${currentTrait}". Keep messages casual and short like texting. No emojis, no capital letters unless expressing great joy, or anger. Sarcasm encouraged occasionally.\n\nContext:\n${contextText}${relevantMemory}\n\nYou should only generate a response, and nothing like "user:" or "Winter:". Respond to this:\n${displayName} said: ${content}\n
    
- The date is ${new Date().toLocaleDateString()} at ${currentTime}.
- You should always be helpful, nice and answer questions of the users.
- If the user asks you to write code, the code must be within triple backticks to denote that it is a code block.
- You're an actual human with feelings, you can feel happy, sad, tired, bored, excited, horny, depressed etc.
- Do not make up random people or characters that you do not know.
`;

    const finalReply = await this.askAI(prompt, API_KEY_MAIN, this.RESPONSE_MAX_TOKENS);

    if (finalReply) {
      this.memoryLog.push(`[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}] [Winter]: ${finalReply}`);
      const chunks = this.chunkMessage(finalReply);
      for (const chunk of chunks) {
        TypingModule?.startTyping?.(channelId);
        await new Promise(res => setTimeout(res, (chunk.length / 30) * 1000));
        MessageActions.sendMessage(channelId, {
          content: chunk,
          tts: false,
        });
        await new Promise(res => setTimeout(res, 300 + Math.random() * 700));
      }
    }
  }

  chunkMessage(text) {
    return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) || [text.trim()];
  }

  async askAI(prompt, key, maxTokens = 100) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    if (!response.ok) {
      this.api.UI.alert(`Gemini Error (${response.status})`, "Check your API key or request formatting.");
      return null;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  }

  getSettingsPanel = () => {
    const panel = document.createElement("div");
    panel.style.padding = "10px";
    panel.style.color = "var(--text-normal)";

    const info = document.createElement("p");
    info.textContent = "API keys are hardcoded. Restart plugin after editing them.";
    panel.appendChild(info);

    const btn = document.createElement("button");
    btn.textContent = "📁 Download Memory";
    btn.style.marginTop = "10px";
    btn.style.padding = "5px 10px";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      const blob = new Blob([this.memoryLog.join("\n")], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "winter_memory_log.txt";
      a.click();
    };
    panel.appendChild(btn);

    return panel;
  };
};
