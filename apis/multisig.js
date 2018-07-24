/**
 * MultiSignature contract apis
 */

const truffle = require('truffle-contract')
const abi = require('ethereumjs-abi')
const crypto = require('crypto')
const BN = require('bn.js')
const util = require('ethereumjs-util')
const web3 = require('./lib/web3')
const { executeContractMethod } = require('./lib/transaction')
const { weiFromEther, weiToEther } = require('./lib/utils')

module.exports = async (app) => {
    const jsonAbi = require('../contracts/json/MultiSignature.json')
    const contract = truffle({ abi: jsonAbi })
    const contractAddress = '0x0ed2ec29c6bfb9d6893d249fe7dd2ae4e0617f4a'
    contract.setProvider(web3.currentProvider)

    const generateSignature = async ({ amount, toAddress, expireTime, key }) => {
        const contractInstance = await contract.at(contractAddress)
        const sequenceId = (await contractInstance.getNextSequenceId()).toNumber()
        const data = crypto.randomBytes(20).toString('hex')
        const operationHash = abi.soliditySHA3(
            ['string', 'address', 'uint', 'string', 'uint', 'uint'],
            ['ETHER', new BN(toAddress.replace('0x', ''), 16), weiFromEther(amount), data, expireTime, sequenceId]
        )
        const sig = util.ecsign(operationHash, Buffer.from(key.replace(/^0x/i, ''), 'hex'))
        const serializeSignature = ({ r, s, v }) =>
            '0x' + Buffer.concat([r, s, Buffer.from([v])]).toString('hex')

        return { signature: serializeSignature(sig), sequenceId, bytes: data }
    }

    app.post('/api/v1/multisig/withdraw', async (req, res) => {
        try {
            const expireTime = Math.floor(new Date().getTime() / 1000) + 86400
            const { toAddress, amount, firstKey, secondKey } = req.body
            const { signature, sequenceId, bytes } = await generateSignature({ amount, toAddress, expireTime, key: firstKey })
            const contractInstance = await contract.at(contractAddress)
            const txhash = await executeContractMethod(
                contractInstance,
                'sendMultiSig',
                [toAddress, weiFromEther(amount), web3.utils.fromAscii(bytes), expireTime, sequenceId, signature],
                secondKey
            )
            res.send({ txhash })
        } catch (err) {
            res.status(500).send({ message: err.toString() })
        }
    })

    app.post('/api/v1/multisig/withdraw-limit', async (req, res) => {
        try {
            const { amount, key } = req.body
            contractInstance = await contract.at(contractAddress)
            const txHash = await executeContractMethod(
                contractInstance,
                'setWithDrawLimit',
                [weiFromEther(amount)],
                key
            )

            res.send({ txHash })
        } catch (err) {
            res.status(500).send({ message: err.toString() })
        }
    })

    app.get('/api/v1/multisig/withdraw-limit', async (req, res) => {
        try {
            const contractInstance = await contract.at(contractAddress)
            const amount = await contractInstance.getWithDrawLimit()
            res.send({ amount: weiToEther(amount) })
        } catch (err) {
            res.status(500).send({ message: err.toString() })
        }
    })
}