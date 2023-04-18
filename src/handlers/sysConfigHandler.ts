import { ContactInterface, MessageInterface } from 'wechaty/impls';
import { UserProfile } from '../db/models/users';
import {
  VCorpConfig,
  getVCorpConfigByName,
  saveVCorpConfig,
  vCorpConfig,
} from '../db/models/sysconfig';
import { ObjectId } from 'mongodb';

async function getConfigValues(): Promise<string> {
  const configNames: vCorpConfig[] = [
    'yearTextSubFee',
    'monthTextSubFee',
    'dayTextSubFee',
  ];

  // 使用 Promise.all 依次获取每个配置名称的值
  const configValues: (VCorpConfig | null)[] = await Promise.all(
    configNames.map((configName) => getVCorpConfigByName(configName))
  );

  // 将结果组合成一个字符串
  const resultString = configValues
    .map((config, index) => {
      const configName = configNames[index];
      const configValue = config?.configValue || '尚未配置';
      return `${configName}: ${configValue}`;
    })
    .join('\n');

  return resultString;
}

async function handleUserInput(
  input: string,
  changedById: ObjectId
): Promise<string> {
  // 从用户输入中解析 configName 和 configValue
  const [command, configName, configValue] = input.trim().split(/\s+/);

  // 检查 configName 是否有效
  if (
    !['yearTextSubFee', 'monthTextSubFee', 'dayTextSubFee'].includes(configName)
  ) {
    return '无效的 configName。请使用 yearTextSubFee、monthTextSubFee 或 dayTextSubFee。';
  }

  // 创建 VCorpConfig 对象
  const vcc: VCorpConfig = {
    changedById,
    time: new Date(),
    configName: configName as vCorpConfig,
    configValue,
  };

  // 保存或更新数据库记录
  const result = await saveVCorpConfig(vcc);

  if (result) {
    return `成功设置 ${configName} 为 ${configValue}`;
  } else {
    return '保存配置失败，请稍后重试。';
  }
}

export async function handleSysConfig(
  vcuser: UserProfile,
  contact: ContactInterface,
  message: MessageInterface,
  input: string
) {
  try {
    const text = input;
    if (text.indexOf(' ') == -1) {
      getConfigValues().then(async (result) => {
        console.log(result);
        await message.say(
          '以下是当前配置\n\n' +
            result +
            '\n\n配置或更新示例：\n\n配置系统参数 yearTextSubFee 1000'
        );
      });
    } else {
      await handleUserInput(text, vcuser._id!).then(async (result) => {
        await message.say('已更新');
      });
    }
  } catch (e) {
    console.log('Error in handleSysConfig: ', e);
    await message.say('发生错误，请联系管理员：' + JSON.stringify(e));
  }
}
