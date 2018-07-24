# Ethereum Smart Contract NodeJS API
======================================================

NodeJS REST APIs to interact with Ethereum platform

## Features
- **General APIs**: For normal transactions on ethereum network. General apis are implemented at: `apis/ethereum.js`
- **Multisignature APIs**: Dedicated for `Multisignature` contract at `contracts/solidity/Multisignature.sol`. Multisignature apis are implemented at: `apis/multisig.js`

### General APIs
- Deploy smart contract using signed transaction
- Transfer ETH into an account address
- Check account balance
- Get transaction receipt by hash

### Multisignature APIs
- Execute contract method: set withdraw limit (using signed transaction).
- Invoke read-only contract method: Get contract withdraw limit.
- Multisignature withdraw ETH from contract (this is implemented REST API for https://github.com/BitGo/eth-multisig-v2).

## Install, start testrpc & api server

```
git clone git@github.com:chainfund/ethereum-nodejs-api.git
yarn install
testrpc
node index.js
```
- Server config is at `config/default.json`

## Examples

### General API: Deploy smart contract using signed transaction 
- `POST http://localhost:3000/api/v1/eth/deploy-contract`
- Payload:
```js
{ 
    "nameId": "MultiSignature",
    "params": [[${owner_1_address}, ${owner_2_address}, ${owner_3_address}]], 
    "key": ${privateKey} 
}
```
- The contract code is at `contracts/solidity/MultiSignature.sol`
- `nameId`: Corresponding to contract file name
- `params`: Corresponding to contract constructor: `function MultiSignature(address[] owners) public`
- Once deployment is success, the new json abi is generated at `contracts/json` and the contract address printed on console.
- Copy the contract address from console and update `contractAddress` at `apis/multisig.js: Line 13`. Finally, restart the nodejs server.

### General API: Transfer ETH into an account address 
- `POST http://localhost:3000/api/v1/eth/transfer`.
- Payload:
```js
{
    "from": ${sender},
    "to": ${receiver_address},
    "key": ${sender_private_key},
    "amount": 10 // ETH value
}
```

### General API: Check account balance
```js
GET http://localhost:3000/api/v1/eth/balances?address=${account_address}
```

### General API: Get transaction receipt by hash
```js
GET http://localhost:3000/api/v1/eth/receipt?txhash=${transaction_hash}
```

### Multisignature API: Set contract withdraw limit to 4 ETH 
- `POST http://localhost:3000/api/v1/multisig/withdraw-limit`.
- Payload:
```js
{
    "key": ${owner_1_private_key},
    "amount": 4 // ETH value
}
```

### Multisignature API: Get contract withdraw limit
- `GET http://localhost:3000/api/v1/multisig/withdraw-limit`.

### Multisignature API: Withdraw 3 ETH from contract (this is multisig transfer):
- **Notes**: 
    - Contract balance must not be 0. Need deposit some ETH before calling this api to withdraw.
    - The widraw amount must not exeed `withdraw limit`
- `POST http://localhost:3000/api/v1/multisig/withdraw`.
- Payload:
```js
{
    "toAddress": ${receiver_address},
    "amount": 3,
    "firstKey": ${owner_2_private_key},
    "secondKey": ${owner_1_private_key}
}
```

## Next Release Features
- Listener for smart contract events
- Auto generate nodejs APIs from contract json abi