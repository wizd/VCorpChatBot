import {
  ContactInterface,
  MessageInterface,
  RoomInterface,
  WechatyInterface,
} from 'wechaty/impls';
import { moneyTransferHandler } from './moneyTransferHandler';
import { handleSysConfig } from './sysConfigHandler';
import { handleSubscription } from '../db/convo/subscriptionHandler';
import { messageManager, resetMessage, sendMessage } from '../gptTurboApi';
import { generateAuthCode } from '../db/misc/helper';
import { VAuthCode, addVAuthCode } from '../db/models/authcode';
import { handleSubscriptionCode } from './subcodeHandler';
import { asyncSleep, extractSubscriptionCode } from '../utils';
import { isUserSubscribed } from '../db/models/vsubscription';
import {
  getTokensSumByWeixinRoomId,
  getUsageCountForLast24Hours,
} from '../db/models/usage';
import { ObjectId } from 'mongodb';
import { interpreter } from '../db/convo/interpreter';

export const msgRootDispatcher = async (
  bot: WechatyInterface,
  botid: string,
  message: MessageInterface,
  contact: ContactInterface,
  room: RoomInterface | undefined,
  ssoid: ObjectId
) => {
  // process special messages
  // transfer message, type === 11
  const input = message.text();

  if (message.type() !== bot.Message.Type.Text) {
    console.log('message type is not text: ', message.type());
    //return;
  }

  if (message.type() === 11) {
    await moneyTransferHandler(ssoid, message, input, contact, room, botid);
    return;
  }

  if (message.type() === 13) {
    // notify from weixin that you have a pending transfer
    return;
  }

  // msg type 6 is image

  let text = input;
  const talkerid = message.talker().id;
  if (talkerid === 'weixin') {
    console.log('message from weixin: ', message.text());
    return;
  }

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
          await handleSysConfig(ssoid, contact, message, text);
          return;
        }

        // count room usage
        const rusage = await getTokensSumByWeixinRoomId(room.id);
        if (rusage.count >= 100) {
          await message.say(
            '本群今天的免费使用额度（100轮对话）已经用完了，如果想继续使用，请兑换订阅码或者成为会员。'
          );
          return;
        }

        if (rusage.count >= 60) {
          await message.say(
            '本群今天的免费使用额度（100轮对话）即将用完，如果想继续使用，请兑换订阅码或者成为会员。'
          );
          return;
        }

        const output = await interpreter(ssoid.toHexString(), text, room.id);
        if (output != null) {
          await room.say(output, contact);
          return;
        }

        let reply = await sendMessage(text, ssoid, room.id);
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
    await resetMessage(ssoid);
    await message.say('退出成功！');
    return;
  }
  if (/^(reset|重置)/gim.test(text)) {
    await resetMessage(ssoid);
    await message.say('重置对话成功！');
    await asyncSleep(1 * 1e3);
    await message.say('您可以输入新的内容了！');
    return;
  }

  if (/^(authcode|授权|授权码)/gim.test(text)) {
    const code = generateAuthCode();
    const authcode: VAuthCode = {
      ssoid: ssoid,
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
      await handleSubscriptionCode(ssoid, contact, message, code);
      return;
    }
  }

  if (message.type() !== bot.Message.Type.Text) {
    console.log('message type is not text: ', message.type());
    await message.say(
      '那是什么？我还没有学会处理其他类型的消息。还是请跟我用文字对话吧。'
    );
    return;
  }

  const output = await interpreter(ssoid.toHexString(), text);
  if (output != null) {
    await message.say(output);
    return;
  }

  if (text) {
    // check if free use is out
    const subscribed = await isUserSubscribed(ssoid);
    if (!subscribed) {
      const count = await getUsageCountForLast24Hours(ssoid);
      if (count >= 5) {
        await message.say(
          '您今天的免费使用额度已经用完了，如果想继续使用，请兑换订阅码或者成为会员。'
        );
        return;
      }
    }

    console.log(
      `${contact} call gpt api @${new Date().toLocaleString()} with text: ${text}`
    );
    let reply = await sendMessage(text, ssoid);
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
