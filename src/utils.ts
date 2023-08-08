import axios, { AxiosResponse } from 'axios';
import { VEID } from '../index.js';

axios.defaults.timeout = 180000;

export const fetchApi = async (
  apiUrl: string,
  method = 'GET',
  params: any,
  body: any
) => {
  let defineHeaders = {};
  let type: any = { 'Content-Type': 'application/json' };
  if (
    (params && params.type && params.type !== 'json') ||
    (body && body.type && body.type !== 'json')
  ) {
    type = {};
  }
  if (params && params.headers) {
    defineHeaders = { ...defineHeaders, ...params.headers };
    delete params.headers;
  }
  if (body && body.headers) {
    defineHeaders = { ...defineHeaders, ...body.headers };
    delete body.headers;
  }
  if (params) delete params.type;
  if (body) delete body.type;
  const headers = {
    ...type,
    ...defineHeaders,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  };

  // If VEID is defined and not empty, add it to data
  let postData = body;
  if (VEID !== undefined && VEID !== '') {
    postData = {
      ...body,
      veid: VEID
    }
  }

  return axios(apiUrl, {
    method,
    headers,
    params,
    data: postData,
  }).then((res: AxiosResponse) => res.data);
};

export function toBuffer(arrayBuffer: ArrayBuffer) {
  const buffer = Buffer.alloc(arrayBuffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}

export function toArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}
