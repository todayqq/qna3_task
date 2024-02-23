
## 使用教程

#### 1、安装基础环境

需要安装 python3、nodejs，这个不再赘述，自行百度。

#### 2、安装依赖

```shell
npm install
pip3 install eth_account
pip3 install web3
```

#### 3、批量生成钱包

```shell
python3 create_wallet.py
```

会自动生成200个钱包、想修改钱包数量，在create_wallet.py第11行可以修改
生成的钱包会自动写入到 wallets.csv中

#### 4、批量转账

```shell
python3 transfer.py
```

在 transcation.py 代码中第40行和第43行配置主钱包地址和私钥

```shell
# 你的发送地址的私钥
sender_private_key = 'xxx'

# 转账参数
recipient_address = 'xxx'
```

默认转账为0.001BNB

#### 5、在配置config/runner.json 配置 invite_code

```shell
{
    ...
    "invite_code": "DbMszBVb",
    ...
```
如果没有invite_code，可以先跑一次签到，然后在log文件中找到invite_code
或者使用我的 invite_code

```shell
DbMszBVb
ryWzzYHK
cRkvgWVD
evnFmsa2
RbFFGXEf
ByyRJbhA
AQQD8Tpb
```
#### 6、运行

`node taskRunner.js`

执行成功示例：

开始为 0x250Ac3917882F9D02158E556c82aXXX 签到
当前地址 0x250Ac3917882F9D02158E556c82aXXX签到 已签名
登录成功，开始签到

签到tx: 0x937da1831b3acaf7a82e2867da61522c1261b76ecae85b1eb141923a7043dd66开始等待验证

签到成功🏅

任务完成，线程暂停22秒

#### 常见问题

- 怎么去寻找自己账号的invite_code？

项目运行后会有一个log文件 log_2024-**-**.txt 文件，其中记录了钱包地址、invite_code、签到天数 wallet address invite_code 签到天数

推荐一次生成20个钱包，批量转账之后，执行签到命令，跑完之后，项目运行后会有一个log文件
log_2024-**-**.txt 文件，其中记录了钱包地址、invite_code、签到天数
再依次修改配置文件里的 invite_code，每20个钱包跑一次

第二天再次签到的时候，就无需再次使用invite_code，把全部的钱包写到一个文件中，挨个执行即可

#### 代码参考

- https://github.com/0xsongsu/dailytask