import * as mongodb from "mongodb";
const dotnev = require("dotenv");
dotnev.config();

const databaseName = "vcorp";

export class MongoClientPool {
  private readonly uri: string;
  private readonly maxPoolSize: number;
  private readonly poolOptions: mongodb.MongoClientOptions;
  private readonly clientPromise: Promise<mongodb.MongoClient>;

  constructor(
    uri: string,
    maxPoolSize = 10,
    poolOptions: mongodb.MongoClientOptions = {}
  ) {
    this.uri = uri;
    this.maxPoolSize = maxPoolSize;
    this.poolOptions = {
      //useUnifiedTopology: true,
      maxPoolSize: this.maxPoolSize,
      ...poolOptions
    };
    this.clientPromise = new mongodb.MongoClient(
      this.uri,
      this.poolOptions
    ).connect();
  }

  async getClient(): Promise<mongodb.MongoClient> {
    return this.clientPromise;
  }

  async getDb(dbName: string): Promise<mongodb.Db> {
    const client = await this.clientPromise;
    return client.db(dbName);
  }

  async close(): Promise<void> {
    const client = await this.clientPromise;
    return client.close();
  }

  async createIndex(
    dbName: string,
    collectionName: string,
    index: mongodb.IndexSpecification,
    options?: mongodb.CreateIndexesOptions
  ): Promise<string> {
    const client = await this.clientPromise;
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    return collection.createIndex(index, options);
  }
}

export async function withDb<T>(
  callback: (db: mongodb.Db) => Promise<T>
): Promise<T> {
  // 创建连接池实例
  //console.log("process.env.MONGODB_URI: " + process.env.MONGODB_URI);
  const mongoClientPool = new MongoClientPool(process.env.MONGODB_URI || "");

  // 获取 MongoDB 客户端实例和数据库对象
  const client = await mongoClientPool.getClient();
  const db = await mongoClientPool.getDb(databaseName);

  try {
    return await callback(db);
  } finally {
    await mongoClientPool.close();
  }
}

async function createSampleIndex() {
  await withDb(async (db) => {
    const collection = db.collection('users');
      // 为 accountId 字段创建允许空值的唯一索引
  await collection.createIndex({ accountId: 1 }, { unique: true, partialFilterExpression: { accountId: { $exists: true } } });

  // 为 weixinId 字段创建允许空值的唯一索引
  await collection.createIndex({ weixinId: 1 }, { unique: true, partialFilterExpression: { weixinId: { $exists: true } } });

  });    
}
  
  createSampleIndex();