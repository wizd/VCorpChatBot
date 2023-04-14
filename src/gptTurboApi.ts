import { ObjectId } from "mongodb";
import { fetchApi } from "./utils";
import { addUsage, getTokensSumByUserId, getTotalUsage } from "./db/usage";
import { addVChatMessage, deleteAllMessagesByUserId, getLatestMessages } from "./db/vchatmessage";

const chatGPTUrl = "http://192.168.3.59:4004/v1/chat/completions";

const chatWithGPT = async (messages: any[]) => {
  const headers: Record<string, any> = {
    Authorization: `Bearer thei5CeseiKosh3huR4nuKeLOhg6ohv1Hol2owuL`,// ${process.env.OPEN_AI_KEY}`,
  };
  let apiUrl = chatGPTUrl
  let { CHATY_PROXY } = process.env
  // if (CHATY_PROXY) {
  //   if (CHATY_PROXY[CHATY_PROXY.length - 1] !== '/') {
  //     CHATY_PROXY += '/'
  //   }
  //   headers.origin = 'https://app.uniswap.org'
  //   apiUrl = CHATY_PROXY + chatGPTUrl
  // }
  const answer = await fetchApi(
    apiUrl,
    "POST",
    { headers, timeout: 60000 },
    {
      model: "gpt-3.5-turbo",
      messages,
    }
  );
  return answer;
};

export const messageManager = (() => {
  return {
    addUsage: async (usage: any, userId: ObjectId) => {
      // {prompt_tokens: 10, completion_tokens: 17, total_tokens: 27}
      console.log("add usage for userId: ", userId);
      console.log("add usage: ", usage);
      await addUsage({
        userId,
        time: new Date(),
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      });
    },
    getUsage: async (userId: ObjectId) => {
      return await getTotalUsage(userId);
    },
    getUsagePrint: async (userId: ObjectId) => {
      console.log(`getting usage for ${userId}...`);
      const usage = await getTokensSumByUserId(userId);
      console.log(`usage for ${userId}: `, usage);
      let ret = '没有额度信息'
      if (usage) {
        ret = ''
        for (let prop in usage) {
          switch (prop) {
            case 'prompt_sum': ret += `您的输入：${usage.prompt_sum}\n`; break
            case 'completion_sum': ret += `回答已用：${usage.completion_sum}\n`; break
            case 'total_sum': ret += `共计：${usage.total_sum}\n`; break
          }
        }
      }
      console.log(`usage for ${userId} print: `, ret);
      return ret
    },

    addUserMessage: async (message: string, userId: ObjectId) => {
      await addVChatMessage({
        userId,
        isFromAI: false,
        message,
        type: 0,
        time: new Date(),
      });
    },

    addAIMessage: async (message: string, userId: ObjectId) => {
      await addVChatMessage({
        userId,
        isFromAI: true,
        message,
        type: 0,
        time: new Date(),
      });
    },

    // sendMessage: (content: string, user: string) => {
    //   if (!messageMap[user]) {
    //     messageMap[user] = [];
    //   }
    //   messageMap[user].push({ role: "user", content });
    // },
    // concatAnswer: (content: string, user: string) => {
    //   if (!messageMap[user]) {
    //     messageMap[user] = [];
    //   }
    //   messageMap[user].push({ role: "assistant", content });
    // },
    getMessages: async (userId: ObjectId) => {
      const messages = await getLatestMessages(userId);
      console.log("getLatestMessages: ", messages);
      return messages.map((message) => {
        const role = message.isFromAI ? "assistant" : "user";
        return {
          role,
          content: message.message,
        };
      });
    },
    // shiftMessage: (user: string) => {
    //   messageMap[user].shift();
    // },
    // popMessage: (user: string) => {
    //   messageMap[user].pop();
    // },
    clearMessage: async (userId: ObjectId) => {
      await deleteAllMessagesByUserId(userId);
    },
  };
})();

export async function resetMessage(userId: ObjectId) {
  await messageManager.clearMessage(userId);
}
export async function sendMessage(message: string, userId: ObjectId) {
  try {
    messageManager.addUserMessage(message, userId);
    const messages = await messageManager.getMessages(userId);
    console.log("-----------newMessages----------");
    console.log(messages);
    console.log("-----------newMessages----------");
    const completion = await chatWithGPT(messages);
    const answer = completion.choices[0].message.content;

    console.log("-----------newAnswers----------");
    console.log(answer);
    console.log("-----------newAnswers----------");
    await messageManager.addAIMessage(answer, userId);
    messageManager.addUsage(completion.usage, userId);
    return answer;
  } catch (err) {
    console.log((err as Error).message);
    let errorBody = (err as Error & { response: any })?.response?.data;
    console.log(errorBody);
    let append = "[errored]";
    try {
      if (errorBody.error.code === "context_length_exceeded") {
        append = "[errored][context_length_exceeded]";
      }
      errorBody = JSON.stringify(errorBody);
    } catch (_) { }
    return (err as Error).message + "   " + errorBody + "[errored]";
  }
}
