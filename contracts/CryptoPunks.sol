// SPDX-License-Identifier: MIT

/**
 *Submitted for verification at Etherscan.io on 2017-07-19
*/

pragma solidity ^0.8.24;
contract CryptoPunksMarket {

    // You can use this hash to verify the image file containing all the punks
    string public imageHash = "ac39af4793119ee46bbff351d8cb6b5f23da60222126add4268e261199a2921b";

    address owner;

    string public standard = 'CryptoPunks';
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    uint public immutable maxSupply;

    uint public nextPunkIndexToAssign = 0;

    bool public allPunksAssigned = false;
    uint public punksRemainingToAssign = 0;

    //mapping (address => uint) public addressToPunkIndex;
    mapping (uint => address) public punkIndexToAddress;

    /* This creates an array with all balances */
    mapping (address => uint256) public balanceOf;

    struct Offer {
        bool isForSale;
        uint punkIndex;
        address seller;
        uint minValue;          // in ether
        address onlySellTo;     // specify to sell only to a specific person
    }

    struct Bid {
        bool hasBid;
        uint punkIndex;
        address bidder;
        uint value;
    }

    // A record of punks that are offered for sale at a specific minimum value, and perhaps to a specific person
    mapping (uint => Offer) public punksOfferedForSale;

    // A record of the highest punk bid
    mapping (uint => Bid) public punkBids;

    mapping (address => uint) public pendingWithdrawals;

    event Assign(address indexed to, uint256 punkIndex);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event PunkTransfer(address indexed from, address indexed to, uint256 punkIndex);
    event PunkOffered(uint indexed punkIndex, uint minValue, address indexed toAddress);
    event PunkBidEntered(uint indexed punkIndex, uint value, address indexed fromAddress);
    event PunkBidWithdrawn(uint indexed punkIndex, uint value, address indexed fromAddress);
    event PunkBought(uint indexed punkIndex, uint value, address indexed fromAddress, address indexed toAddress);
    event PunkNoLongerForSale(uint indexed punkIndex);

    /* Initializes contract with initial supply tokens to the creator of the contract */


    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    modifier receiverIsNotOwner (address to, uint tokenIndex) {
        require(to != punkIndexToAddress[tokenIndex], "Owner is already receiver");
        _;
    }

    // modifier ownerCannotMint (uint punkIndex) {
    //     require(msg.sender != punkIndexToAddress[punkIndex], "Self transaction detected");
    //     _;
    // }

    modifier allPunksHaveBeenMinted () {
        require(allPunksAssigned , "Not all punks have been assigned");
        _;
    }

    modifier notAllPunksMinted () {
        require(!allPunksAssigned, "All punks have been assigned");
        _;
    }

    modifier tokenUpForSale (uint punkIndex){
        require(punksOfferedForSale[punkIndex].isForSale, "Token not listed for sale");
        _;
    }

    modifier maxSupplyNotReached (uint punkIndex) {
        if(punkIndex >= maxSupply){
            allPunksAssigned = true;
        }
        require(punkIndex < maxSupply, "Max supply reached");
        _;
    }

    

    constructor () {
        balanceOf[msg.sender] = maxSupply;
        owner = msg.sender;
        totalSupply = 1;
        maxSupply = 100000;
        punksRemainingToAssign = totalSupply;
        name = "CRYPTOPUNKS";
        symbol = "C";
        decimals = 0;
    }

    function setInitialOwner(address to, uint punkIndex) public {

        if(punkIndexToAddress[punkIndex] != address(0)){
            balanceOf[punkIndexToAddress[punkIndex]] --;
        }

        else{
            punksRemainingToAssign --;
        }
        
        punkIndexToAddress[punkIndex] = to;
        balanceOf[to]++;
        totalSupply + 1;

        emit Assign(to, punkIndex);
        
    }

    function setInitialOwners(address[] memory addresses, uint[] memory indices) external {
        uint n = addresses.length;
        
        for (uint i = 0; i < n; i++) {  
            setInitialOwner(addresses[i], indices[i]);
        }
    }

    function allInitialOwnersAssigned() external onlyOwner() {
        allPunksAssigned = true;
    }

    function getPunk(uint punkIndex) external notAllPunksMinted(){
        require(punksRemainingToAssign >= 0, "No punk left to assign");

        punkIndexToAddress[punkIndex] = msg.sender;
        balanceOf[msg.sender] ++;
        punksRemainingToAssign --;
        emit Assign(msg.sender, punkIndex);

    }

    // Transfer ownership of a punk to another user without requiring payment
    function transferPunk(address to, uint punkIndex) public tokenUpForSale(punkIndex) {
        require(msg.sender == punkIndexToAddress[punkIndex], "Sender not token owner");
                
        emit PunkNoLongerForSale(punkIndex);
        punkIndexToAddress[punkIndex] = to;
        balanceOf[msg.sender]--;
        balanceOf[to]++;

        emit Transfer(msg.sender, to, 1);
        emit PunkTransfer(msg.sender, to, punkIndex);
        
        // Check for the case where there is a bid from the new owner and refund it.
        // Any other bid can stay in place.

        Bid memory bid = punkBids[punkIndex];

        if (bid.bidder == to) {
            // Kill bid and refund value
            pendingWithdrawals[to] += bid.value;
            punkBids[punkIndex] = Bid(false, punkIndex, address(0), 0);
        }
        
    }

    function punkNoLongerForSale(uint punkIndex) external allPunksHaveBeenMinted() {
        require((punkIndexToAddress[punkIndex] == msg.sender), "Not authorized");
        
        require(punkIndex < maxSupply, "Max supply reached");
        
        punksOfferedForSale[punkIndex] = Offer(false, punkIndex, msg.sender, 0, address(0));

        emit PunkNoLongerForSale(punkIndex);
    }

    function offerPunkForSale(uint punkIndex, uint minSalePriceInWei) external allPunksHaveBeenMinted() {
        require(msg.sender == punkIndexToAddress[punkIndex], "Not authorized");
        
        punksOfferedForSale[punkIndex] = Offer(true, punkIndex, msg.sender, minSalePriceInWei, address(0));

        emit PunkOffered(punkIndex, minSalePriceInWei, address(0));
    }

    function offerPunkForSaleToAddress(uint punkIndex, uint minSalePriceInWei, address toAddress) external allPunksHaveBeenMinted() {
        require(msg.sender == punkIndexToAddress[punkIndex], "Not authorized");

        punksOfferedForSale[punkIndex] = Offer(true, punkIndex, msg.sender, minSalePriceInWei, toAddress);
        emit PunkOffered(punkIndex, minSalePriceInWei, toAddress);
    }

    function buyPunk(uint punkIndex) external payable allPunksHaveBeenMinted() tokenUpForSale(punkIndex) {
        require(punkIndex < maxSupply);

        Offer memory offer = punksOfferedForSale[punkIndex];
        
        require(offer.onlySellTo == address(0) || offer.onlySellTo == msg.sender, "Not sellable to public");
        
        require(msg.value >= offer.minValue, "Not enough  eth sent"); // Didn't send enough ETH

        
        require(offer.seller == punkIndexToAddress[punkIndex], "Seller is no longer owner"); // Seller no longer owner of punk

        address seller = offer.seller;

        punkIndexToAddress[punkIndex] = msg.sender;
        balanceOf[seller]--;
        balanceOf[msg.sender]++;
        emit Transfer(seller, msg.sender, 1);

        emit PunkNoLongerForSale(punkIndex);
        pendingWithdrawals[seller] += msg.value;
        emit PunkBought(punkIndex, msg.value, seller, msg.sender);

        // Check for the case where there is a bid from the new owner and refund it.
        // Any other bid can stay in place.
        Bid memory bid = punkBids[punkIndex];
        if (bid.bidder == msg.sender) {
            // Kill bid and refund value
            pendingWithdrawals[msg.sender] += bid.value;
            punkBids[punkIndex] = Bid(false, punkIndex, address(0), 0);
        }
    }

    function withdraw() public allPunksHaveBeenMinted() {
        uint amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawal");
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function enterBidForPunk(uint punkIndex) external payable allPunksHaveBeenMinted() {
        require(punkIndex < maxSupply, "Max supply reached");
             
        require(punkIndexToAddress[punkIndex] != address(0), "Dead wallet");
        require(msg.value > 0, "Bid amount too low");
        Bid memory existing = punkBids[punkIndex];
        
        require(msg.value >= existing.value, "Must be above previouse bid");
        if (existing.value > 0) {
            // Refund the failing bid
            pendingWithdrawals[existing.bidder] += existing.value;
        }
        punkBids[punkIndex] = Bid(true, punkIndex, msg.sender, msg.value);
        
        emit PunkBidEntered(punkIndex, msg.value, msg.sender);
    }

    function acceptBidForPunk(uint punkIndex, uint minPrice) external allPunksHaveBeenMinted() maxSupplyNotReached(punkIndex){
        require(punkIndexToAddress[punkIndex] == msg.sender, "Not authorized");
        address seller = msg.sender;
        Bid memory bid = punkBids[punkIndex];

        require(bid.value > 0, "bid amount too low");
        require(bid.value > minPrice, "Bid amount below minimum");
        
        punkIndexToAddress[punkIndex] = bid.bidder;
        balanceOf[seller]--;
        balanceOf[bid.bidder]++;
        emit Transfer(seller, bid.bidder, 1);

        punksOfferedForSale[punkIndex] = Offer(false, punkIndex, bid.bidder, 0, address(0));
        uint amount = bid.value;
        punkBids[punkIndex] = Bid(false, punkIndex, address(0), 0);
        pendingWithdrawals[seller] += amount;
        emit PunkBought(punkIndex, bid.value, seller, bid.bidder);
    }

    function withdrawBidForPunk(uint punkIndex) external maxSupplyNotReached(punkIndex) allPunksHaveBeenMinted() {

        require(punkIndexToAddress[punkIndex] != msg.sender, "invalid sender");

        Bid memory bid = punkBids[punkIndex];

        emit PunkBidWithdrawn(punkIndex, bid.value, msg.sender);
        uint amount = bid.value;
        punkBids[punkIndex] = Bid(false, punkIndex, address(0), 0);
        // Refund the bid money
        payable(msg.sender).transfer(amount);

    }

    function SetNewOwner(address _newOwner) external onlyOwner(){
        _setOwner(_newOwner);
    }

    function _setOwner(address newOwner) internal {
        owner = newOwner;
    }

    function _owner() external view returns(address) {
        return owner;
    }

}