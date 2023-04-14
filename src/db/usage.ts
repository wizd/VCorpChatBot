import { ObjectId } from "mongodb";
import { withDb } from "./db";

const collName = "usage";

interface UsageDocument {
    _id?: ObjectId;
    userId: ObjectId;
    roomWeixinId?: string; 
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    time: Date;
  }  

export type ChatUsage = UsageDocument;


export async function addUsage(usage: ChatUsage): Promise<string | null> {
    const result = await withDb(async (db) => {
      const collection = db.collection<UsageDocument>(collName);
      const result = await collection.insertOne(usage);
      console.log("Usage inserted:", result);
      return result;
    });
  
    // 如果插入失败，则返回 null
    if (!result.insertedId) {
      return null;
    }
  
    return result.insertedId.toString();
  }

export async function getTokensSumByUserId(userId: ObjectId): Promise<{ prompt_sum: number; completion_sum: number; total_sum: number }> {
    const result = await withDb(async (db) => {
      const collection = db.collection<UsageDocument>("usage");
      const aggregationResult = await collection.aggregate<{ prompt_sum: number; completion_sum: number; total_sum: number }>([
        {
          $match: {
            userId: userId,
          },
        },
        {
          $group: {
            _id: null,
            prompt_sum: { $sum: "$prompt_tokens" },
            completion_sum: { $sum: "$completion_tokens" },
            total_sum: { $sum: "$total_tokens" },
          },
        },
      ]).toArray();
  
      return aggregationResult.length > 0 ? aggregationResult[0] : { prompt_sum: 0, completion_sum: 0, total_sum: 0 };
    });
  
    return result;
  }

  export async function getTokensSumByWeixinRoomId(weixinRoomId: string): Promise<{ prompt_sum: number; completion_sum: number; total_sum: number }> {
    const result = await withDb(async (db) => {
      const collection = db.collection<UsageDocument>("usage");
      const aggregationResult = await collection.aggregate<{ prompt_sum: number; completion_sum: number; total_sum: number }>([
        {
          $match: {
            roomWeixinId: weixinRoomId,
          },
        },
        {
          $group: {
            _id: null,
            prompt_sum: { $sum: "$prompt_tokens" },
            completion_sum: { $sum: "$completion_tokens" },
            total_sum: { $sum: "$total_tokens" },
          },
        },
      ]).toArray();
  
      return aggregationResult.length > 0 ? aggregationResult[0] : { prompt_sum: 0, completion_sum: 0, total_sum: 0 };
    });
  
    return result;
  }

export async function getTotalUsage(userId: ObjectId): Promise<number> {
    const result = await withDb(async (db) => {
        const collection = db.collection<UsageDocument>(collName);
        const totalUsage = await collection.aggregate<{ total: number }>([
            {
              $group: {
                _id: null,
                total: { $sum: "$total_tokens" },
              },
            },
          ]).toArray();
      
          return totalUsage.length > 0 ? totalUsage[0].total : 0;
      });  
      
        return result;
  }