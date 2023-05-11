import { parseStringPromise } from 'xml2js';

export interface HistMessage {
  username: string;
  nickname: string;
  headurl: string;
  timestamp: string;
  content: string;
}

export async function parseHistoryXml(xml: string): Promise<HistMessage[]> {
  try {
    const result = await parseStringPromise(xml);
    const dataItems =
      result.msg.recorditem[0].recordinfo[0].datalist[0].dataitem;

    const messages: HistMessage[] = dataItems.map((item: any) => {
      return {
        username: item.dataitemsource[0].hashusername[0],
        nickname: item.sourcename[0],
        headurl: item.sourceheadurl[0],
        timestamp: item.sourcetime[0],
        content: item.datadesc[0],
      };
    });

    return messages;
  } catch (error) {
    console.error('Error parsing XML:', error);
    throw error;
  }
}

// (async () => {
//   const messages = await parseXml(xml);
//   console.log(messages);
// })();
