const { ethers, getNamedAccounts, network } = require("hardhat")
const { getWeth, AMOUNT } = require("./getWeth.js")
const { networkConfig } = require("../helper-hardhat-config")
const { getPoolImmutables } = require("../helpers/helpers")

require("dotenv").config()

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const liquidityPool = await getPool(
        deployer,
        networkConfig[network.config.chainId].usdcToken,
        networkConfig[network.config.chainId].wethToken
    )

    const usdcContract = await ethers.getContractAt(
        "IERC20",
        networkConfig[network.config.chainId].usdcToken
    )

    const wethContract = await ethers.getContractAt(
        "IERC20",
        networkConfig[network.config.chainId].wethToken
    )

    let wethBalance = await wethContract.balanceOf(deployer)
    let usdcBalance = await usdcContract.balanceOf(deployer)

    console.log(usdcBalance)
    console.log(wethBalance)

    await swapETH(AMOUNT, deployer, liquidityPool)

    wethBalance = await wethContract.balanceOf(deployer)
    usdcBalance = await usdcContract.balanceOf(deployer)

    console.log(usdcBalance.toString() / 1000000)
    console.log(wethBalance)
}

async function swapETH(inputAmount, deployer, poolAddress) {
    const poolContract = await ethers.getContractAt(
        "IUniswapV3Pool",
        poolAddress,
        deployer.address
    )

    const immutables = await getPoolImmutables(poolContract)

    const swapRouterContract = await ethers.getContractAt(
        "ISwapRouter",
        networkConfig[network.config.chainId].swapRouterAddress,
        deployer.address
    )

    const approvalAmount = (inputAmount / 2).toString()

    const params = {
        tokenIn: immutables.token1,
        tokenOut: immutables.token0,
        fee: immutables.fee,
        recipient: deployer,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
        amountIn: approvalAmount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
    }

    await approveERC20(
        networkConfig[network.config.chainId].wethToken,
        networkConfig[network.config.chainId].swapRouterAddress,
        approvalAmount,
        deployer
    )

    await approveERC20(
        networkConfig[network.config.chainId].usdcToken,
        networkConfig[network.config.chainId].swapRouterAddress,
        approvalAmount,
        deployer
    )

    await swapRouterContract
        .exactInputSingle(params, {
            gasLimit: ethers.utils.hexlify(1000000),
        })
        .then((tx) => {
            console.log(tx)
        })
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

async function getPool(deployer, address0, address1) {
    const factoryContract = await ethers.getContractAt(
        "IUniswapV3Factory",
        networkConfig[network.config.chainId].factoryAddress,
        deployer.address
    )
    const poolAddress = await factoryContract.getPool(address0, address1, 3000)
    console.log("poolAddress", poolAddress)
    return poolAddress
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
