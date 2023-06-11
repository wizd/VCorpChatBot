import {
  ContactInterface,
  MessageInterface,
  RoomInterface,
  WechatyInterface,
} from 'wechaty/impls';
import * as PUPPET from 'wechaty-puppet';
import { chatWithVCorp, wxTransWithVCorp } from './chatServer.js';
import { FileBox, FileBoxInterface } from 'file-box';
import { parseHistoryXml } from './chatHistMsg.js';
import ChatClient from './chatClient.js';
import { VwsBlobMessage, VwsImageMessage, VwsSystemMessage } from './wsproto.js';
import { MiniProgram, UrlLink } from 'wechaty';
import { VwsAudioMessage } from './wsproto.js';
import { MODE } from '../index.js';
import { uploadFile } from './fileUploader.js';
import { downloadWithRetry } from './wsmsgprocessor.js';

const bypassMsgTypes = [4, 13];

export const msgRootDispatcher = async (
  cc: ChatClient,
  bot: WechatyInterface,
  botid: string,
  message: MessageInterface,
  contact: ContactInterface,
  room: RoomInterface | undefined
) => {
  switch (message.type()) {
    // 文本消息
    case PUPPET.types.Message.Text: {
      const text = message.text();
      return await msgRootDispatcher2(cc, bot, botid, message, contact, room);
    }
    // 图片消息
    case PUPPET.types.Message.Image: {
      const file = await message.toFileBox();
      console.log("Image File is: ", file);

      const blob: Buffer = await file.toBuffer();

      await uploadFile("wx." + file.name, file.mediaType, blob, message.payload?.talkerId ?? '');
      // send to humine
      // const blobmsg: VwsBlobMessage = {
      //   id: new Date().getTime().toString(),
      //   src: message.payload?.talkerId ?? '',
      //   dst: 'humine',
      //   time: new Date().getTime(),
      //   type: "blob",
      //   fn: file.name,
      //   data: toArrayBuffer(blob),
      // };
      // cc.sendChatMessage(blobmsg);

      // const messageImage = await message.toImage();

      // // 缩略图
      // try
      // {
      //   const thumbImage = await messageImage.thumbnail();
      //   const thumbImageData = await thumbImage.toBuffer();
      // }
      // catch(err) {
      //   console.log("get small pic error:", err);
      // }

      // // thumbImageData: 缩略图图片二进制数据

      // // 大图
      // try
      // {
      //   const hdImage = await messageImage.hd();
      //   const hdImageData = await hdImage.toBuffer();
      // }
      // catch(err) {
      //   console.log("get big pic error:", err);
      // }
      // // 大图图片二进制数据

      // // 原图
      // try
      // {
      //   const artworkImage = await messageImage.artwork();
      //   const artworkImageData = await artworkImage.toBuffer();
      // }
      // catch(err) {
      //   console.log("get art pic error:", err);
      // }

      // artworkImageData: 原图图片二进制数据



      console.log("got an image!");
      break;
    }
    // 链接卡片消息
    case PUPPET.types.Message.Url: {
      const urlLink: UrlLink = await message.toUrlLink();
      // urlLink: 链接主要数据：包括 title，URL，description

      //const urlThumbImage = await message.toFileBox();
      //const urlThumbImageData = await urlThumbImage.toBuffer();
      // urlThumbImageData: 链接的缩略图二进制数据

      break;
    }
    // 小程序卡片消息
    case PUPPET.types.Message.MiniProgram: {
      const miniProgram: MiniProgram = await message.toMiniProgram();
      /*
      miniProgram: 小程序卡片数据
      {
        appid: "wx363a...",
        description: "贝壳找房 - 真房源",
        title: "美国白宫，10室8厅9卫，99999刀/月",
        iconUrl: "http://mmbiz.qpic.cn/mmbiz_png/.../640?wx_fmt=png&wxfrom=200",
        pagePath: "pages/home/home.html...",
        shareId: "0_wx363afd5a1384b770_..._1615104758_0",
        thumbKey: "84db921169862291...",
        thumbUrl: "3051020100044a304802010002046296f57502033d14...",
        username: "gh_8a51...@app"
      }
     */
      break;
    }
    // 语音消息
    case PUPPET.types.Message.Audio: {
      const audioFileBox = await message.toFileBox();

      const audioData: Buffer = await audioFileBox.toBuffer();
      // audioData: silk 格式的语音文件二进制数据
      // send to humine
      const audiomsg: VwsAudioMessage = {
        id: new Date().getTime().toString(),
        src: message.payload?.talkerId ?? '',
        dst: 'humine',
        type: 'audio',
        fmt: audioFileBox.name.endsWith("mp3") ? "mp3" : undefined,
        time: new Date().getTime(),
        data: toArrayBuffer(audioData),
      };
      cc.sendChatMessage(audiomsg);
      break;
    }
    // 视频消息
    case PUPPET.types.Message.Video: {
      const videoFileBox = await message.toFileBox();

      //const videoData: Buffer = await videoFileBox.toBuffer();
      // videoData: 视频文件二进制数
      break;
    }
    // 动图表情消息
    case PUPPET.types.Message.Emoticon: {
      const emotionFile = await message.toFileBox();

      // cause: Error:  Error: protocol is empty
      //const emotionData: Buffer = await emotionFile.toBuffer();
      // emotionData: 动图 Gif文件 二进制数据

      break;
    }
    // 文件消息
    case PUPPET.types.Message.Attachment: {
      const attachFileBox = await message.toFileBox();

      //const attachData = await attachFileBox.toBuffer();
      // attachData: 文件二进制数据

      break;
    }
    // 其他消息
    default:
      return await msgRootDispatcher2(cc, bot, botid, message, contact, room);
      break;
  }
};

function toArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

export const msgRootDispatcher2 = async (
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
  const talker = message.talker();
  const talkerid = talker.id;
  if (
    talkerid === 'weixin' ||
    contact.name() === '微信团队' ||
    contact.name() === '微信支付'
  ) {
    console.log('ignore message from weixin: ', message.text());
    return;
  }

  const alias = await talker.alias() ?? talker.name() ?? talkerid;

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

  if (MODE === 'personal') {
    if (message.payload) {
      const archmsg: VwsSystemMessage = {
        id: new Date().getTime().toString(),
        src: 'ws',
        dst: 'server',
        type: 'system',
        time: new Date().getTime(),
        cmd: 'weixinarchive',
        note: JSON.stringify(message.payload),
      };
      cc.sendChatMessage(archmsg);
    }
    return;
  }

  if (room) {
    try {
      const adminOnly = false;
      const idcount = await room.memberAll();
      // if (idcount.length < 50 && room?.id !== BOT_ADMIN_ROOMID) {
      //   console.log('room member count is less than 50, ignore message');
      //   adminOnly = true;
      // }

      const topic = await room.topic();
      console.log('Bot current user name is: ', bot.currentUser.name());
      const selfName = bot.currentUser.name();

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
          process.env.MODE === "powerbot" ? talkerid : alias,
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
      else {
        console.log("message is not for me.");
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

    const reply = await chatWithVCorp(botid, 
      process.env.MODE === "powerbot" ? talkerid : alias,
      text);

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
    const buffer = await downloadWithRetry(result.imageUrl.trim());

    // 图片大小建议不要超过 2 M
    const fileBox = FileBox.fromBuffer(
      buffer!,
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
