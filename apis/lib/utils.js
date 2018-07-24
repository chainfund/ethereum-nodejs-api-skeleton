const Web3 = require('web3-stable')

const web3 = new Web3()

module.exports = {
   weiToEther: (num) => web3.fromWei(num, 'ether').toNumber(),
   weiFromEther: (num) => web3.toWei(num, 'ether')
}