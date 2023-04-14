import { ObjectId } from "mongodb";
import { withDb } from "./db";
import { WeChatTransfer } from "../wctxmsg";

const collName = "subscriptions";

interface SubscriptionDocument {
    _id?: ObjectId;
    userId: ObjectId;   // always be our customer
    wctxinfo: WeChatTransfer[];
    time: Date;
    expire: Date;
  }  

export type VSubscription = SubscriptionDocument;

export async function addVSubscription(sub: VSubscription): Promise<string | null> {
    const result = await withDb(async (db) => {
      const collection = db.collection<SubscriptionDocument>(collName);

      const result = await collection.insertOne(sub);
      console.log("Message inserted:", result);
      return result;
    });
  
    // 如果插入失败，则返回 null
    if (!result.insertedId) {
      return null;
    }
  
    return result.insertedId.toString();
  }

  export async function getVSubscription(userId: ObjectId): Promise<VSubscription | null> {
    const result = await withDb(async (db) => {
      const collection = db.collection<SubscriptionDocument>(collName);
      return await collection.findOne({ userId });
    });
  
    return result;
  }  
