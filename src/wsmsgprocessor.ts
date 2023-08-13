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
            await new Promise(resolve => setTimeout(resolve, 1000 * i));  // Add delay
        }
    }
}

async function downloadImage(url: string): Promise<Buffer> {
    try {
        const fastUrl = url;
        console.log('downloading image: ', fastUrl);

        const parsedUrl = new URL(fastUrl);
        const referer = `${parsedUrl.protocol}//${parsedUrl.host}`;

        const customAxiosInstance = axios.create({
            timeout: 90000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                'Referer': referer
            }
        });
        
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