const networkConfig = {
    31337: {
        name: "localhost",
        lendingPoolAddressesProvider:
            "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        liquidityPoolAddressesRouter:
            "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a",
        swapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        daiEthPriceFeed: "0x773616E4d11A78F511299002da57A0a94577F1f4",
        wethToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        daiToken: "0x6b175474e89094c44da98b954eedeac495271d0f",
        usdcToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        uniToken: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    },
    5: {
        name: "goerli",
        ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
        wethToken: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
        lendingPoolAddressesProvider:
            "0x5E52dEc931FFb32f609681B8438A51c675cc232d",
        daiEthPriceFeed: "0xb4c4a493AB6356497713A78FFA6c60FB53517c63",
        daiToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}
