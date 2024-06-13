require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",

  networks: {
    zircuit: {
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      url: process.env.ZIRCUIT_PROVIDER_URL,
    },
  },
};
