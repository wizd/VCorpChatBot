import { MessageInterface } from 'wechaty/impls';
import { parseStringPromise } from 'xml2js';
import { VSubscription, addVSubscription } from './db/vsubscription';
import { UserProfile } from './db/users';

export interface WeChatTransfer {
  title: string;
  des: string;
  type: string;
  content: string;
  url: string;
  thumburl: string;
  transcationid: string;
  transferid: string;
  invalidtime: string;
  begintransfertime: string;
  effectivedate: string;
  pay_memo: string;
  receiver_username: string;
  payer_username: string;
}


async function parseWeChatTransferXml(message: string): Promise<WeChatTransfer> {
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
 

export async function handleTxMessage(vcuser: UserProfile, message : MessageInterface, botWxId: string): Promise<void> {
    try
    {
        if(vcuser === null || vcuser._id === undefined) {
            console.log("vcuser is null");
            return;
        }

        const txtext = message.text();

        parseWeChatTransferXml(txtext).then(async (transfer) => {            
          console.log(transfer);

            // is this transfer is for me?
            if(transfer.receiver_username !== botWxId) {
                console.log("This transfer is not for me but to: ", transfer.receiver_username);
                return;
            }
                
            // add to subscription
            const sub : VSubscription = {
                userId: vcuser._id!,
                wctxinfo: [transfer],
                time: new Date(),
                expire: new Date(),
            };

            console.log("Will add subscription: ", sub);

            //await addVSubscription(sub);
        });


    
        // const txinfo = parseWechatTransfer(txtext);
        // if(txinfo !== null)      {
        //     const exp = calculateMembershipExpiration(txinfo.amount);
        //     const expstr = timeRemainingReadable(exp);
        //     await message.say(`@${contact.payload?.name}\n收到转账${txinfo.amount}元，谢谢！${txinfo.memo} 的优惠价是380, 您的会员有效期至${exp}，一共 ${expstr}`);
        // }
    }
    catch(e)
    {
        console.log("Error in handleTxMessage: ", e);
    }
}

