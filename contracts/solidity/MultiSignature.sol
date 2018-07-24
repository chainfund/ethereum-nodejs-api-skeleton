pragma solidity ^0.4.15;

contract MultiSignature {

    mapping (address => bool) private isOwner;
    uint constant SEQUENCE_ID_WINDOW_SIZE = 10;
    uint[10] recentSequenceIds;
    uint withdrawLimit = 0; // 0 means no limit

    modifier onlyOwner() {
        require(isOwner[msg.sender] == true);
        _;
    }

    function MultiSignature(address[] owners) public {
        if (owners.length != 3) {
            // Invalid number of owners
            revert();
        }
        for (uint i = 0; i < owners.length; i++) {
            isOwner[owners[i]] = true;
        }
    }

    function() public payable {

    }

    function setWithDrawLimit(uint limit) onlyOwner public {
        withdrawLimit = limit;
    }

    function getWithDrawLimit() public view returns(uint) {
        return withdrawLimit;
    }

    function sendMultiSig(
        address toAddress,
        uint value,
        bytes data,
        uint expireTime,
        uint sequenceId,
        bytes signature
    ) onlyOwner external {
        require(withdrawLimit == 0 || value <= withdrawLimit);
        bytes32 operationHash = keccak256("ETHER", toAddress, value, data, expireTime, sequenceId);
        address otherSigner = verifyMultiSig(operationHash, signature, expireTime, sequenceId);
        if (!(toAddress.call.value(value)(data))) {
            revert();
        }
    }

    function verifyMultiSig(
        bytes32 operationHash,
        bytes signature,
        uint expireTime,
        uint sequenceId
    ) onlyOwner private returns (address) {
        address otherSigner = recoverAddressFromSignature(operationHash, signature);
        if (expireTime < block.timestamp) {
            revert();
        }
        tryInsertSequenceId(sequenceId);
        if (!isOwner[otherSigner] || otherSigner == msg.sender) {
            revert();
        }
        return otherSigner;
    }

    function tryInsertSequenceId(uint sequenceId) onlyOwner private {
        uint lowestValueIndex = 0;
        for (uint i = 0; i < SEQUENCE_ID_WINDOW_SIZE; i++) {
            if (recentSequenceIds[i] == sequenceId) {
                revert();
            }
            if (recentSequenceIds[i] < recentSequenceIds[lowestValueIndex]) {
                lowestValueIndex = i;
            }
        }
        if (sequenceId < recentSequenceIds[lowestValueIndex]) {
            revert();
        }
        if (sequenceId > (recentSequenceIds[lowestValueIndex] + 10000)) {
            revert();
        }
        recentSequenceIds[lowestValueIndex] = sequenceId;
    }

    function getNextSequenceId() public view returns (uint) {
        uint highestSequenceId = 0;
        for (uint i = 0; i < SEQUENCE_ID_WINDOW_SIZE; i++) {
            if (recentSequenceIds[i] > highestSequenceId) {
                highestSequenceId = recentSequenceIds[i];
            }
        }
        return highestSequenceId + 1;
    }

    function recoverAddressFromSignature(bytes32 operationHash, bytes signature) internal pure returns (address) {
        if (signature.length != 65) {
            revert();
        }
        // We need to unpack the signature, which is given as an array of 65 bytes (like eth.sign)
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := and(mload(add(signature, 65)), 255)
        }
        if (v < 27) {
            v += 27; // Ethereum versions are 27 or 28 as opposed to 0 or 1 which is submitted by some signing libs
        }
        return ecrecover(operationHash, v, r, s);
    }
}