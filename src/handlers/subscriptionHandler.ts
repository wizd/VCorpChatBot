import { ContactInterface, MessageInterface } from 'wechaty/impls';
import { UserProfile } from '../db/models/users';
import { getVSubCode } from '../db/models/subcode';
import {
  VSubscription,
  getVSubscriptions,
  reedemSubCode,
} from '../db/models/vsubscription';
import { ObjectId } from 'mongodb';

function formatSubscription(sub: VSubscription): string {
  return `兑换时间: ${sub.redeemTime.toLocaleString()}
  开始时间: ${sub.begin.toLocaleString()}
  过期时间: ${sub.expire.toLocaleString()}
  `;
}

async function getReadableSubscriptions(userId: ObjectId): Promise<string> {
  const subscriptions = await getVSubscriptions(userId);

  if (subscriptions.length === 0) {
    return '您目前没有任何订阅记录。';
  }

  const formattedSubscriptions = subscriptions.map(formatSubscription);
  const result = formattedSubscriptions.join('\n----\n');

  return `您的订阅记录如下：\n\n${result}`;
}

export async function handleSubscription(
  vcuser: UserProfile,
  contact: ContactInterface,
  message: MessageInterface,
  input: string
) {
  // get  current subscription recoreds and show them
  getReadableSubscriptions(vcuser._id!).then(async (result) => {
    console.log(result);
    await message.say(result);
  });
}
