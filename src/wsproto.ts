export type VwsMessageType = 'text' | 'image' | 'blob' | 'system' | 'json';

export interface VwsBaseMessage {
  id: string; // 唯一消息 ID
  // 补充文本 src 和 dst 字段都可以省略（用‘’），以消息ID为准（节省网络流量）
  src: string;
  dst: string;
  type: VwsMessageType; // 消息类型
  time: number; // 时间戳
}

export interface VwsTextMessage extends VwsBaseMessage {
  type: 'text';
  content: string; // 文本内容
  cid?: string; // 补充文本的消息 ID（可选）
  final?: boolean; // 补充消息是否完结（可选）
}

export interface VwsImageMessage extends VwsBaseMessage {
  type: 'image';
  url: string; // 图片 URL
}

export interface VwsBlobMessage extends VwsBaseMessage {
  type: 'blob';
  data: ArrayBuffer; // Blob 数据
}

export interface VwsSystemMessage extends VwsBaseMessage {
  type: 'system';
  note: string; // 通知内容
}

export interface VwsJsonMessage extends VwsBaseMessage {
  type: 'json';
  data: unknown; // 任何类型的数据
}

export type VwsMessage =
  | VwsTextMessage
  | VwsImageMessage
  | VwsBlobMessage
  | VwsSystemMessage
  | VwsJsonMessage;

export function isVwsTextMessage(
  message: VwsMessage,
): message is VwsTextMessage {
  return message.type === 'text';
}

export function isVwsImageMessage(
  message: VwsMessage,
): message is VwsImageMessage {
  return message.type === 'image';
}

export function isVwsBlobMessage(
  message: VwsMessage,
): message is VwsBlobMessage {
  return message.type === 'blob';
}

export function isVwsSystemMessage(
  message: VwsMessage,
): message is VwsSystemMessage {
  return message.type === 'system';
}
