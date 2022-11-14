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
        networkConfig[network.config.chainId].usdcToken.address,
        networkConfig[network.config.chainId].wethToken.address
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

async function getPoolData(poolContract) {
    const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
        poolContract.tickSpacing(),
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
    ])

    return {
        tickSpacing: tickSpacing,
        fee: fee,
        liquidity: liquidity,
        sqrtPriceX96: slot0[0],
        tick: slot0[1],
    }
}

const { Token, Price } = require("@uniswap/sdk-core")
const {
    Pool,
    Position,
    nearestUsableTick,
    priceToClosestTick,
} = require("@uniswap/v3-sdk")
const {
    abi: IUniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json")
const {
    abi: INonfungiblePositionManagerABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json")
const ERC20ABI = require("../Abis/abiAddLiquidity.json")
const {
    chainId,
    positionManagerAddress,
    poolAddressWethUsdc,
    WALLET_ADDRESS,
    constantUSDC,
    constantWETH,
} = require("../../Constants/Constants")

require("dotenv").config()

const UniToken = new Token(
    chainId,
    constantUSDC.address,
    constantUSDC.decimals,
    constantUSDC.symbol,
    constantUSDC.name
)
const WethToken = new Token(
    chainId,
    constantWETH.address,
    constantWETH.decimals,
    constantWETH.symbol,
    constantWETH.name
)

const nonFungiblePositionManagerContract = new ethers.Contract(
    positionManagerAddress,
    INonfungiblePositionManagerABI,
    signer
)
const poolContract = new ethers.Contract(
    poolAddressWethUsdc,
    IUniswapV3PoolABI,
    signer
)

async function addLiquidity(amountETH, ratio, upTickPrice, lowTickPrice) {
    const poolData = await getPoolData(poolContract)
    const amountIn = amountETH * ratio

    const WETH_UNI_POOL = new Pool(
        WethToken,
        UniToken,
        poolData.fee,
        poolData.sqrtPriceX96.toString(),
        poolData.liquidity.toString(),
        poolData.tick
    )

    const position = new Position({
        pool: WETH_UNI_POOL,
        liquidity: ethers.utils.parseUnits("0.01", 18),
        tickLower:
            nearestUsableTick(poolData.tick, poolData.tickSpacing) -
            poolData.tickSpacing * 2,
        tickUpper:
            nearestUsableTick(poolData.tick, poolData.tickSpacing) +
            poolData.tickSpacing * 2,
    })

    const approvalAmount = ethers.utils.parseUnits("10", 18).toString()
    const tokenContract0 = new ethers.Contract(
        UniToken.address,
        ERC20ABI,
        signer
    )
    await tokenContract0.approve(positionManagerAddress, approvalAmount)
    const tokenContract1 = new ethers.Contract(
        WethToken.address,
        ERC20ABI,
        signer
    )
    await tokenContract1.approve(positionManagerAddress, approvalAmount)

    const { amount0: amount0Desired, amount1: amount1Desired } =
        position.mintAmounts
    // mintAmountsWithSlippage

    const params = {
        token0: constantUSDC.address,
        token1: constantWETH.address,
        fee: poolData.fee,
        tickLower: nearestUsableTick(
            priceToClosestTick(
                new Price(UniToken, WethToken, lowTickPrice, 1)
            ) < 0
                ? priceToClosestTick(
                      new Price(UniToken, WethToken, upTickPrice, 1)
                  )
                : priceToClosestTick(
                      new Price(UniToken, WethToken, lowTickPrice, 1)
                  ),
            poolData.tickSpacing
        ),
        tickUpper: nearestUsableTick(
            priceToClosestTick(new Price(UniToken, WethToken, upTickPrice, 1)) <
                0
                ? priceToClosestTick(
                      new Price(UniToken, WethToken, lowTickPrice, 1)
                  )
                : priceToClosestTick(
                      new Price(UniToken, WethToken, upTickPrice, 1)
                  ),
            poolData.tickSpacing
        ),
        amount0Desired: ethers.utils.parseEther(amountIn.toString()).toString(),
        amount1Desired: ethers.utils
            .parseEther(amountETH.toString())
            .toString(),
        amount0Min: amount0Desired.toString(),
        amount1Min: amount1Desired.toString(),
        recipient: WALLET_ADDRESS,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    }

    await nonFungiblePositionManagerContract
        .mint(params, { gasLimit: ethers.utils.hexlify(1000000) })
        .then((tx) => {
            console.log(tx)
        })
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
