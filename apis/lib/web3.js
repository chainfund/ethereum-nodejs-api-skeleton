const Web3 = require('web3')
const config = require('config')

const web3 = new Web3(
    new Web3.providers.HttpProvider(config.get('api.eth_node'))
)

if (typeof web3.currentProvider.sendAsync !== "function") {
    web3.currentProvider.sendAsync = function() {
        return web3.currentProvider.send.apply(
            web3.currentProvider,
            arguments
        )
    }
}

module.exports = web3