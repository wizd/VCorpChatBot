import {
  ContactInterface,
  MessageInterface,
  RoomInterface,
  WechatyInterface,
} from 'wechaty/impls';
import { UserProfile } from '../db/users';
import { moneyTransferHandler } from './moneyTransferHandler';
import { handleSysConfig } from './sysConfigHandler';
import { handleSubscription } from './subscriptionHandler';
import { messageManager, resetMessage, sendMessage } from '../gptTurboApi';
import { generateAuthCode } from '../db/helper';
import { VAuthCode, addVAuthCode } from '../db/authcode';
import { handleSubscriptionCode } from './subcodeHandler';
import { asyncSleep, extractSubscriptionCode } from '../utils';

export const msgRootDispatcher = async (
  bot: WechatyInterface,
  botid: string,
  message: MessageInterface,
  contact: ContactInterface,
  room: RoomInterface | undefined,
  vcuser: UserProfile
) => {
  // process special messages
  // transfer message, type === 11
  const input = message.text();

  if (message.type() !== bot.Message.Type.Text) {
    console.log('message type is not text: ', message.type());
    //return;
  }

  if (message.type() === 11) {
    await moneyTransferHandler(vcuser, message, input, contact, room, botid);
    return;
  }

  if (message.type() === 13) {
    // notify from weixin that you have a pending transfer
    return;
  }

  // msg type 6 is image

  let text = input;
  const talkerid = message.talker().id;

  if (room) {
    try {
      const topic = await room.topic();
      const selfName = bot.currentUser.name();

      // check if talk to me
      //const talkTos = await message.mentionList()
      //console.log("talkTos is: ", talkTos);
      //if(talkTos.includes(bot.currentUser.id)) return;
      console.log(`room topic is : ${topic}, ${text}`);
      if (text.indexOf(`@${selfName}`) !== -1) {
        text = text.replace(`@${selfName}`, '').trim();
        if (!text) return;

        console.log('user real text is: ', text);
        const username = `${topic.toString()}-${contact.toString()}`;

        if (
          text.startsWith('配置系统参数') &&
          (room?.id === process.env.BOT_ADMIN_ROOMID ||
            talkerid === process.env.BOT_ADMIN_WXID)
        ) {
          await handleSysConfig(vcuser, contact, message, text);
          return;
        }

        if (text === '会员') {
          await handleSubscription(vcuser, contact, message, text);
          return;
        }

        if (/^(usage|额度|用量)/gim.test(text)) {
          const humanUsage = await messageManager.getUsagePrint(
            vcuser._id!,
            room.id
          );
          console.log(humanUsage);
          await message.say(`@${contact.payload?.name}\n${humanUsage}`);
          return;
        }
        if (/^(authcode|授权|授权码)/gim.test(text)) {
          await message.say(
            `@${contact.payload?.name}\n\n无法在群内进行账号关联授权。请给我直接发消息，谢谢。`
          );
          return;
        }
        let reply = await sendMessage(text, vcuser._id!, room.id);
        if (/\[errored\]$/gim.test(reply)) {
          reply = '遇到问题了，请稍后再试！';
        }
        if (/\[context_length_exceeded\]$/gim.test(reply)) {
          reply = '本轮会话长度太长啦，我记不住这么多东西，请重试！';
        }
        console.log(reply);
        room.say(reply, contact);
      }
    } catch (err) {
      console.log((err as Error).message);
    }
    return;
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
    await resetMessage(vcuser._id!);
    await message.say('退出成功！');
    return;
  }
  if (/^(reset|重置)/gim.test(text)) {
    await resetMessage(vcuser._id!);
    await message.say('重置对话成功！');
    await asyncSleep(1 * 1e3);
    await message.say('您可以输入新的内容了！');
    return;
  }
  if (/^(usage|额度|用量)/gim.test(text)) {
    const humanUsage = await messageManager.getUsagePrint(vcuser._id!);
    console.log(humanUsage);
    await message.say(humanUsage!);
    return;
  }
  if (/^(authcode|授权|授权码)/gim.test(text)) {
    const code = generateAuthCode();
    const authcode: VAuthCode = {
      userId: vcuser._id!,
      reqFrom: 'weixin',
      time: new Date(),
      code: code,
      expire: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes
      used: false,
    };
    const codeId = await addVAuthCode(authcode);
    if (codeId === null) {
      console.log('addVAuthCode failed!');
      await message.say('遇到问题了，请稍后再试！');
      return;
    }
    await message.say(
      `@${contact.payload?.name}\n\n请在10分钟内在其他平台输入下面这句话进行账户关联：\n\n关联授权 ${code}`
    );
    return;
  }

  if (text.indexOf('兑换订阅码') > -1) {
    const code = extractSubscriptionCode(text);
    if (code) {
      await handleSubscriptionCode(vcuser, contact, message, code);
      return;
    }
  }

  if (text === '会员') {
    await handleSubscription(vcuser, contact, message, text);
    return;
  }

  if (message.type() !== bot.Message.Type.Text) {
    console.log('message type is not text: ', message.type());
    await message.say(
      '那是什么？我还没有学会处理其他类型的消息。还是请跟我用文字对话吧。'
    );
    return;
  }

  if (text) {
    console.log(
      `${contact} call gpt api @${new Date().toLocaleString()} with text: ${text}`
    );
    let reply = await sendMessage(text, vcuser._id!);
    if (/\[errored\]$/gim.test(reply)) {
      reply = '遇到问题了，请稍后再试，或输入 重置 试试！';
      console.log(reply);
    }
    if (/\[context_length_exceeded\]$/gim.test(reply)) {
      reply =
        '本轮会话长度太长啦，我记不住这么多东西，抱歉！请输入 重置 试试！';
      console.log(reply);
    }
    await message.say(reply);
  }
};
