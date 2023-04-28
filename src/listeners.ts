import {
  ContactInterface,
  ContactSelfInterface,
  FriendshipInterface,
  MessageInterface,
  WechatyInterface,
} from 'wechaty/impls';
import { getOrCreateUserByWeixinId } from './db/models/users';
import { addVFriendship } from './db/friendship';

import { msgRootDispatcher } from './messageDispatcher';
import { getOrCreateSSOByWeixinId } from './db/models/sso';

function onScan(qrcode: string, status: number) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('qrcode-terminal').generate(qrcode, { small: true }); // 在console端显示二维码
  const qrcodeImageUrl = [
    'https://wechaty.js.org/qrcode/',
    encodeURIComponent(qrcode),
  ].join('');
  console.log(qrcodeImageUrl);
}

let botid = '';
async function onLogin(user: ContactSelfInterface) {
  console.log(`User ${user} logged in`);
  console.log('my user id is: ', user.id);
  botid = user.id;
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
        await addVFriendship({
          name: friendship.contact().name(),
          time: new Date(),
        });
        break;
      case bot.Friendship.Type.Confirm:
        console.log(`friend ship confirmed`);
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
//  const sendMessage = async (bot: WechatyInterface, toUserId: string, payload: any): Promise<Message> => {
//   const toContact = await bot.Contact.load(toUserId);
//   const message = (await toContact.say(payload)) as Message;
//   return message;
// };

async function onMessage(message: MessageInterface, bot: WechatyInterface) {
  const contact = message.talker();
  const room = message.room();

  try {
    console.log('contact is: ', contact);
    //console.log("contact ID is: ", contact.id);
    console.log('room is: ', room);
    console.log('message is: ', message);

    // get talkerid
    const talkerid = message.talker().id;
    console.log('talkerid is: ', talkerid);
    const ssoid = await getOrCreateSSOByWeixinId(talkerid, botid);
    const vcuser = await getOrCreateUserByWeixinId(talkerid);
    if (ssoid === null || vcuser === null || vcuser._id === undefined) {
      console.log('Fatal error!!!!! vcuser is null for talkerid: ', talkerid);
      return;
    }

    await msgRootDispatcher(bot, botid, message, contact, room, ssoid._id!);
  } catch (err) {
    console.log('Fatal error!!!!! vcuser is null for talkerid: ', err);
    return;
  }

  return;
  /*
   */
}

const listeners = [onScan, onLogout, onLogin, onFriendship, onMessage];
export const bindListeners = (bot: WechatyInterface) => {
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
