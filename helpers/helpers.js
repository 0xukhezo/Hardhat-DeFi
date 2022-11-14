exports.getPoolImmutables = async (poolContract) => {
    console.log(poolContract)
    const token0 = await poolContract.token0()
    console.log(token0)
    const [token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
    ])

    const immutables = {
        token0: token0,
        token1: token1,
        fee: fee,
    }

    return immutables
}
