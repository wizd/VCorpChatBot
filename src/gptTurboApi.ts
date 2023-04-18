import { ObjectId } from "mongodb";
import { fetchApi } from "./utils";
import { addUsage, getTokensSumByUserId, getTokensSumByWeixinRoomId, getTotalUsage } from "./db/usage";
import { addVChatMessage, deleteAllMessagesByUserId, getLatestMessages } from "./db/vchatmessage";

const chatWithGPT = async (messages: any[]) => {
  const headers: Record<string, any> = {
    Authorization: `Bearer ${process.env.OPEN_AI_KEY}`,
  };

  const answer = await fetchApi(
    process.env.OPEN_AI_URL || 'https://api.openai.com/v1/chat/completions',
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
    addUsage: async (usage: any, userId: ObjectId, roomWeixinId? : string) => {
      // {prompt_tokens: 10, completion_tokens: 17, total_tokens: 27}
      console.log("add usage for userId: ", userId);
      console.log("add usage: ", usage);
      await addUsage({
        userId,
        roomWeixinId,
        time: new Date(),
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      });
    },
    getUsage: async (userId: ObjectId) => {
      return await getTotalUsage(userId);
    },
    getUsagePrint: async (userId: ObjectId, roomWeixinId? : string) => {
      console.log(`getting usage for ${userId}...`);
      
      let ret = ''
      const printUsage = (owner: string, usage: any) => {
        if (usage) {
          for (const prop in usage) {
            switch (prop) {
              case 'prompt_sum': ret += `${owner}输入：${usage.prompt_sum}\n`; break
              case 'completion_sum': ret += `${owner}回答：${usage.completion_sum}\n`; break
              case 'total_sum': ret += `共计：${usage.total_sum}\n`; break
              case 'count': ret += `次数：${usage.count}\n`; break
            }
          }
        }
        ret += '\n'
      }
      const usage = await getTokensSumByUserId(userId);   
      printUsage("我的", usage);
      if(roomWeixinId)
      {
        const roomUsage = await getTokensSumByWeixinRoomId(roomWeixinId);   
        printUsage("群", roomUsage);
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
export async function sendMessage(message: string, userId: ObjectId, roomWeixinId?: string) {
  try {
    await messageManager.addUserMessage(message, userId);
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
    messageManager.addUsage(completion.usage, userId, roomWeixinId);
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
    } catch (_) { /* empty */ }
    return (err as Error).message + "   " + errorBody + "[errored]";
  }
}
