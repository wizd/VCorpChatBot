import { ContactInterface, MessageInterface } from 'wechaty/impls';
import { UserProfile } from '../db/models/users';
import { getVSubCode } from '../db/models/subcode';
import { reedemSubCode } from '../db/models/vsubscription';

export async function handleSubscriptionCode(
  vcuser: UserProfile,
  contact: ContactInterface,
  message: MessageInterface,
  code: string
) {
  if (!code) {
    await message.say(
      '请先购买订阅码，然后输入像这样的命令：\n\n兑换订阅码 a123-b123\n\n来激活订阅码。'
    );
    return;
  }

  const subcode = await getVSubCode(code);
  if (!subcode) {
    await message.say('无效的订阅码。');
    return;
  }

  if (subcode.used) {
    await message.say('订阅码已经被使用过了。');
    return;
  }

  try {
    const redeemResult = await reedemSubCode(subcode, vcuser._id!);
    if (redeemResult) {
      await message.say('订阅码兑换成功。');
    } else {
      await message.say('订阅码兑换失败，请稍后重试，或者联系管理员。');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}
