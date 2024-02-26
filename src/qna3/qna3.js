const ethers = require('ethers');
const crypto = require('crypto');
const fs = require('fs');
const  { createTask, getTaskResult } = require('../../utils/yesCaptcha/yesCaptcha.js');
const csv = require('csv-parser');
const fakeUa = require('fake-useragent');
const readlineSync = require('readline-sync');
const config = require('../../config/runner.json');
const contractAddress = '0xb342e7d33b806544609370271a8d074313b7bc30';
const contractABI = require('./ABI/qna3.json');
const axios = require('axios');
const userAgent = fakeUa();
const { HttpsProxyAgent } = require('https-proxy-agent');
const { sleep, randomPause, sendRequest} = require('../../utils/utils.js');

const contractTemplate = new ethers.Contract(contractAddress, contractABI);

function getKeyFromUser() {
    let key;
    if (process.env.SCRIPT_PASSWORD) {
        key = process.env.SCRIPT_PASSWORD;
    } else {
        key = readlineSync.question('请输入你的密码: ', {
            hideEchoBack: true,
        });
    }
    return crypto.createHash('sha256').update(String(key)).digest('base64').substr(0, 32);
}

function decrypt(text, secretKey) {
    let parts = text.split(':');
    let iv = Buffer.from(parts.shift(), 'hex');
    let encryptedText = Buffer.from(parts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

function formHexData(string) {
    if (typeof string !== 'string') {
        throw new Error('Input must be a string.');
    }

    if (string.length > 64) {
        throw new Error('String length exceeds 64 characters.');
    }

    return '0'.repeat(64 - string.length) + string;
}

function toBeHex(number) {
    if (typeof number !== 'number') {
        throw new Error('Input must be a number.');
    }
    return number.toString(16);
}


const contract = new ethers.Contract(contractAddress, contractABI);
const provider = new ethers.providers.JsonRpcProvider(config.opbnb);
const agent = new HttpsProxyAgent(config.proxy);
const websiteKey = '6Lcq80spAAAAADGCu_fvSx3EG46UubsLeaXczBat';
const websiteUrl = 'https://qna3.ai/vote';
const headers = {
    'authority': 'api.qna3.ai',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
    'content-type': 'application/json',
    'origin': 'https://qna3.ai',
    'sec-ch-ua-platform': '"Windows"',
    'user-agent': userAgent,
    'x-lang': 'english',
};


async function recaptcha(pageAction) {
    const {taskId} = await createTask(websiteUrl, websiteKey, 'RecaptchaV3TaskProxyless', pageAction);
    let result = await getTaskResult(taskId);
    // 如果result为空，等待6秒后再次请求
    if (!result) {
        await sleep(0.1);
        result = await getTaskResult(taskId);
    }
    // 如果再次为空，抛出错误
    if (!result) {
        throw new Error(`${pageAction} 人机验证失败`);
    }
    const { gRecaptchaResponse } = result.solution
    return gRecaptchaResponse


}

async function login (wallet, invite_code=''){
    //const gRecaptchaResponse = await recaptcha('login');
    const url = 'https://api.qna3.ai/api/v2/auth/login?via=wallet';
    const msg = 'AI + DYOR = Ultimate Answer to Unlock Web3 Universe'
    const signature = await wallet.signMessage(msg);
    console.log(`当前地址${wallet.address}已签名 ${invite_code}`);

    const data = {
        'invite_code': invite_code,
        'wallet_address': wallet.address,
        'signature': signature,
        //'recaptcha': gRecaptchaResponse,
    };
    const urlConfig = {
        headers: headers,
        httpsAgent: agent,
        httpAgent: agent,
        method: 'post',
        data: data,
    };
    const response = await sendRequest(url, urlConfig);
    headers['Authorization'] = `bearer ${response.data.accessToken}`;
    return response.data
}

async function checkIn(wallet) {
    const contractInstance = contract.connect(wallet);

    const gasPrice = await wallet.provider.getGasPrice();

    const tx = await contractInstance.checkIn(1, {
      gasPrice: gasPrice,
    });

    const transactionInfo = await tx.wait(1);
    console.log(`签到tx: ${tx.hash}开始等待验证`);

    const url = 'https://api.qna3.ai/api/v2/my/check-in';
    const data = {
        "hash": tx.hash,
        "via": 'opbnb',
    };
    const urlConfig = {
        headers: headers,
        httpsAgent: agent,
        httpAgent: agent,
        method: 'post',
        data: data,
    };
    const response = await sendRequest(url, urlConfig);
    return response.data
}

async function getUserDetail() {
    const url = 'https://api.qna3.ai/api/v2/graphql';

    const data = {
        query:
        "query loadUserDetail($cursored: CursoredRequestInput!) {\n  userDetail {\n    checkInStatus {\n      checkInDays\n      todayCount\n    }\n    credit\n    creditHistories(cursored: $cursored) {\n      cursorInfo {\n        endCursor\n        hasNextPage\n      }\n      items {\n        claimed\n        extra\n        id\n        score\n        signDay\n        signInId\n        txHash\n        typ\n      }\n      total\n    }\n    invitation {\n      code\n      inviteeCount\n      leftCount\n    }\n    origin {\n      email\n      id\n      internalAddress\n      userWalletAddress\n    }\n    voteHistoryOfCurrentActivity {\n      created_at\n      query\n    }\n    ambassadorProgram {\n      bonus\n      claimed\n      family {\n        checkedInUsers\n        totalUsers\n      }\n    }\n  }\n}",
        variables: { cursored: { after: "", first: 20 } },
    };

    const urlConfig = {
        headers: headers,
        httpsAgent: agent,
        httpAgent: agent,
        method: 'post',
        data: data,
    };

    const response = await sendRequest(url, urlConfig);

    // console.log(response.data);
    if (response.data) {
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];

        const filePath = `log_${formattedDate}.txt`;
        const dataToAppend = [
            response.data.userDetail.origin.userWalletAddress,
            response.data.userDetail.invitation.code,
            response.data.userDetail.invitation.inviteeCount,
            response.data.userDetail.ambassadorProgram.claimed,
            response.data.userDetail.ambassadorProgram.bonus,
            response.data.userDetail.checkInStatus.checkInDays,
            response.data.userDetail.checkInStatus.todayCount
        ].join(' ')
        console.error(dataToAppend)
        // 将字符串追加写入文件并换行
        fs.appendFile(filePath, dataToAppend + '\n', (err) => {
            if (err) {
                console.error('追加写入文件时发生错误:', err);
            }
        });
    }
    return response.data
}

async function claim (wallet) {
    let url = 'https://api.qna3.ai/api/v2/my/claim-all';
    let claimData 
    
    try {
        const data = {
            headers: headers,
            httpsAgent: agent,
            httpAgent: agent,
            method: 'post',
            data: {},
        };
    const response = await sendRequest(url, data);
    claimData = response.data;
    } catch (error) {
        // console.log(error);
        return null;
    }

    const amountHex = formHexData(toBeHex(claimData.amount));
    const nonceHex = formHexData(toBeHex(claimData.signature.nonce));
    const signatureHex = claimData.signature.signature.slice(2);

    const transactionData = `0x624f82f5${amountHex}${nonceHex}00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000041${signatureHex}00000000000000000000000000000000000000000000000000000000000000`;
    
    const gasPrice = await wallet.provider.getGasPrice();
    const nonce = await wallet.getTransactionCount();
    const txToEstimate = {
        to: contractAddress,
        data: transactionData,
    };
    const gasLimit = await wallet.estimateGas(txToEstimate);
    const txData = {
        to: contractAddress,
        data: transactionData,
        gasPrice: gasPrice,
        gasLimit: gasLimit,
        nonce: nonce,
        value: 0,
    };
 
    const tx = await wallet.sendTransaction(txData);
    console.log('领取tx：', tx.hash);

    url = `https://api.qna3.ai/api/v2/my/claim/${claimData.history_id}`;
    const data = {
        "hash": tx.hash,   
    };
    const urlConfig = {
        headers: headers,
        httpsAgent: agent,
        httpAgent: agent,
        method: 'post',
        data: data,
    };
    const response = await sendRequest(url, urlConfig);
    const responseDate = response.data;
    return responseDate;
}

async function main() {
    // const secretKey = getKeyFromUser();
    const wallets = [];

    fs.createReadStream(config.walletPath)
        .pipe(csv())
        .on('data', (row) => {
            // const decryptedPrivateKey = decrypt(row.privateKey, secretKey);
            // wallets.push({ ...row, decryptedPrivateKey });
            wallets.push({ ...row });
        })
        .on('end', async () => {
            let index = 0;
            let codeKey = 0;

            for (const walletInfo of wallets) {
                index++;
                if (index%20 == 0) {
                    codeKey++;
                }

                const wallet = new ethers.Wallet(walletInfo.privateKey, provider);
                console.log(`开始为 ${wallet.address}签到`);
                //console.log(`请求google验证中......`)
                const invite_code = [
                    'yNDsyAZv',
                    'c5kF8tKh',
                    'Y6PSuwnx',
                    '8rxDncGq',
                    'me5VFDce',
                    'bSBhsvDt',
                    'K5j6K3P6',
                    'aPAXAhbt',
                    '2uK5Rm7W'
                ];
                
                console.log('邀请码为：' + invite_code[codeKey])

                const loginStatus = await login(wallet, invite_code[codeKey]);
                console.log(`登录成功，开始签到`);

                const userInfo = await getUserDetail();
                if (userInfo) {
                    console.log(`当前用户签到天数 ${userInfo.userDetail.checkInStatus.checkInDays}`);

                    if (userInfo.userDetail.checkInStatus.checkInDays >= 7) {
                        const claimRewards = await claim(wallet);
                        console.log("领取成功🏅")
                    } else {
                        const checkInStatus = await checkIn(wallet);
                        console.log("签到成功🏅")
                    }
                }
                
                // 暂停一段时间
                const pauseTime = randomPause();
                console.log(`任务完成，线程暂停${pauseTime}秒`);
                await sleep(pauseTime);
            }
        });

}

main();

