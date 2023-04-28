import {
  ContactInterface,
  MessageInterface,
  RoomInterface,
  WechatyInterface,
} from 'wechaty/impls';
import { chatWithVCorp, wxTransWithVCorp } from './chatServer';

const bypassMsgTypes = [4, 13];

export const msgRootDispatcher = async (
  bot: WechatyInterface,
  botid: string,
  message: MessageInterface,
  contact: ContactInterface,
  room: RoomInterface | undefined
) => {
  // process special messages
  // transfer message, type === 11
  const input = message.text();

  if (message.type() !== bot.Message.Type.Text) {
    console.log('message type is not text: ', message.type());
    //return;
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

  if (message.type() === 11) {
    const reply = await wxTransWithVCorp(botid, talkerid, text, room?.id);
    //await moneyTransferHandler(ssoid, message, input, contact, room, botid);
    if (reply.status === 'success') {
      if (reply.messages[0].content !== '') {
        await message.say(reply.messages[0].content);
      } else {
        // do nothing
      }
    } else {
      await message.say('转账处理失败，请联系客服（输入‘帮助’有详情）。');
    }
    return;
  }

  if (room) {
    try {
      let adminOnly = false;
      const idcount = await room.memberAll();
      if (idcount.length < 50 && room?.id !== process.env.BOT_ADMIN_ROOMID) {
        console.log('room member count is less than 50, ignore message');
        adminOnly = true;
      }

      const topic = await room.topic();
      const selfName = process.env.SELF_NAME; // bot.currentUser.name();

      console.log(`room topic is : ${topic}, ${text}`);
      if (text.indexOf(`@${selfName}`) !== -1) {
        text = text.replace(`@${selfName}`, '').trim();
        if (!text) return;

        console.log('user real text is: ', text);
        const username = `${topic.toString()}-${contact.toString()}`;

        const reply = await chatWithVCorp(
          botid,
          talkerid,
          text,
          room.id,
          adminOnly
        );

        if (!reply) return; // no response for empty message
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

  if (text) {
    console.log(
      `${contact} call gpt api @${new Date().toLocaleString()} with text: ${text}`
    );
    const reply = await chatWithVCorp(botid, talkerid, text);
    await message.say(reply);
  }
};
