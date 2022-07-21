import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  deployments,
  ethers,
  network,
  // getNamedAccounts,
} from "hardhat";
import { FundMe, MockV3Aggregator } from "../../typechain-types";
import { developmentChains } from "../../helper-hardhat-config";
import chai from "chai";
import { solidity } from "ethereum-waffle";

chai.use(solidity);

const { assert, expect } = chai;
!developmentChains.includes(network.name)
  ? describe("FundMe", async function () {
      let fundMe: FundMe;
      let deployer: SignerWithAddress;
      let mockV3Aggregator: MockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1"); // 1 ETH
      beforeEach(async function () {
        // deploy fund me contract with hardhat deploy
        // how to fetch multiple accounts based on config and network
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        // deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("constructor", function () {
        it("sets the aggregator addresses correctly", async () => {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("Fails if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.reverted;
        });

        it("updated the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getAddressToAmountFunded(
            deployer.address
          );
          assert.equal(response.toString(), sendValue.toString());
        });

        it("Adds funder to array of funders", async () => {
          await fundMe.fund({ value: ethers.utils.parseEther("1") });
          const response = await fundMe.getFunder(0);
          assert.equal(response, deployer.address);
        });
      });

      describe("withdraw", function () {
        // Fund contract before testing withdraw function
        beforeEach(async () => {
          await fundMe.fund({ value: ethers.utils.parseEther("1") });
        });

        it("withdraw ETH from a single founder", async () => {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          );

          // Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          // Using the .add function over the native * operator is needed because
          // the numbers returned are large numbers that javascript doesn't understand
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          );

          // Assert
          assert.equal(endingFundMeBalance.toString(), "0");
          // Using the .add function over the native + operator is needed because
          // the numbers returned are large numbers that javascript doesn't understand
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        it("allows us to withdraw with multiple funders", async () => {
          // Arrange test
          const accounts = await ethers.getSigners();

          for (let i = 1; i < 6; i++) {
            const account = accounts[i];
            const fundMeConnectedContract = await fundMe.connect(account);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          );

          // Act on test
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          // Assert test
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          );

          assert.equal(endingFundMeBalance.toString(), "0");
          // Using the .add function over the native + operator is needed because
          // the numbers returned are large numbers that javascript doesn't understand
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
          // Make sure that the funders are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            const account = accounts[i];
            assert.equal(
              await (
                await fundMe.getAddressToAmountFunded(account.address)
              ).toString(),
              "0"
            );
          }
        });

        it("only allows the owner to withdraw", async () => {
          const accounts: any = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(attackerConnectedContract.withdraw()).to.be.revertedWith(
            "FundMe__NotOwner"
          );
        });

        it("allows us to use cheap withdraw with multiple funders", async () => {
          // Arrange test
          const accounts = await ethers.getSigners();

          for (let i = 1; i < 6; i++) {
            const account = accounts[i];
            const fundMeConnectedContract = await fundMe.connect(account);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          );

          // Act on test
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          // Assert test
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          );

          assert.equal(endingFundMeBalance.toString(), "0");
          // Using the .add function over the native + operator is needed because
          // the numbers returned are large numbers that javascript doesn't understand
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
          // Make sure that the funders are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            const account = accounts[i];
            assert.equal(
              await (
                await fundMe.getAddressToAmountFunded(account.address)
              ).toString(),
              "0"
            );
          }
        });
      });
    })
  : describe.skip;
