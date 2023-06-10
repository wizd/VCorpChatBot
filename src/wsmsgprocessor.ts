import axios from 'axios';

export async function downloadWithRetry(url: string, retries = 3) {
    for (let i = 1; i <= retries; i++) {
        try {
            const data = await downloadImage(url);
            return data;
        } catch (error) {
            if (i === retries) {
                throw new Error(`Failed to download after ${retries} attempts.`);
            }
            console.log(`Download attempt ${i} failed, retrying...`);
        }
    }
}

const customAxiosInstance = axios.create({
    timeout: 90000,
});

async function downloadImage(url: string): Promise<Buffer> {
    try {
        // for speed, replace default url to customized url
        const fastUrl = url;//.replace("https://mars.vcorp.ai", process.env.VCORP_AI_URL!.replace("/vc/v1", ""));

        console.log('downloading image: ', fastUrl);

        const response = await customAxiosInstance.get(fastUrl, {
            responseType: 'arraybuffer',
        });

        const buffer = Buffer.from(response.data, 'binary');
        return buffer;
    } catch (error) {
        console.error('Error downloading the image:', error);
        throw error;
    }
}