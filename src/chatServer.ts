import { fetchApi } from './utils';

export const chatWithVCorp = async (
  agentid: string,
  userid: string,
  message: string,
  roomid?: string,
  adminOnly?: boolean
) => {
  const headers: Record<string, any> = {
    Authorization: `Bearer ${process.env.VCORP_AI_KEY}`,
  };
  const data = {
    version: 4,
    veid: 'B0001',
    vename: 'AI 助手',
    nostream: true,
    agentid,
    userid,
    roomid,
    app: 'weixin',
    adminOnly,
    messages: [{ role: 'user', content: message }],
  };
  const answer = await fetchApi(
    process.env.VCORP_AI_URL + '/chat',
    'POST',
    { headers, timeout: 180000 },
    data
  );
  console.log('answer from vcorp: ', answer);
  const output = answer.choices[0].message.content;
  return output;
};

export const wxTransWithVCorp = async (
  agentid: string,
  userid: string,
  rawstr: string,
  roomid?: string
) => {
  const headers: Record<string, any> = {
    Authorization: `Bearer ${process.env.VCORP_AI_KEY}`,
  };
  const data = {
    version: 5,
    nostream: true,
    agentid,
    userid,
    roomid,
    app: 'weixin',
    rawstr,
  };
  const answer = await fetchApi(
    process.env.VCORP_AI_URL + '/wxtrans',
    'POST',
    { headers, timeout: 180000 },
    data
  );
  console.log('answer from vcorp: ', answer);
  return answer;
};
