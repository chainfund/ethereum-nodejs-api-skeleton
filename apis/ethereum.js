/**
 * Common apis on ethereum network
 */

const { transferEth, deployContract } = require('./lib/transaction')
const web3 = require('./lib/web3')

module.exports = function (app) {
    app.post('/api/v1/eth/transfer', async (req, res) => {
        try {
            const { from, to, key, amount } = req.body
            const txhash = await transferEth(from, to, amount, key)
            res.send({ txhash })
        } catch (err) {
            res.status(500).send({ message: err.toString() })
        }
    })

    app.get('/api/v1/eth/balances', async (req, res) => {
        try {
            const { address } = req.query
            const balance = await web3.eth.getBalance(address)
            res.send({ address, balances: parseFloat(web3.utils.fromWei(balance, 'ether')) })
        } catch (err) {
            res.status(500).send({ message: err.toString() })
        }
    })

    app.get('/api/v1/eth/receipt', async (req, res) => {
        try {
            const { txhash } = req.query
            const receipt = await web3.eth.getTransactionReceipt(txhash)
            res.send(receipt)
        } catch (err) {
            res.status(500).send({ message: err.toString() })
        }
    })

    app.post('/api/v1/eth/deploy-contract', async (req, res) => {
        try {
            const { nameId, params, key } = req.body
            const txhash = await deployContract(nameId, params, key)

            res.send({ txhash })
        } catch (err) {
            res.status(500).send({ message: err.toString() })
        }
    })
}