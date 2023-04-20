import {
  ContactInterface,
  MessageInterface,
  RoomInterface,
} from 'wechaty/impls';
import { parseStringPromise } from 'xml2js';
import { VSubscription, addVSubscription } from './db/models/vsubscription';
import { UserProfile } from './db/models/users';
import { WeChatTransfer } from './db/misc/sharedTypes';
import { getVCorpConfigByName } from './db/models/sysconfig';
import { generateAuthCode } from './db/misc/helper';
import {
  VSubCode,
  addVSubCode,
  getVSubCode,
  getVSubCodeByTxId,
} from './db/models/subcode';
import { Message } from 'wechaty';
import { ObjectId } from 'mongodb';
import { getVCouponCode, updateVCouponCode } from './db/models/couponcode';

async function parseWeChatTransferXml(
  message: string
): Promise<WeChatTransfer> {
  // Replace \n with newlines
  const formattedMessage = message.replace(/\\n/g, '\n');

  // Parse the XML
  const parsedXml = await parseStringPromise(formattedMessage);

  const appMsg = parsedXml.msg.appmsg[0];
  const wcpayInfo = appMsg.wcpayinfo[0];

  const transfer: WeChatTransfer = {
    title: appMsg.title[0],
    des: appMsg.des[0],
    type: appMsg.type[0],
    content: appMsg.content[0],
    url: appMsg.url[0],
    thumburl: appMsg.thumburl[0],
    transcationid: wcpayInfo.transcationid[0],
    transferid: wcpayInfo.transferid[0],
    invalidtime: wcpayInfo.invalidtime[0],
    begintransfertime: wcpayInfo.begintransfertime[0],
    effectivedate: wcpayInfo.effectivedate[0],
    pay_memo: wcpayInfo.pay_memo[0],
    receiver_username: wcpayInfo.receiver_username[0],
    payer_username: wcpayInfo.payer_username[0],
  };

  return transfer;
}

const parseMoney = (str: string): number => {
  const regex = /(\d+(\.\d{1,2})?)/;
  const match = str.match(regex);

  if (match) {
    const amount = parseFloat(match[0]);
    console.log('Amount extracted:', amount);
    return amount;
  } else {
    console.log('No amount found in the string.');
    return 0;
  }
};

export async function moneyTransferHandler(
  ssoid: ObjectId,
  message: MessageInterface,
  input: string,
  contact: ContactInterface,
  room: RoomInterface | undefined,
  botWxId: string
): Promise<void> {
  try {
    const txtext = input;

    parseWeChatTransferXml(txtext).then(async (transfer) => {
      console.log(transfer);

      // is this transfer is for me?
      if (transfer.receiver_username !== botWxId) {
        console.log(
          'This transfer is not for me but to: ',
          transfer.receiver_username
        );
        return;
      }

      // is ths transfer has been processed?
      if (
        transfer.transcationid === undefined ||
        transfer.transcationid === null ||
        transfer.transcationid === ''
      ) {
        console.log('This transfer has no transcationid');
        return;
      }

      if (room) {
        await message.say(
          `无法在群内进行订阅。请直接发消息给我并联系客服退款。`
        );
        return;
      }

      const existingSubCode = await getVSubCodeByTxId(transfer.transcationid);
      if (existingSubCode) {
        console.log('This transfer has been processed');
        return;
      }

      // get year fee
      console.log('getting year fee');
      const yearFeeStr = await getVCorpConfigByName('yearTextSubFee');
      let yearFee = +yearFeeStr!.configValue;

      const amount = parseMoney(transfer.des);
      const payMemo = transfer.pay_memo;
      // lookup coupon code from database
      const couponCode = await getVCouponCode(payMemo);
      if (couponCode !== null) {
        yearFee = couponCode.price;

        // update coupon code to used
        couponCode.issuedCount = couponCode.issuedCount + 1;
        couponCode.time = new Date();
        await updateVCouponCode(couponCode);
      }

      if (amount % yearFee === 0) {
        console.log('Amount is a strict multiple of yearFee.');
      } else {
        console.log('Amount is not a strict multiple of yearFee.');
      }

      if (amount < yearFee) {
        console.log('Amount is less than year fee');
        await message.say('金额不足。');
        return;
      }

      // create subcode
      console.log('generate subcode');
      const code = generateAuthCode();

      // add record to database
      const aYearFromNow = new Date();
      aYearFromNow.setFullYear(aYearFromNow.getFullYear() + 1);
      const subcode: VSubCode = {
        userId: ssoid,
        code: code,
        time: new Date(),
        timeSpanInMs: aYearFromNow.getTime() - new Date().getTime(),
        used: false,
        wctxinfo: [transfer],
        wxtxId: transfer.transcationid,
      };

      console.log('adding sub code to database: ', subcode);
      await addVSubCode(subcode);
      console.log('subcode added to database. then get it from database');
      // try get it from database
      const subcode2 = await getVSubCode(code);
      console.log('verifiying subcode');
      if (subcode2 && subcode2.code === code) {
        console.log('Added subcode to database');
        if (room) {
          await message.say(
            '恭喜你！您的会员订阅已生成，有效期一年。订阅码已经发消息给您了，请注意查收。'
          );

          const payload =
            '恭喜你！您的会员订阅已生成，有效期一年。直接对话聊天机器人，输入下列文本即可兑换会员：\n\n兑换订阅码 ' +
            code;
          const toContact = await message.toContact();
          await toContact.say(payload);
        } else {
          await message.say(
            '恭喜你！您的会员订阅已生成，有效期一年。直接对话聊天机器人，输入下列文本即可兑换会员：\n\n兑换订阅码 ' +
              code
          );
        }
      } else {
        console.log('Failed to add subcode to database');
        await message.say('创建订阅码失败，请联系管理员');
      }
    });
  } catch (e) {
    console.log('Error in handleTxMessage: ', e);
  }
}
