require("@nomicfoundation/hardhat-toolbox")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-gas-reporter")
require("hardhat-deploy")
require("solidity-coverage")

require("dotenv").config()

const GOERLI_URL_RPC = process.env.URL_RPC_GOERLI
const MAINNET_RPC_URL = process.env.URL_RPC_MAINNET

const LOCALHOST_URL_RPC = process.env.URL_RPC_LOCALHOST
const PRIVATE_KEY = process.env.PRIVATE_KEY_GOERLI

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.9",
            },
            {
                version: "0.6.12",
            },
            {
                version: "0.6.6",
            },
            {
                version: "0.4.19",
            },
        ],
    },
    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
            forking: {
                url: MAINNET_RPC_URL,
            },
        },
        localhost: {
            chainId: 31337,
        },
        goerli: {
            url: GOERLI_URL_RPC,
            accounts: [PRIVATE_KEY],
            chainId: 5,
            blockConfirmations: 6,
        },
    },
    etherscan: {
        apiKey: {
            goerli: ETHERSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: true,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        token: "ETH",
    },
    mocha: {
        timeout: 700000,
    },
}
