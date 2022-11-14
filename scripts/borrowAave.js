const { ethers, getNamedAccounts, network } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth.js")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const lendingPool = await getLendingPool(deployer)
    const wethTokenAddress = networkConfig[network.config.chainId].wethToken
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing WETH...")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Desposited!")
    // Getting your borrowing stats
    let { availableBorrowsETH } = await getBorrowUserData(lendingPool, deployer)
    const usdcPrice = await getUsdcPrice()
    const amountUsdcToBorrow =
        availableBorrowsETH.toString() * 0.95 * (1 / usdcPrice.toNumber())
    const amountUsdcToBorrowWei = ethers.utils.parseEther(
        amountUsdcToBorrow.toString()
    )
    console.log(`You can borrow ${amountUsdcToBorrow.toString()} USDC`)
    await borrowUsdc(
        networkConfig[network.config.chainId].usdcToken,
        lendingPool,
        amountUsdcToBorrowWei,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
    await repay(
        amountUsdcToBorrowWei,
        networkConfig[network.config.chainId].usdcToken,
        lendingPool,
        deployer
    )
    await getBorrowUserData(lendingPool, deployer)
}

async function repay(amount, usdcAddress, lendingPool, account) {
    await approveErc20(usdcAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(usdcAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowUsdc(
    usdcAddress,
    lendingPool,
    amountUsdcToBorrow,
    account
) {
    const borrowTx = await lendingPool.borrow(
        usdcAddress,
        amountUsdcToBorrow,
        1,
        0,
        account
    )
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

async function getUsdcPrice() {
    const usdcEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config.chainId].usdcEthPriceFeed
    )
    const price = (await usdcEthPriceFeed.latestRoundData())[1]
    console.log(`The USDC/ETH price is ${price.toString()}`)
    return price
}

async function approveErc20(erc20Address, spenderAddress, amount, signer) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        signer.address
    )
    txResponse = await erc20Token.approve(spenderAddress, amount)
    await txResponse.wait(1)
    console.log("Approved!")
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        account.address
    )
    const lendingPoolAddress =
        await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account.address
    )
    return lendingPool
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return { availableBorrowsETH, totalDebtETH }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
