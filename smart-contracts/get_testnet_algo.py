import requests
import json

def get_testnet_algo(address):
    """Get testnet ALGO from the official faucet"""
    url = "https://testnet-api.algonode.cloud/v2/transactions"
    
    # This is a simple script to get testnet ALGO
    # You can also use the official faucet at https://testnet.algoexplorer.io/dispenser
    
    print(f"To get testnet ALGO for address: {address}")
    print("Visit: https://testnet.algoexplorer.io/dispenser")
    print("Enter your address and request ALGO tokens")
    print("Or use the Pera Wallet testnet faucet feature")

def main():
    # Example addresses from previous runs
    addresses = [
        "XPU2GNJJ3CT3I6U2QN5VP3ZPH4GHWYSDJI6TMFLGEMI3JP6BIZXY4SF5S4",
        "L557EMXQXXWHK3MUCQ5ZVPZLYCHGBAQYROM5ZANBRYO23FRF6ZXGAHTAGU"
    ]
    
    print("=== ALGORAND TESTNET FAUCET ===")
    print("Get free testnet ALGO tokens from these sources:")
    print()
    
    for i, address in enumerate(addresses, 1):
        print(f"Address {i}: {address}")
        get_testnet_algo(address)
        print()
    
    print("Alternative methods:")
    print("1. Pera Wallet: Open wallet -> Settings -> Developer Settings -> Testnet")
    print("2. AlgoExplorer Faucet: https://testnet.algoexplorer.io/dispenser")
    print("3. Algorand Faucet: https://bank.testnet.algorand.network/")

if __name__ == "__main__":
    main()
