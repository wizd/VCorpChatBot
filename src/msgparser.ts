interface TransferInfo {
    amount: number;
    memo: string;
  }
  
 export function parseWechatTransfer(message: string): TransferInfo {
    const amountRegex = /收到转账([\d.]+)元/;
    const memoRegex = /<pay_memo><!\[CDATA\[(.*?)\]\]><\/pay_memo>/;
  
    const amountMatch = message.match(amountRegex);
    const memoMatch = message.match(memoRegex);
  
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    const memo = memoMatch ? memoMatch[1] : "";
  
    return {
      amount,
      memo,
    };
  }
  
  
  export function calculateMembershipExpiration(
    transferAmount: number,
    monthlyPrice = 29,
    yearlyPrice = 299
  ): Date {
    const currentDate = new Date();
    let expirationDate: Date;
  
    if (transferAmount >= yearlyPrice) {
      expirationDate = new Date(currentDate);
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    } else {
      const numberOfMonths = Math.floor(transferAmount / monthlyPrice);
      expirationDate = new Date(currentDate);
      expirationDate.setMonth(expirationDate.getMonth() + numberOfMonths);
    }
  
    return expirationDate;
  }
  
  export function timeRemainingReadable(expirationDate: Date): string {
    const currentDate = new Date();
    const remainingMilliseconds = expirationDate.getTime() - currentDate.getTime();
    const remainingSeconds = Math.floor(remainingMilliseconds / 1000);
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingDays = Math.floor(remainingHours / 24);
  
    const days = remainingDays > 0 ? `${remainingDays} 天` : "";
    const hours = remainingHours % 24 > 0 ? `${remainingHours % 24} 小时` : "";
    const minutes = remainingMinutes % 60 > 0 ? `${remainingMinutes % 60} 分钟` : "";
  
    return `${days}${hours}${minutes}`;
  }
  