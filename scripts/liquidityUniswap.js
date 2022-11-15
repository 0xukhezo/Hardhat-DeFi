const { ethers, getNamedAccounts, network } = require("hardhat")
const { getWeth, AMOUNT } = require("./getWeth.js")
const { networkConfig } = require("../helper-hardhat-config")
const { getPoolImmutables } = require("../helpers/helpers")

require("dotenv").config()

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()

    const usdcContract = await ethers.getContractAt(
        "IERC20",
        networkConfig[network.config.chainId].usdcToken.address
    )

    const wethContract = await ethers.getContractAt(
        "IERC20",
        networkConfig[network.config.chainId].wethToken.address
    )

    const uniContract = await ethers.getContractAt(
        "IERC20",
        networkConfig[network.config.chainId].uniToken.address
    )

    let wethBalance = await wethContract.balanceOf(deployer)
    let usdcBalance = await usdcContract.balanceOf(deployer)
    let uniBalance = await uniContract.balanceOf(deployer)

    console.log(
        "WETH balance...",
        ethers.utils.formatUnits(
            wethBalance.toString(),
            networkConfig[network.config.chainId].wethToken.decimals
        )
    )
    console.log(
        "USDC balance...",
        ethers.utils.formatUnits(
            usdcBalance.toString(),
            networkConfig[network.config.chainId].usdcToken.decimals
        )
    )
    console.log(
        "UNI balance...",
        ethers.utils.formatUnits(
            uniBalance.toString(),
            networkConfig[network.config.chainId].uniToken.decimals
        )
    )

    console.log("Swapping...")

    await swap(
        AMOUNT,
        deployer,
        networkConfig[network.config.chainId].wethToken.address,
        networkConfig[network.config.chainId].usdcToken.address
    )

    wethBalance = await wethContract.balanceOf(deployer)
    usdcBalance = await usdcContract.balanceOf(deployer)
    uniBalance = await uniContract.balanceOf(deployer)

    console.log(
        "WETH balance...",
        ethers.utils.formatUnits(
            wethBalance.toString(),
            networkConfig[network.config.chainId].wethToken.decimals
        )
    )
    console.log(
        "USDC balance...",
        ethers.utils.formatUnits(
            usdcBalance.toString(),
            networkConfig[network.config.chainId].usdcToken.decimals
        )
    )
    console.log(
        "UNI balance...",
        ethers.utils.formatUnits(
            uniBalance.toString(),
            networkConfig[network.config.chainId].uniToken.decimals
        )
    )

    await swap(
        usdcBalance,
        deployer,
        networkConfig[network.config.chainId].usdcToken.address,
        networkConfig[network.config.chainId].uniToken.address
    )

    wethBalance = await wethContract.balanceOf(deployer)
    usdcBalance = await usdcContract.balanceOf(deployer)
    uniBalance = await uniContract.balanceOf(deployer)

    console.log(
        "WETH balance...",
        ethers.utils.formatUnits(
            wethBalance.toString(),
            networkConfig[network.config.chainId].wethToken.decimals
        )
    )
    console.log(
        "USDC balance...",
        ethers.utils.formatUnits(
            usdcBalance.toString(),
            networkConfig[network.config.chainId].usdcToken.decimals
        )
    )
    console.log(
        "UNI balance...",
        ethers.utils.formatUnits(
            uniBalance.toString(),
            networkConfig[network.config.chainId].uniToken.decimals
        )
    )

    console.log("Adding liquidity...")

    await addLiquidity(
        usdcBalance,
        uniBalance,
        deployer,
        networkConfig[network.config.chainId].usdcToken.address,
        networkConfig[network.config.chainId].uniToken.address
    )

    wethBalance = await wethContract.balanceOf(deployer)
    usdcBalance = await usdcContract.balanceOf(deployer)
    uniBalance = await uniContract.balanceOf(deployer)

    console.log(
        "WETH balance...",
        ethers.utils.formatUnits(
            wethBalance.toString(),
            networkConfig[network.config.chainId].wethToken.decimals
        )
    )
    console.log(
        "USDC balance...",
        ethers.utils.formatUnits(
            usdcBalance.toString(),
            networkConfig[network.config.chainId].usdcToken.decimals
        )
    )
    console.log(
        "UNI balance...",
        ethers.utils.formatUnits(
            uniBalance.toString(),
            networkConfig[network.config.chainId].uniToken.decimals
        )
    )
}

async function swap(inputAmount, deployer, addressToken0, addressToken1) {
    const liquidityPool = await getPool(deployer, addressToken0, addressToken1)

    const poolContract = await ethers.getContractAt(
        "IUniswapV3Pool",
        liquidityPool,
        deployer.address
    )

    const immutables = await getPoolImmutables(poolContract)

    const swapRouterContract = await ethers.getContractAt(
        "ISwapRouter",
        networkConfig[network.config.chainId].swapRouterAddress,
        deployer.address
    )

    let approvalAmount = (inputAmount / 2).toString()
    if (
        addressToken0 ===
        networkConfig[network.config.chainId].wethToken.address
    ) {
        approvalAmount = inputAmount.toString()
    }

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
        addressToken0,
        networkConfig[network.config.chainId].swapRouterAddress,
        approvalAmount,
        deployer
    )

    await approveERC20(
        addressToken1,
        networkConfig[network.config.chainId].swapRouterAddress,
        approvalAmount,
        deployer
    )
    let response

    await swapRouterContract
        .exactInputSingle(params, {
            gasLimit: ethers.utils.hexlify(1000000),
        })
        .then((tx) => {
            response = tx
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
    addressToken0,
    addressToken1
) {
    const liquidityContract = await ethers.getContractAt(
        "IUniswapV2Router02",
        networkConfig[network.config.chainId].routerLiquidityAddress,
        deployer.address
    )

    await approveERC20(
        addressToken0,
        networkConfig[network.config.chainId].routerLiquidityAddress,
        liquidityAmountToken0,
        deployer
    )

    await approveERC20(
        addressToken1,
        networkConfig[network.config.chainId].routerLiquidityAddress,
        liquidityAmountToken1,
        deployer
    )

    let response

    await liquidityContract
        .addLiquidity(
            addressToken0,
            addressToken1,
            liquidityAmountToken0.toString(),
            liquidityAmountToken1.toString(),
            1,
            1,
            deployer,
            Math.floor(Date.now() / 1000) + 60 * 10,
            { gasLimit: ethers.utils.hexlify(1000000) }
        )
        .then((tx) => {
            response = tx
        })

    console.log("Liquidity added!")
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
