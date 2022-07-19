import { task } from "hardhat/config";

export default task(
  "block-number",
  "Prints the current block number for your dumb ass"
).setAction(async (taskArgs: any, hre: any) => {
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log(`current block number is ${blockNumber}`);
});
