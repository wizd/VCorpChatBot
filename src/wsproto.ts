export type VwsMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "speech" // while recording, send chunks to server
  | "blob"
  | "system"
  | "json";

export interface VwsBaseMessage {
  seq?: number;  // offset of the message, when new connection, seq=0. filled by conn manager, so it is nullable
  id: string; // 唯一消息 ID
  // 补充文本 src 和 dst 字段都可以省略（用‘’），以消息ID为准（节省网络流量）
  src: string;
  dst: string;
  type: VwsMessageType; // 消息类型
  time: number; // 时间戳
}

export interface VwsTextMessage extends VwsBaseMessage {
  type: "text";
  content: string; // 文本内容
  cid?: string; // 补充文本的消息 ID（可选）
  final?: boolean; // 补充消息是否完结（可选）
}

export interface VwsSpeechMessage extends VwsBaseMessage {
  type: "speech";
  data: Uint8Array; //
  cid?: string; // 补充文本的消息 ID（可选）
  final?: boolean; // 补充消息是否完结（可选）
}

export interface VwsImageMessage extends VwsBaseMessage {
  type: "image";
  url: string; // 图片 URL
}

export interface VwsVideoMessage extends VwsBaseMessage {
  type: "video";
  url: string; // 视频 URL
}

export interface VwsAudioMessage extends VwsBaseMessage {
  type: "audio";
  fmt?: string;  // silk, mp3, wav, etc.
  duration?: number; // 韶声时长（播收时长）
  data: ArrayBuffer; // .wav binary
}

export interface VwsBlobMessage extends VwsBaseMessage {
  type: "blob";
  fn: string; // 文件名
  data: ArrayBuffer; // Blob 数据
}

export interface VwsSystemMessage extends VwsBaseMessage {
  type: "system";
  cmd: string; // 命令
  note: string; // 通知内容
}

export interface VwsJsonMessage extends VwsBaseMessage {
  type: "json";
  data: unknown; // 任何类型的数据
}

export type VwsMessage =
  | VwsTextMessage
  | VwsImageMessage
  | VwsVideoMessage
  | VwsAudioMessage
  | VwsSpeechMessage
  | VwsBlobMessage
  | VwsSystemMessage
  | VwsJsonMessage;

export function isVwsTextMessage(
  message: VwsMessage
): message is VwsTextMessage {
  return message.type === "text";
}

export function isVwsImageMessage(
  message: VwsMessage
): message is VwsImageMessage {
  return message.type === "image";
}

export function isVwsVideoMessage(
  message: VwsMessage
): message is VwsVideoMessage {
  return message.type === "video";
}

export function isVwsAudioMessage(
  message: VwsMessage
): message is VwsAudioMessage {
  return message.type === "audio";
}

export function isVwsSpeechMessage(
  message: VwsMessage
): message is VwsSpeechMessage {
  return message.type === "speech";
}

export function isVwsBlobMessage(
  message: VwsMessage
): message is VwsBlobMessage {
  return message.type === "blob";
}

export function isVwsSystemMessage(
  message: VwsMessage
): message is VwsSystemMessage {
  return message.type === "system";
}
