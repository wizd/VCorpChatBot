import { ObjectId } from "mongodb";
import { withDb } from "./db";

const collName = "messages";

interface MessageDocument {
    _id?: ObjectId;
    userId: ObjectId;   // always be our customer
    replyToId?: ObjectId;   // if it is a reply, this is the id of the message being replied to
    isFromAI: boolean;
    message: string;
    type: number;
    time: Date;
  }  

export type VChatMessage = MessageDocument;

export async function addVChatMessage(msg: VChatMessage): Promise<string | null> {
    const result = await withDb(async (db) => {
      const collection = db.collection<MessageDocument>(collName);

      const result = await collection.insertOne(msg);
      console.log("Message inserted:", result);
      return result;
    });
  
    // 如果插入失败，则返回 null
    if (!result.insertedId) {
      return null;
    }
  
    return result.insertedId.toString();
  }

  export async function getLatestMessages(userId: ObjectId, num: number = 3): Promise<MessageDocument[]> {
    const result = await withDb(async (db) => {
      const collection = db.collection<MessageDocument>("messages");
      const latestMessages = await collection.find({userId})
        .sort({ time: -1 })
        .limit(num)
        .toArray();
  
      // 对 latestMessages 按时间从旧到新排序
      latestMessages.sort((a, b) => a.time.getTime() - b.time.getTime());
  
      return latestMessages;
    });
  
    return result;
  }  

  export async function deleteAllMessagesByUserId(userId: ObjectId): Promise<void> {
    await withDb(async (db) => {
      const collection = db.collection<MessageDocument>("messages");
      await collection.deleteMany({ userId });
    });
  }