const { ethers } = require("ethers")
const {
    abi: IUniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json")
const {
    abi: SwapRouterABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json")
const { getPoolImmutables } = require("../Helpers/helpers")
const {
    constantWETH,
    constantUSDC,
    poolAddressWethUsdc,
    WALLET_ADDRESS,
    swapRouterAddress,
    EthInUsdc,
} = require("../../Constants/Constants")
const aggregatorV3InterfaceABI = require("../Abis/abiAggregatorV3Interface.json")

const ERC20ABI = require("../Abis/abiSwap.json")

require("dotenv").config()

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

async function swapETH(inputAmount, type, ratio) {
    const poolContract = new ethers.Contract(
        poolAddressWethUsdc,
        IUniswapV3PoolABI,
        signer
    )

    const immutables = await getPoolImmutables(poolContract)

    const swapRouterContract = new ethers.Contract(
        swapRouterAddress,
        SwapRouterABI,
        signer
    )

    let params

    const amountIn = ethers.utils.parseUnits(inputAmount.toString(), "ether")

    if (type === 0) {
        console.log("uni por weth")

        const priceFeed = new ethers.Contract(
            EthInUsdc,
            aggregatorV3InterfaceABI,
            provider
        )

        let ethUsdc

        await priceFeed.latestRoundData().then((roundData) => {
            ethUsdc = roundData.answer.toString() / 100000000
        })

        const balanceToSwapETH = inputAmount + 0.055
        const unisToSwap = (ratio * balanceToSwapETH).toFixed(18)

        params = {
            tokenIn: immutables.token0,
            tokenOut: immutables.token1,
            fee: immutables.fee,
            recipient: WALLET_ADDRESS,
            deadline: Math.floor(Date.now() / 1000) + 60 * 10,
            amountIn: ethers.utils.parseUnits(
                unisToSwap.toString(),
                constantUSDC.decimals
            ),
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0,
        }
    } else {
        console.log("weth por uni")

        params = {
            tokenIn: immutables.token1,
            tokenOut: immutables.token0,
            fee: immutables.fee,
            recipient: WALLET_ADDRESS,
            deadline: Math.floor(Date.now() / 1000) + 60 * 10,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0,
        }
    }

    const approvalAmount = (amountIn * 10000).toString()

    const tokenContract0 = new ethers.Contract(
        constantWETH.address,
        ERC20ABI,
        signer
    )
    const approvalResponse0 = await tokenContract0.approve(
        swapRouterAddress,
        approvalAmount
    )
    const tokenContract1 = new ethers.Contract(
        constantUSDC.address,
        ERC20ABI,
        signer
    )
    const approvalResponse1 = await tokenContract1.approve(
        swapRouterAddress,
        approvalAmount
    )

    let response

    await swapRouterContract
        .exactInputSingle(params, {
            gasLimit: ethers.utils.hexlify(1000000),
        })
        .then((transaction) => {
            response = transaction
        })

    return response
}

export default swapETH
