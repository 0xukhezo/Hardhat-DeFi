const { ethers, getNamedAccounts, network } = require("hardhat")
const { getWeth, AMOUNT } = require("./getWeth.js")
const { networkConfig } = require("../helper-hardhat-config")
const { Token } = require("@uniswap/sdk-core")
const {
    Pool,
    Position,
    TickMath,
    nearestUsableTick,
} = require("@uniswap/v3-sdk")
const { getPoolImmutables } = require("../helpers/helpers")

require("dotenv").config()

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const liquidityPool = await getPool(
        deployer,
        networkConfig[network.config.chainId].usdcToken.address,
        networkConfig[network.config.chainId].wethToken.address
    )

    const poolContract = await ethers.getContractAt(
        "IUniswapV3Pool",
        liquidityPool,
        deployer.address
    )

    const usdcContract = await ethers.getContractAt(
        "IERC20",
        networkConfig[network.config.chainId].usdcToken.address
    )

    const wethContract = await ethers.getContractAt(
        "IERC20",
        networkConfig[network.config.chainId].wethToken.address
    )

    let wethBalance = await wethContract.balanceOf(deployer)
    let usdcBalance = await usdcContract.balanceOf(deployer)

    console.log("USDC balance...", usdcBalance.toString())
    console.log("WETH balance...", wethBalance.toString())

    console.log("Swapping...")

    await swap(AMOUNT, deployer, poolContract)

    wethBalance = await wethContract.balanceOf(deployer)
    usdcBalance = await usdcContract.balanceOf(deployer)

    console.log("USDC balance...", usdcBalance.toString())
    console.log("WETH balance...", wethBalance.toString())

    console.log("Adding liquidity...")

    await addLiquidity(usdcBalance, wethBalance, deployer, poolContract)

    wethBalance = await wethContract.balanceOf(deployer)
    usdcBalance = await usdcContract.balanceOf(deployer)

    console.log("USDC balance...", usdcBalance.toString())
    console.log("WETH balance...", wethBalance.toString())
}

async function swap(inputAmount, deployer, poolContract) {
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
        networkConfig[network.config.chainId].wethToken.address,
        networkConfig[network.config.chainId].swapRouterAddress,
        approvalAmount,
        deployer
    )

    await approveERC20(
        networkConfig[network.config.chainId].usdcToken.address,
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
    console.log("Swaped!")
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

// async function getPoolData(poolContract) {
//     const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
//         poolContract.tickSpacing(),
//         poolContract.fee(),
//         poolContract.liquidity(),
//         poolContract.slot0(),
//     ])

//     return {
//         tickSpacing: tickSpacing,
//         fee: fee,
//         liquidity: liquidity,
//         sqrtPriceX96: slot0[0],
//         tick: slot0[1],
//     }
// }

async function addLiquidity(
    liquidityAmountToken0,
    liquidityAmountToken1,
    deployer,
    poolContract
) {
    const liquidityContract = await ethers.getContractAt(
        "IUniswapV2Router02",
        networkConfig[network.config.chainId].routerLiquidityAddress,
        deployer.address
    )

    await approveERC20(
        networkConfig[network.config.chainId].usdcToken.address,
        networkConfig[network.config.chainId].routerLiquidityAddress,
        liquidityAmountToken0,
        deployer
    )

    await approveERC20(
        networkConfig[network.config.chainId].wethToken.address,
        networkConfig[network.config.chainId].routerLiquidityAddress,
        liquidityAmountToken1,
        deployer
    )

    await liquidityContract
        .addLiquidity(
            networkConfig[network.config.chainId].usdcToken.address,
            networkConfig[network.config.chainId].wethToken.address,
            liquidityAmountToken0.toString(),
            liquidityAmountToken1.toString(),
            1,
            1,
            deployer,
            Math.floor(Date.now() / 1000) + 60 * 10,
            { gasLimit: ethers.utils.hexlify(1000000) }
        )
        .then((tx) => {
            console.log(tx)
        })

    console.log("Liquidity added!")
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
