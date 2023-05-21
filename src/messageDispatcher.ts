import {
  ContactInterface,
  MessageInterface,
  RoomInterface,
  WechatyInterface,
} from 'wechaty/impls';
import { chatWithVCorp, wxTransWithVCorp } from './chatServer.js';
import { FileBox, FileBoxInterface } from 'file-box';
import axios from 'axios';
import { parseHistoryXml } from './chatHistMsg.js';
import ChatClient from './chatClient.js';
import { VwsSystemMessage } from './wsproto.js';

const bypassMsgTypes = [4, 13];

export const msgRootDispatcher = async (
  cc: ChatClient,
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

  if (message.type() === 4) {
    // chat history
    // console.log('message history xml is: \n', input);
    // const messages = await parseHistoryXml(input);
    // console.log('Got chat history: ', messages);
    // return;
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

  if(process.env.MODE === 'personal'){
    if(message.payload){
      const archmsg : VwsSystemMessage = {
        id: new Date().getTime().toString(),
        src: "ws",
        dst: "server",
        type: "system",
        time: new Date().getTime(),
        cmd: "weixinarchive",
        note: JSON.stringify(message.payload)
      };
      cc.sendChatMessage(archmsg);
    }
    return;
  }


  if (room) {
    try {
      const adminOnly = false;
      const idcount = await room.memberAll();
      // if (idcount.length < 50 && room?.id !== process.env.BOT_ADMIN_ROOMID) {
      //   console.log('room member count is less than 50, ignore message');
      //   adminOnly = true;
      // }

      const topic = await room.topic();
      console.log('Bot current user name is: ', bot.currentUser.name());
      const selfName = bot.currentUser.name();
      //process.env.SELF_NAME;
      // bot.currentUser.name();
      const tolist = await message.mentionList();

      console.log(`room topic is : ${topic}, ${text}`);
      if (
        text.indexOf(`@${selfName}`) !== -1 ||
        tolist.find((a) => a.id === botid)
      ) {
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
        //await room.say(reply, contact);
        await processReply(reply, async (output) => {
          if (typeof output === 'string') {
            await room.say(output, contact);
          } else {
            await room.say(output);
          }
        });
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

  // if (message.type() !== bot.Message.Type.Text) {
  //   console.log('message type is not text: ', message.type());
  //   await message.say(
  //     '那是什么？我还没有学会处理其他类型的消息。还是请跟我用文字对话吧。'
  //   );
  //   return;
  // }

  if (text) {
    console.log(
      `${contact} call gpt api @${new Date().toLocaleString()} with text: ${text}`
    );

    const reply = await chatWithVCorp(botid, talkerid, text);

    await processReply(reply, async (output) => {
      await message.say(output);
    });
  }
};

async function processReply(
  reply: string,
  sendMessage: (message: string | FileBox) => Promise<void>
) {
  console.log('AI reply is: ', reply);
  const result = extractImageUrl(reply);

  if (result.text.trim() !== '') {
    await sendMessage(result.text);
  }

  if (result.imageUrl) {
    // Download the image from the URL
    const buffer = await downloadImage(result.imageUrl.trim());

    // 图片大小建议不要超过 2 M
    const fileBox = FileBox.fromBuffer(
      buffer,
      extractFilenameFromImageUrl(result.imageUrl)
    );
    console.log('sending image to weixin...');
    await sendMessage(fileBox);
  }
}

function extractFilenameFromImageUrl(url: string): string {
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1];
  return filename;
}

async function downloadImage(url: string): Promise<Buffer> {
  try {
    console.log('downloading image: ', url);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 8000, // 设置 10 秒超时
    });

    const buffer = Buffer.from(response.data, 'binary');
    return buffer;
  } catch (error) {
    console.error('Error downloading the image:', error);
    throw error;
  }
}

interface UrlExtractionResult {
  text: string;
  imageUrl?: string;
}

function extractImageUrl(text: string): UrlExtractionResult {
  const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif))/i;
  const match = text.match(urlRegex);

  if (match) {
    const imageUrl = match[0];
    const textWithoutUrl = text.replace(urlRegex, '').trim();
    return { text: textWithoutUrl, imageUrl };
  }

  return { text };
}
