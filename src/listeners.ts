import {
  ContactInterface,
  ContactSelfInterface,
  FriendshipInterface,
  MessageInterface,
  WechatyInterface,
} from 'wechaty/impls';
import { msgRootDispatcher } from './messageDispatcher.js';
import { Contact, Message } from 'wechaty';
import ChatClient from './chatClient.js';
import {
  VwsAudioMessage,
  VwsTextMessage,
  VwsVideoMessage,
  isVwsAudioMessage,
  isVwsSystemMessage,
  isVwsTextMessage,
  isVwsVideoMessage,
} from './wsproto.js';
import QRCode from 'qrcode-terminal';
import { FileBox } from 'file-box';
import { toBuffer } from './utils.js';
import { NAME, VCORP_AI_KEY, VCORP_AI_URL } from '../index.js';
import { wxScanWithVCorp } from './chatServer.js';
import { downloadWithRetry } from './wsmsgprocessor.js';

let thebot: WechatyInterface;

// const sendMessage = async (
//   bot: WechatyInterface,
//   contact: ContactInterface,
//   payload: any
// ): Promise<Message> => {
//   const message = (await contact.say(payload)) as Message;
//   return message;
// };

function onScan(qrcode: string, status: number) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  QRCode.generate(qrcode, { small: true }); // 在console端显示二维码
  const qrcodeImageUrl = [
    'https://wechaty.js.org/qrcode/',
    encodeURIComponent(qrcode),
  ].join('');
  console.log(qrcodeImageUrl);

  wxScanWithVCorp(botid, NAME!, qrcode)
    .catch(err => {
      // 处理/记录错误
      console.error(err);
    });
}

let botid = '';
async function onLogin(user: ContactSelfInterface) {
  console.log(`User ${user} logged in`);
  console.log('my user id is: ', user.id);

  // don't work. padlocal cache them all.
  // const contactMeLatest = (await thebot.Contact.find({ id: user.id }))!;
  // console.log('My latest user name is: ', contactMeLatest.name());

  botid = process.env.MODE === "powerbot" ? user.id : user.name();

  cc.register(botid);
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
        // await addVFriendship({
        //   name: friendship.contact().name(),
        //   time: new Date(),
        // });
        break;
      case bot.Friendship.Type.Confirm:
        console.log(`friend ship confirmed`);
        // say welcome
        // try {
        //   const contact = friendship.contact();
        //   const msg = getVCorpConfigByName('welcomeText');
        //   await sendMessage(bot, contact, msg);
        // } catch (err) {
        //   console.log('error say hello to new friend: ', err);
        // }
        break;
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * toUserId: wxid_xxx | xxx@chatroom
 * payload: string | number | Message | Contact | FileBox | MiniProgram | UrlLink
 */
const sendMessage = async (
  bot: WechatyInterface,
  toUserId: string,
  payload: any
): Promise<Message | null> => {
  if (process.env.MODE === "powerbot") {
    const toContact = await bot.Contact.find({ id: toUserId });
    if (toContact === undefined) {
      console.log('contact not found: ', toUserId);
      return null;
    }
    return await sendMessageToContact(bot, toContact, payload);
  }
  else {
    const toContact = await bot.Contact.find({ alias: toUserId }) ?? await bot.Contact.find({ name: toUserId });
    if (toContact === undefined) {
      console.log('contact not found: ', toUserId);
      return null;
    }
    return await sendMessageToContact(bot, toContact, payload);
  }
};

const sendMessageToContact = async (
  bot: WechatyInterface,
  toContact: Contact,
  payload: any
): Promise<Message | null> => {
  const message = (await toContact.say(payload)) as Message;
  return message;
};

let cc: ChatClient;
function ConnectWebsocket() {
  cc = new ChatClient(
    VCORP_AI_URL!.replace('/vc/v1', ''),
    VCORP_AI_KEY!
  );

  cc.onNewMessage(async (vmsg) => {
    try {
      console.log('received message from AI engine: ', vmsg);
      if (isVwsTextMessage(vmsg)) {
        const tmsg = vmsg as VwsTextMessage;
        console.log('Send to', tmsg.dst, 'content: ', tmsg);

        // get user's id from user's name
        await sendMessage(thebot, vmsg.dst, tmsg.content);
      } else if (isVwsAudioMessage(vmsg)) {
        const audmsg = vmsg as VwsAudioMessage;
        console.log('duration is: ', audmsg.duration);

        const fileBox = FileBox.fromBuffer(toBuffer(audmsg.data), audmsg.duration === 0 ? 'voice.mp3' : 'voice.sil');
        //fileBox.mediaType = 'audio/silk';
        if (audmsg.duration !== 0) {
          fileBox.metadata = {
            voiceLength: audmsg.duration ?? 2000,
          };
        }

        const message = await sendMessage(thebot, audmsg.dst, fileBox);
      } else if (isVwsVideoMessage(vmsg)) {
        const vidmsg = vmsg as VwsVideoMessage;
        processVideoMessage(vidmsg);
      }
    } catch (err) {
      console.log('error in cc.onNewMessage: ', err);
    }
  });
}

function processVideoMessage(vidmsg: VwsVideoMessage) {
  downloadWithRetry(vidmsg.url)
    .then((data) => {
      const fileBox = FileBox.fromBuffer(toBuffer(data!), 'video.mp4');
      return sendMessage(thebot, vidmsg.dst, fileBox);
    })
    .then((message) => {
      console.log('Video message sent successfully');
    })
    .catch((error) => {
      console.error('Failed to process video message:', error);
    });
}


async function onMessage(message: MessageInterface, bot: WechatyInterface) {
  const contact = message.talker();
  const room = message.room();

  try {
    console.log('contact is: ', contact);
    //console.log("contact ID is: ", contact.id);
    console.log('room is: ', room);
    console.log('message is: ', message);

    // get talkerid
    const talker = message.talker();
    console.log('talker is: ', talker);

    await msgRootDispatcher(cc, bot, botid, message, contact, room);
  } catch (err) {
    console.log('Error: ', err);
    await message.say(`[非常抱歉，发生了系统错误：${err}，请联系客服。]`);
    return;
  }

  return;
}

const listeners = [onScan, onLogout, onLogin, onFriendship, onMessage];
export const startVcorp = () => {
  ConnectWebsocket();
}
export const bindListeners = (bot: WechatyInterface) => {
  thebot = bot;
  return bot
    .on('scan', onScan)
    .on('login', onLogin)
    .on('logout', onLogout)
    .on('message', (message: MessageInterface) => {
      onMessage(message, bot);
    })
    .on('friendship', (friendship: FriendshipInterface) =>
      onFriendship(friendship, bot)
    );
};
