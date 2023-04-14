import {
  ContactInterface,
  ContactSelfInterface,
  FriendshipInterface,
  MessageInterface,
  WechatyInterface,
} from "wechaty/impls";
import { asyncSleep } from "./utils";
import { sendMessage, resetMessage, messageManager } from "./gptTurboApi";
import { addUser, getOrCreateUserByWeixinId, getUserByWeixinId } from "./db/users";
import { handleTxMessage } from "./wctxmsg";

function onScan(qrcode: string, status: number) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("qrcode-terminal").generate(qrcode, { small: true }); // 在console端显示二维码
  const qrcodeImageUrl = [
    "https://wechaty.js.org/qrcode/",
    encodeURIComponent(qrcode),
  ].join("");
  console.log(qrcodeImageUrl);
}
async function onLogin(user: ContactSelfInterface) {
  console.log(`User ${user} logged in`);
  console.log("my user id is: ", user.id);
  console.log("my wxid is: ", process.env.BOT_WXID);
}
function onLogout(user: ContactSelfInterface) {
  console.log(`${user} 已经登出`);
}
async function onFriendship(
  friendship: FriendshipInterface,
  bot: WechatyInterface
) {
  try {
    console.log(`received friend event:`, friendship);
    switch (friendship.type()) {
      case bot.Friendship.Type.Receive:
        await friendship.accept();
        break;
      case bot.Friendship.Type.Confirm:
        console.log(`friend ship confirmed`);
        break;
    }
  } catch (e) {
    console.error(e);
  }
}

async function onMessage(message: MessageInterface, bot: WechatyInterface) {
  const contact = message.talker();
  const room = message.room();
  let text = message.text();

  console.log("contact is: ", contact);
  //console.log("contact ID is: ", contact.id);
  console.log("room is: ", room);
  console.log("message is: ", message);

  // get talkerid
  const talkerid = message.talker().id;
  console.log("talkerid is: ", talkerid);
  const vcuser = await getOrCreateUserByWeixinId(talkerid);
  if(vcuser === null || vcuser._id === undefined) {
    console.log("Fatal error!!!!! vcuser is null for talkerid: ", talkerid);
    return;
  }

  // process special messages
  // transfer message, type === 11
  if(message.type() === 11) {
    await handleTxMessage(vcuser, message, process.env.BOT_WXID!);
    return;
  }

  if(message.type() !== bot.Message.Type.Text) {
    console.log("message type is not text, ignore it: ", message.type());
    return;
  }

  if (room) {
    try {
      const topic = await room.topic()
      const selfName = bot.currentUser.name()

      // check if talk to me
      //const talkTos = await message.mentionList()
      //console.log("talkTos is: ", talkTos);
      //if(talkTos.includes(bot.currentUser.id)) return;

      console.log(`room topic is : ${topic}, ${text}`)
      if (text.indexOf(`@${selfName}`) !== -1) {
        text = text.replace(`@${selfName}`, "").trim()
        if (!text) return
        const username = `${topic.toString()}-${contact.toString()}`
        if (/^(usage|额度|用量)/gim.test(text)) {
          const humanUsage = await messageManager.getUsagePrint(vcuser._id, room.id);
          console.log(humanUsage)
          await message.say(`@${contact.payload?.name}\n${humanUsage}`);
          return
        }
        let reply = await sendMessage(text, vcuser._id, room.id);
        if (/\[errored\]$/gim.test(reply)) {
          reply = "遇到问题了，请稍后再试！";
        }
        if (/\[context_length_exceeded\]$/gim.test(reply)) {
          reply = "本轮会话长度太长啦，我记不住这么多东西，请重试！";
        }
        console.log(reply);
        room.say(reply, contact)
      }
    } catch (err) {
      console.log((err as Error).message);
    }
    return
  }
  if (message.self()) return;
  text = text.trim();
  console.log(
    `[${new Date().toLocaleString()}] contact: ${contact}, text:${text}, room: ${room}`
  );
  
  if (/(你|您)好$/gim.test(text) || /hello/gim.test(text)) {    
      message.say(
        `欢迎来到人工智能时代！我是基于chatGPT的AI助手~
您可以输入:
开始|start: 进入对话
重置|reset: 重置对话(开始一段新对话)
退出|exit : 退出对话
祝您旅途愉快！
`
      );
      return;    
  }
  // if (/^(开始|start)/gim.test(text)) {
  //   if (!gptUserList.includes(contact)) {
  //     gptUserList.push(contact);
  //     text = "你好";
  //   }
  // }
  if (/^(clear|退出|exit|quit)/gim.test(text)) {    
    await resetMessage(vcuser._id);
    await message.say("退出成功！");
    return;
  }
  if (/^(reset|重置)/gim.test(text)) {
    await resetMessage(vcuser._id);
    await message.say("重置对话成功！");
    await asyncSleep(1 * 1e3);
    await message.say("您可以输入新的内容了！");
    return;
  }
  if (/^(usage|额度|用量)/gim.test(text)) {
    const humanUsage = await messageManager.getUsagePrint(vcuser._id);
    console.log(humanUsage)
    await message.say(humanUsage!);
    return
  }
  if (text) {
    console.log(
      `${contact} call gpt api @${new Date().toLocaleString()} with text: ${text}`
    );
    let reply = await sendMessage(text, vcuser._id);
    if (/\[errored\]$/gim.test(reply)) {
      reply = "遇到问题了，请稍后再试，或输入 重置 试试！";
      console.log(reply);
    }
    if (/\[context_length_exceeded\]$/gim.test(reply)) {
      reply = "本轮会话长度太长啦，我记不住这么多东西，抱歉！请输入 重置 试试！";
      console.log(reply);
    }
    await message.say(reply);
  }
}

const listeners = [onScan, onLogout, onLogin, onFriendship, onMessage];
export const bindListeners = (bot: WechatyInterface) => {
  return bot
    .on("scan", onScan)
    .on("login", onLogin)
    .on("logout", onLogout)
    .on("message", (message: MessageInterface) => {
      onMessage(message, bot)
    })
    .on("friendship", (friendship: FriendshipInterface) =>
      onFriendship(friendship, bot)
    );
};
