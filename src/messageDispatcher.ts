import {
  ContactInterface,
  MessageInterface,
  RoomInterface,
  WechatyInterface,
} from 'wechaty/impls';
import { moneyTransferHandler } from './moneyTransferHandler';
import { isUserSubscribed } from './db/models/vsubscription';
import {
  getTokensSumByWeixinRoomId,
  getUsageCountForLast24Hours,
} from './db/models/usage';
import { ObjectId } from 'mongodb';
import { interpreter } from './db/convo/interpreter';
import { sendMessage } from './gptTurboApi';
import { handleSysConfig } from './db/convo/sysConfigHandler';

const adminCommands = /^(配置系统参数|配置折扣码)/;

const bypassMsgTypes = [4, 13];

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
  if (
    talkerid === 'weixin' ||
    contact.name() === '微信团队' ||
    contact.name() === '微信支付'
  ) {
    console.log('ignore message from weixin: ', message.text());
    return;
  }

  if (room) {
    try {
      const topic = await room.topic();
      const selfName = process.env.SELF_NAME; // bot.currentUser.name();

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

        // if (
        //   adminCommands.test(text) &&
        //   (room?.id === process.env.BOT_ADMIN_ROOMID ||
        //     talkerid === process.env.BOT_ADMIN_WXID)
        // ) {
        //   const ret = await handleSysConfig(ssoid.toHexString(), text);
        //   if (ret != null) {
        //     await message.say(ret);
        //     return;
        //   }
        // }

        // count room usage
        // const rusage = await getTokensSumByWeixinRoomId(room.id);
        // if (rusage.count >= 100) {
        //   await message.say(
        //     '本群今天的免费使用额度（100轮对话）已经用完了，如果想继续使用，请兑换订阅码或者成为会员。'
        //   );
        //   return;
        // }

        // if (rusage.count >= 60) {
        //   await message.say(
        //     '本群今天的免费使用额度（100轮对话）即将用完，如果想继续使用，请兑换订阅码或者成为会员。'
        //   );
        //   return;
        // }

        // const output = await interpreter(ssoid.toHexString(), text, room.id);
        // if (output != null) {
        //   await room.say(output, contact);
        //   return;
        // }

        const reply = await sendMessage(botid, text, ssoid, talkerid, room.id);
        // if (/\[errored\]$/gim.test(reply)) {
        //   reply = '遇到问题了，请稍后再试！';
        // }
        // if (/\[context_length_exceeded\]$/gim.test(reply)) {
        //   reply = '本轮会话长度太长啦，我记不住这么多东西，请重试！';
        // }
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

  if (message.type() !== bot.Message.Type.Text) {
    console.log('message type is not text: ', message.type());
    await message.say(
      '那是什么？我还没有学会处理其他类型的消息。还是请跟我用文字对话吧。'
    );
    return;
  }

  // const output = await interpreter(ssoid.toHexString(), text);
  // if (output != null) {
  //   await message.say(output);
  //   return;
  // }

  if (text) {
    // check if free use is out
    // const subscribed = await isUserSubscribed(ssoid);
    // if (!subscribed) {
    //   const count = await getUsageCountForLast24Hours(ssoid);
    //   if (count >= 20) {
    //     await message.say(
    //       '您今天的免费使用额度已经用完了，如果想继续使用，请兑换订阅码或者成为会员。如需详细信息，请输入:\n\n帮助'
    //     );
    //     return;
    //   }
    // }

    console.log(
      `${contact} call gpt api @${new Date().toLocaleString()} with text: ${text}`
    );
    const reply = await sendMessage(botid, text, ssoid, talkerid);
    // if (/\[errored\]$/gim.test(reply)) {
    //   reply = '遇到问题了，请稍后再试，或输入 重置 试试！';
    //   console.log(reply);
    // }
    // if (/\[context_length_exceeded\]$/gim.test(reply)) {
    //   reply =
    //     '本轮会话长度太长啦，我记不住这么多东西，抱歉！请输入 重置 试试！';
    //   console.log(reply);
    // }
    await message.say(reply);
  }
};
