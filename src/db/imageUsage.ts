import { ObjectId } from "mongodb";
import { withDb } from "./db";

const collName = "imageUsages";

interface ImageUsageDocument {
    _id?: ObjectId;
    userId: ObjectId;
    time: Date;
    prompt: string;
    model: string;
    width: number;
    height: number;
  }  

export type ImageUsage = ImageUsageDocument;


export async function addImageUsage(usage: ImageUsage): Promise<string | null> {
    const result = await withDb(async (db) => {
      const collection = db.collection<ImageUsageDocument>(collName);
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

  export async function getImageUsageCountForLast24Hours(userId: ObjectId): Promise<number> {
    const result = await withDb(async (db) => {
      const collection = db.collection<ImageUsageDocument>(collName);
  
      const currentTime = new Date();
      const twentyFourHoursAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
  
      const count = await collection.countDocuments({
        userId: userId,
        time: { $gte: twentyFourHoursAgo },
      });
  
      return count;
    });
  
    return result;
  }