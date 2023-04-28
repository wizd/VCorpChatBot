import { fetchApi } from './utils';

const chatWithVCorp = async (
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
  return answer;
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

export async function sendMessage(
  agentid: string,
  message: string,
  talkerid: string,
  roomWeixinId?: string,
  adminOnly?: boolean // tell humine only reply if admin.
) {
  try {
    console.log('-----------newMessages----------');
    console.log(message);
    console.log('-----------newMessages----------');
    const completion = await chatWithVCorp(
      agentid,
      talkerid,
      message,
      roomWeixinId,
      adminOnly
    );
    const answer = completion.choices[0].message.content;

    console.log('-----------newAnswers----------');
    console.log(answer);
    console.log('-----------newAnswers----------');
    return answer;
  } catch (err) {
    console.log((err as Error).message);
    let errorBody = (err as Error & { response: any })?.response?.data;
    console.log(errorBody);
    let append = '[errored]';
    try {
      if (errorBody.error.code === 'context_length_exceeded') {
        append = '[errored][context_length_exceeded]';
      }
      errorBody = JSON.stringify(errorBody);
    } catch (_) {
      /* empty */
    }
    return (err as Error).message + '   ' + errorBody + '[errored]';
  }
}
