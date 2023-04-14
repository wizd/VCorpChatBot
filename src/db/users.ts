import { ObjectId, ReturnDocument } from "mongodb";
import { withDb } from "./db";

// 定义 MongoDB 中的用户文档对象的结构
interface UserDocument {
  _id?: ObjectId;
  accountId?: string;
  weixinId?: string;
  conversationId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  avatar?: string;
}

// 定义 UserProfile 类型，它包含了 UserDocument 的所有字段
export type UserProfile = UserDocument;

export async function getUserById(id: string): Promise<UserProfile | null> {
  const result = await withDb(async (db) => {
    const collection = db.collection<UserDocument>("users"); // 指定 collection 的泛型类型为 UserDocument
    const user = await collection.findOne({ _id: new ObjectId(id) });
    return user;
  });

  return result ?? null;
}

export async function getUserByAccountId(
  accountId: string
): Promise<UserProfile | null> {
  const result = await withDb(async (db) => {
    const collection = db.collection<UserDocument>("users"); // 指定 collection 的泛型类型为 UserDocument
    const user = await collection.findOne({ accountId: accountId });
    return user;
  });

  return result ?? null;
}

export async function getUserByWeixinId(
    wxid: string
  ): Promise<UserProfile | null> {
    const result = await withDb(async (db) => {
      const collection = db.collection<UserDocument>("users"); // 指定 collection 的泛型类型为 UserDocument
      const user = await collection.findOne({ weixinId: wxid });
      return user;
    });
  
    return result ?? null;
  }

  export async function getOrCreateUserByWeixinId(
    wxid: string
  ): Promise<UserProfile | null> {
    const result = await withDb(async (db) => {
      const collection = db.collection<UserProfile>('users');
      const query: Partial<UserProfile> = { weixinId: wxid };
  
      // 如果找到了用户，就返回这个用户；否则，创建一个新用户
      const update = {
        $setOnInsert: {
          weixinId: wxid,
        },
      };
  
      const options = {
        upsert: true, // 如果没有找到匹配的文档，则插入一个新文档
        returnDocument: ReturnDocument.AFTER, // 返回修改后的文档
      };
  
      const { value: user } = await collection.findOneAndUpdate(query, update, options);
      return user;
    });
  
    return result;
  }

export async function addUser(user: UserProfile): Promise<string | null> {
  const result = await withDb(async (db) => {
    const collection = db.collection<UserDocument>("users");
    const result = await collection.insertOne(user);
    console.log("Document inserted:", result);
    return result;
  });

  // 如果插入失败，则返回 null
  if (!result.insertedId) {
    return null;
  }

  return result.insertedId.toString();
}

export async function updateUser(
  id: string,
  updates: UserProfile
): Promise<number> {
  const result = await withDb(async (db) => {
    const collection = db.collection<UserDocument>("users");
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
    return result.modifiedCount;
  });

  return result;
}
