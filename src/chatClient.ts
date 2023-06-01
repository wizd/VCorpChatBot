import { io, Socket } from 'socket.io-client';
import { VwsMessage } from './wsproto';

// 定义异步回调类型
export type MessageCallback = (message: VwsMessage) => void | Promise<void>;

// 聊天客户端类
class ChatClient {
  private jwt: string;
  private socket: Socket;
  private messageSubscribers: Set<MessageCallback> = new Set();
  private autoReconnectInterval = 5000; // 设置自动重连时间间隔，单位：毫秒

  onNewMessage(callback: MessageCallback): void {
    this.messageSubscribers.add(callback);
  }

  offNewMessage(callback: MessageCallback): void {
    this.messageSubscribers.delete(callback);
  }

  updateJwt(jwt: string) {
    this.jwt = jwt;
  }

  constructor(serverUrl: string, token: string) {
    this.jwt = token;
    this.socket = io(serverUrl, { query: { jwt: this.jwt } });

    // 客户端监听服务器发来的聊天消息
    this.socket.on('smsg', async (message: VwsMessage) => {
      console.log('Received chat message from server:', message);
      // 调用回调函数（如果已提供）
      try{
        for (const subscriber of this.messageSubscribers) {
          subscriber(message);
        }
      }
      catch(err) {
        console.log("error process message from server:", err);
      }
    });

    // 监听断线事件
    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server. Attempting to reconnect...');
      setTimeout(() => {
        this.socket.connect();
      }, this.autoReconnectInterval);
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat server: ', serverUrl);
    });
  }

  // 向服务器发送聊天消息
  public sendChatMessage(message: VwsMessage): void {
    this.socket.emit('cmsg', message);
  }

  // 断开与服务器的连接
  public disconnect(): void {
    this.socket.disconnect();
  }
}

export default ChatClient;
