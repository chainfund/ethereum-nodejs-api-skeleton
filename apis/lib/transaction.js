const solc = require('solc')
const request = require('request-promise')
const tx = require('ethereumjs-tx')
const util = require('ethereumjs-util')
const _ = require('lodash')
const fs = require('fs')
const fsx = require('fs-extra')
const web3 = require('./web3')
const config = require('config')

let defaultGasPrice = 21

const getGasPrice = () => {
    console.log(`Gas price: ${defaultGasPrice}`)
    return defaultGasPrice
}

const executeSingedTransaction = (rawTx, key) => {
    const privateKey = new Buffer(key.replace(/^0x/i, ''), 'hex')
    const transaction = new tx(rawTx)
    transaction.sign(privateKey)
    const serializedTx = '0x' + transaction.serialize().toString('hex')
    web3.eth.sendSignedTransaction(serializedTx)
        .on('transactionHash', (txhash) => {
            console.log(`Txhash: ${txhash}`)
        })
        .on('confirmation', (confirmationNumber) => {
            console.log(`ConfirmationNumber: ${confirmationNumber}`)
        })
        .on('receipt', (receipt) => {
            console.log(`Receipt: ${JSON.stringify(receipt)}`)
        })
        .on('error', (err) => {
            console.log(`Error: ${err}`)
        })

    const txhash = util.bufferToHex(transaction.hash(true))
    // console.log(`Txhash: ${txhash}`)

    return txhash
}

async function deployContract(nameId, arguments, key) {
    const sources = {}
    const contractDir = './contracts/solidity'
    fs.readdirSync(contractDir).forEach(file => {
        sources[`${contractDir}/${file}`] = fs.readFileSync(`${contractDir}/${file}`, 'utf8')
    })
    const output = solc.compile({ sources }, 1)
    const bytecode = output.contracts[`${contractDir}/${nameId}.sol:${nameId}`].bytecode
    const abi = JSON.parse(output.contracts[`${contractDir}/${nameId}.sol:${nameId}`].interface)
    await fsx.writeJson(`${contractDir}/../json/${nameId}.json`, abi)
    const contract = new web3.eth.Contract(abi)
    const data = contract.deploy({ data: '0x' + bytecode, arguments }).encodeABI()
    const from = web3.eth.accounts.privateKeyToAccount(`0x${key.replace(/^0x/i, '')}`).address
    const nonce = await web3.eth.getTransactionCount(from)
    const estimateGas = await web3.eth.estimateGas({ from, data })
    const rawTx = {
        nonce,
        gasLimit: web3.utils.toHex(estimateGas) * 1.5,
        gasPrice: web3.utils.toHex(getGasPrice()),
        data,
        from
    }

    return executeSingedTransaction(rawTx, key)
}

async function executeContractMethod(contractInstance, method, params, key) {
    const from = web3.eth.accounts.privateKeyToAccount(`0x${key.replace(/^0x/i, '')}`).address
    const nonce = await web3.eth.getTransactionCount(from)
    const data = web3.eth.abi.encodeFunctionCall(
        _.find(contractInstance.abi, (o) => o.type === 'function' && o.name === method),
        params
    )
    const estimateGas = await web3.eth.estimateGas({ from, to: contractInstance.address, data })
    const rawTx = {
        nonce: web3.utils.toHex(nonce),
        gasLimit: web3.utils.toHex(estimateGas) * 1.5,
        gasPrice: web3.utils.toHex(getGasPrice()),
        to: contractInstance.address,
        data
    }

    return executeSingedTransaction(rawTx, key)
}

async function transferEth(from, to, amount, key) {
    const nonce = await web3.eth.getTransactionCount(from)
    const value = web3.utils.toHex(web3.utils.toWei(`${amount}`, 'ether'))
    const estimateGas = await web3.eth.estimateGas({ to, value })
    const rawTx = {
        nonce: web3.utils.toHex(nonce),
        gasLimit: web3.utils.toHex(estimateGas) * 1.5,
        gasPrice: web3.utils.toHex(getGasPrice()),
        to,
        value
    }

    return executeSingedTransaction(rawTx, key)
}

// Update default gas price by interval
const updateGasPrice = async () => {
    try {
        defaultGasPrice = await web3.eth.getGasPrice()
        console.log(`Updated default gas price to ${web3.utils.fromWei(defaultGasPrice.toString(), 'gwei').valueOf()} gwei.`)
    } catch (err) {
        console.log(`Warning! Could not update gas price. ERROR: ${err}`)
    }
}
setInterval(updateGasPrice, 60000)
updateGasPrice()

module.exports = {
    executeContractMethod,
    transferEth,
    deployContract
}