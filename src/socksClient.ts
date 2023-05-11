import { Socket, io } from 'socket.io-client';

export const connectHumine = (): Socket => {
  const socket = io(process.env.VCORP_AI_URL!); // 更改为您的服务器地址

  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('requestWeixinAvatar', async (wxid: string) => {
    const avatar = await getWeixinAvatarForId(wxid);
    socket.emit('weixinAvatar', avatar);
  });

  async function getWeixinAvatarForId(wxid: string): Promise<string> {
    // 在这里调用您的实际函数，获取微信头像 URL
    // const avatar = await yourFunctionToGetWeixinAvatar(wxid);
    console.log('在这里调用您的实际函数，获取微信头像 URL');
    const avatar = 'https://example.com/avatar.jpg'; // 示例数据
    return avatar;
  }

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  return socket;
};
