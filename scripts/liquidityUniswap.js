const { ethers, getNamedAccounts, network } = require("hardhat")
const { getWeth } = require("./getWeth.js")
const {
    Fetcher,
    ChainId,
    Route,
    Trade,
    TokenAmount,
    TradeType,
    Percent,
    WETH,
} = require("@uniswap/sdk")
const { networkConfig } = require("../helper-hardhat-config")

const chainId = ChainId.MAINNET

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()

    const usdcToken = await Fetcher.fetchTokenData(
        chainId,
        networkConfig[network.config.chainId].usdcToken
    )
    const uniToken = await Fetcher.fetchTokenData(
        chainId,
        networkConfig[network.config.chainId].uniToken
    )

    const pair = await Fetcher.fetchPairData(usdcToken, uniToken)

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20

    const route = new Route([pair], usdcToken)

    const amountIn = ethers.utils.parseEther("10")

    const trade = new Trade(
        route,
        new TokenAmount(usdcToken, amountIn.toString()),
        TradeType.EXACT_INPUT
    )

    // const slippageTolerance = new Percent("50", "10000")
    // const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw
    // const path = [
    //     networkConfig[network.config.chainId].daiToken,
    //     networkConfig[network.config.chainId].uniToken,
    // ]
    // const value = trade.inputAmount.raw[1].toString()

    const uniswapContract = await ethers.getContractAt(
        "IUniswapV2Router01",
        networkConfig[network.config.chainId].liquidityPoolAddressesRouter
    )

    const usdcContract = await ethers.getContractAt(
        "IERC20",
        networkConfig[network.config.chainId].usdcToken
    )

    await usdcContract.approve(deployer, 100)
    await usdcContract.increaseAllowance(deployer, 100)

    const usdcBalance = await usdcContract.balanceOf(deployer)
    console.log(usdcBalance.toString())

    await approveERC20(
        networkConfig[network.config.chainId].daiToken,
        uniswapContract.address,
        (daiBalance.toString() / 2).toString(),
        deployer
    )

    const swapTx = await uniswapContract.swapExactTokensForTokens(
        usdcBalance.toString() / 2,
        1,
        path,
        deployer,
        deadline
    )

    await swapTx.wait(1)

    // const addLiquidityTx = await uniswapContract.addLiquidity(
    //     networkConfig[network.config.chainId].daiToken,
    //     networkConfig[network.config.chainId].uniToken,
    //     "10",
    //     "1",
    //     "1",
    //     "1",
    //     uniswapContract.address,
    //     deadline
    // )

    // await addLiquidityTx.wait(1)

    // console.log(addLiquidityTx)
}

async function approveERC20(
    erc20Address,
    spenderAddress,
    amountToSpend,
    account
) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        account.address
    )

    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!")
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
