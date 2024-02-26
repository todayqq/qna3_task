from eth_account import Account
from web3 import Web3
import csv
import time

def load_wallets_from_csv(file_path):
    wallets = []
    with open(file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            wallets.append(row)
    return wallets

def send_eth_transaction(sender_private_key, recipient_address, amount_ether, gas_price):
    w3 = Web3(Web3.HTTPProvider('https://opBNB-mainnet-rpc.bnbchain.org'))  # 请替换YOUR_INFURA_API_KEY

    amount_wei = w3.to_wei(amount_ether, 'ether')

    sender_account = Account.from_key(sender_private_key)
    nonce = w3.eth.get_transaction_count(sender_account.address, 'pending')

    transaction = {
        'to': recipient_address,
        'value': amount_wei,
        'gas': 21000,  # 假设固定的gas值
        'gasPrice': w3.to_wei(gas_price, 'gwei'),
        'nonce': nonce,
    }

    signed_transaction = w3.eth.account.sign_transaction(transaction, sender_private_key)

    tx_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
    return tx_hash

if __name__ == "__main__":
    # 从 CSV 文件加载钱包信息
    wallets = load_wallets_from_csv('wallets.csv')

    # 你的发送地址的私钥
    sender_private_key = '1f44508c6340bd3665d4bb515548b7a369a05e114c52c90034220832f7c5fb32'

    # 转账参数
    recipient_address = ''
    amount_ether = 0.0001
    gas_price = 3  # 你可以根据需要调整gas价格

    for wallet in wallets:
        recipient_address = wallet['address']
        tx_hash = send_eth_transaction(sender_private_key, recipient_address, amount_ether, gas_price)
        time.sleep(2.5)
        print(f'Transaction sent to {recipient_address}, Transaction Hash: {tx_hash.hex()}')
