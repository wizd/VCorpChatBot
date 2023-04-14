import { ObjectId } from "mongodb";
import { withDb } from "./db";

const collName = "friends";

interface FriendshipDocument {
    _id?: ObjectId;
    name: string;
    time: Date;
  }  

export type VFriendship = FriendshipDocument;


export async function addVFriendship(usage: VFriendship): Promise<string | null> {
    const result = await withDb(async (db) => {
      const collection = db.collection<FriendshipDocument>(collName);
      const result = await collection.insertOne(usage);
      console.log("Friendship inserted:", result);
      return result;
    });
  
    // 如果插入失败，则返回 null
    if (!result.insertedId) {
      return null;
    }
  
    return result.insertedId.toString();
  }
