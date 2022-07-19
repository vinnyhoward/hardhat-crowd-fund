import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { FundMe } from "../../typechain-types";
import { developmentChains } from "../../helper-hardhat-config";
import { assert, expect } from "chai";

describe("FundMe", async function () {
  let fundMe: FundMe;
  let deployer: SignerWithAddress;
  let mockV3Aggregator: any;

  beforeEach(async function () {
    // deploy fund me contract with hardhat deploy
    if (!developmentChains.includes(network.name)) {
      throw "You need to be on a development chain to run tests";
    }
    // how to fetch multiple accounts based on config and network
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    // deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    fundMe = await ethers.getContract("FundMe", deployer);
    mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });

  describe("constructor", function () {
    it("sets the aggregator addresses correctly", async () => {
      const response = await fundMe.priceFeed();
      assert.equal(response, mockV3Aggregator.address);
    });
  });
});