import axios, { AxiosProgressEvent } from 'axios';

export async function uploadFile(
  fileName: string,
  mime: string,
  fileData: Buffer,
  agentid: string,
  userid: string,
  onProgress?: (progress: number) => void,
  onSuccess?: (filename: string) => void,
): Promise<void> {
  const data = new FormData();

  const fileBlob = new Blob([fileData], { type: mime });
  data.append('file', fileBlob, fileName);

  data.append('agentid', agentid);
  data.append('userid', userid);

  const config = {
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total!,
      );
      onProgress?.(percentCompleted);
    },
    timeout: 180000, // 180秒超时
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${process.env.VCORP_AI_KEY}`,
    },
  };

  try {
    const url = process.env.VCORP_AI_URL + '/image/upload';
    await axios.post(url, data, config);
    console.log('File uploaded successfully');
    onSuccess?.(fileName);
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}